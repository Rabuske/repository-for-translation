import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import Octokit = require("@octokit/rest");
import Webhooks = require('@octokit/webhooks')

// Dot env provide our environment variables
require('dotenv').config()

interface File{
    file_name: string;
    file_sha: string;
}

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

    public async getUrlOfAllPropertiesFiles():Promise<File[]>{
        return this.octokit.git.getTree({tree_sha: this.treeSha, owner : this.owner, repo: this.repo, recursive: '1'}).then(
            response => {
                return response.data.tree.map((tree) => ({ file_name: tree.path, file_sha: tree.sha})).filter((file) => file.file_name.endsWith(".properties"));
            }
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
    context.bindings.outputSbQueue = [];

    files.forEach(file => {
        let message = {
            body: {
                file_name: file.file_name,
                repo: webhookPushPayload.repository.name,
                owner: webhookPushPayload.repository.owner.login,
                last_commit: webhookPushPayload.after,
                file_sha: file.file_sha
            }
        }
        context.bindings.outputSbQueue.push(message);
    });

    context.res = { body: "Success"};
};

export default httpTrigger;
