declare enum EnvironmentType {
    NODE = 0,
    NODE_PROCESS = 1,
    ELECTRON_PRELOAD_MAIN = 2,
    ELECTRON_PRELOAD_RENDER = 3,
    BROWSER = 4
}
interface ThreadConnectOptions {
    workerPath?: string;
    typeOfEnviroment: EnvironmentType;
    electronWindow?: any;
}
interface FunctionDescription {
    name: string;
    numberOfParameters: number;
}
declare class ThreadConnect<Type> {
    remote: Type;
    private istanceIsReady;
    private wrapperInstance;
    private exportedFunctions;
    private readyPromise;
    private getFunctionsToExport;
    private msgHandler;
    private callRemoteCallback;
    private errorHandler;
    private addRemoteFunction;
    private handleFunctionCallToRemote;
    waitUntilReady(): Promise<void | undefined>;
    constructor(options: ThreadConnectOptions, exportedFunctions: any);
    sendFunctionsToParent(fnsToExport: Array<FunctionDescription>): void;
    appendErrorListener(cb: CallableFunction): void;
}

export { EnvironmentType, ThreadConnect, ThreadConnectOptions };
