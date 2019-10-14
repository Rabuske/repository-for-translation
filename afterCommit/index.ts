import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import Octokit = require("@octokit/rest");
import Webhooks = require('@octokit/webhooks')
import { ServiceBusClient, SendableMessageInfo } from "@azure/service-bus";

// Dot env provide our environment variables
require('dotenv').config()

class PropertiesFilesFinder{
    private octokit: Octokit;
    private context: Context;
    private owner: string;
    private repo: string;
    private treeSha: string;

    constructor(context:Context, owner:string, repo: string, treeSha:string){
        this.octokit = new Octokit();
        this.context = context;
        this.owner = owner;
        this.repo = repo;
        this.treeSha = treeSha;
    }

    public async getUrlOfAllPropertiesFiles():Promise<string[]>{
        return this.octokit.git.getTree({tree_sha: this.treeSha, owner : this.owner, repo: this.repo, recursive: '1'}).then(
            response => response.data.tree.map((tree) => (tree.path)).filter((path) => path.endsWith(".properties"))            
        ).catch(
            reason => { 
                this.context.log(reason)
                return [];
            }            
        );
    }
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');

    let webhookPushPayload = <Webhooks.WebhookPayloadPush> req.body;
    
    // Get the list of properties files from GitHub
    const propertiesFilesFinder = new PropertiesFilesFinder(context, webhookPushPayload.repository.owner.login, webhookPushPayload.repository.name, webhookPushPayload.after); 
    let files = await propertiesFilesFinder.getUrlOfAllPropertiesFiles();
    
    // Publish a message for each file
    const sbClient = ServiceBusClient.createFromConnectionString(process.env.SERV_BUS_CONN_STRING);
    const queueClient = sbClient.createQueueClient(process.env.QUEUE_NAME);
    const sender = queueClient.createSender();

    files.forEach(file => {
        const message: SendableMessageInfo = {
            body: {
                fileName: file,
                repository: webhookPushPayload.repository.name,
                owner: webhookPushPayload.repository.owner.login
            }
        }
        sender.send(message);
    });
    sender.close();

    context.res = { body: "Success"};
};

export default httpTrigger;
