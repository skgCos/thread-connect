import {ThreadConnect, EnvironmentType} from "../../../dist/thread-connect";

function a(thisIsBuffer: Buffer) {
    console.log("Main: this actually worked what?", thisIsBuffer);
}

const exposedFunctions = {
    a
}

const threadTest = new ThreadConnect<typeof import("./worker").exposedFunctions>(
    {
        typeOfEnviroment: EnvironmentType.NODE,
        workerPath: "./test/node/worker"
    },
    exposedFunctions
)

async function wait() {
    console.log("Main: I'm waiting");
    await threadTest.waitUntilReady();
    console.log("Main: i'm done waiting", threadTest.remote);
}

wait();

export {
    exposedFunctions
}

function thisIsCallback(a: string) {
    console.log("Main: callback was called with argument", a);
    return 2;
}


class TestClass {
    constructor() {
        const self = this;
        (async () => {
            setTimeout(async ()=> {
                console.log("Main process: calling b with argument")
                console.log("Main: type of function:", typeof thisIsCallback)
                threadTest.remote.addListener(self.someCallback, "randomStringHere");
            }, 4000);
        })()

        setTimeout(async () => {
            console.log("================> Main process: asking to stop");
            threadTest.remote.removeListener(self.someCallback, "another random string");
        }, 10000);
    }

    someCallback(a: string) {
        console.log("MAIN: callback in class: " + a);
    }
}

function test1() {
    let tc: TestClass | null = new TestClass();
    setTimeout(() => {
        console.log("Delete Test Class");
        tc = null;
    }, 5000);
}

test1();

