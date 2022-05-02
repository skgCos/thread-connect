import {ThreadConnect, EnvironmentType} from "../../../dist/thread-connect";

console.log("Worker: hi from worker");
const callbacks = new Array<CallableFunction>();
let i = 0;
function addListener(cb: CallableFunction, randomString: string) {
    callbacks.push(cb);
    setInterval(async () => {
        console.log("\n\n\n\n");
        try {
            for(const currCallback of callbacks) {
                console.log("Worker: Calling something");
                await currCallback("Worker: here's something " + i++);
            }
            if(callbacks.length == 0) {
                console.log("Worker: There was nothing to call");
            } 
        } catch(e) {
            console.log("WHATS WRONG!!!!", e);
        }
    }, 4000);
}

function removeListener(cb: CallableFunction, randomString: string) {
    console.log("This is the stuff in the array");

    for(let i = 0; i < callbacks.length; i++) {
        if(cb == callbacks[i]) {
            console.log("Worker: Removed a listener");
            callbacks.splice(i, 1);
            return;
        }
    }
    console.log("Worker: There was nothing to remove");
}

const exposedFunctions = {
    addListener,
    removeListener
}

const threadTest = new ThreadConnect<typeof import("./main").exposedFunctions>(
    {
        typeOfEnviroment: EnvironmentType.NODE,
    },
    exposedFunctions
)

export {
    exposedFunctions
}
 