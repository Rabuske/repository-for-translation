import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import Octokit = require("@octokit/rest");
import Webhooks = require('@octokit/webhooks')

class PropertiesFinder{
    private octokit: Octokit;
    private owner: string;
    private repo: string;
    private treeSha: string;

    constructor(owner:string, repo: string, treeSha:string){
        this.octokit = new Octokit();
        this.owner = owner;
        this.repo = repo;
        this.treeSha = treeSha;
    }

    public async getUrlOfAllPropertiesFiles():Promise<string[]>{
        let response = await this.octokit.git.getTree({tree_sha: this.treeSha, owner : this.owner, repo: this.repo});
        let files = response.data.tree.map((tree) => (tree.path)).filter((path) => path.endsWith(".properties")); 
        return Promise.resolve(files);
    }
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');

    let webhookPushPayload = <Webhooks.WebhookPayloadPush> req.body;
    
    // In case the push did not happen on master, ignore the event
    if(!webhookPushPayload.ref.includes("master")) {
        const nothingHappened = 'Push did not occur on master'; 
        context.log(nothingHappened)
        context.res = { body: nothingHappened };                
    } else{
        const propertiesFinder = new PropertiesFinder( webhookPushPayload.repository.owner.login, webhookPushPayload.repository.name, webhookPushPayload.after); 
        context.res = { body : propertiesFinder.getUrlOfAllPropertiesFiles() };
    }
};

export default httpTrigger;
