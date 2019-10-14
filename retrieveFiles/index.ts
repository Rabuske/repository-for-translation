import { AzureFunction, Context } from "@azure/functions"
import Octokit = require("@octokit/rest");

const serviceBusQueueTrigger: AzureFunction = async function(context: Context, mySbMsg: any): Promise<void> {
    context.log('ServiceBus queue trigger function processed message', mySbMsg);

    const octokit = new Octokit();
    await octokit.git.getBlob({
        owner: mySbMsg.body.owner,
        repo: mySbMsg.body.repo,
        file_sha: mySbMsg.body.file_sha
    }).then(response => {
        context.log(response.data);
        context.bindings.outputBlob = response.data;
    }).catch(reason => context.log(reason));
};

export default serviceBusQueueTrigger;