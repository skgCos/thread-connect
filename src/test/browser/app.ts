import { ThreadConnect, EnvironmentType } from "../../../dist/thread-connect";
console.log("Test2!"); 

function fnToExpose(string: string) {
    console.log("a!!!!!!!!!!!!!!!!!"); 
}
 
const exposedFunctions = {
    fnToExpose
}

const thread1 = new ThreadConnect<typeof import("./testWorker.js").threadExports>({
    typeOfEnviroment: EnvironmentType.BROWSER,
    workerPath: "./testWorker.js"
    }, 
    exposedFunctions,
)

export {
    exposedFunctions
} 


setTimeout(async () => {
    const time1 = window.performance.now();
    try {
        const a = await thread1.remote.somethingToExpose(1,2, "Lets see if this passes through");
        console.log("Result is", a);
    } catch(e) {
        console.log("ERROR was carried over", e);
    }

    const time2 = window.performance.now();
    console.log(time2 - time1);
}, 2000); 
