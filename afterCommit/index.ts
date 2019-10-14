import { AzureFunction, Context, HttpRequest } from "@azure/functions"

function isMasterBranch(branchReference:string): boolean {
    return branchReference.includes("master");
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    
    // In case the push did not happen on master, ignore the trigger
    if(!isMasterBranch(req.body.ref)) {
        const nothingHappened = 'Push did not occur on master, nothing has been done'; 
        context.log(nothingHappened)
        context.res = {
            body: nothingHappened
        };                
    } else{
        
    }

    const branchReference:string = req.body.ref;
    if(branchReference.indexOf("master"))

};

export default httpTrigger;
