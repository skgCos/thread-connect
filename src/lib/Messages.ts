type SupportedMessageBodies = ExposeFunctionBody |
CallRemoteFunctionRequestBody |
CallRemoteFunctionResponseBody |
ReadyBody;

const SIGNATURE = "THREAD_CONNECT_MESSAGE_1";

/**
 * General message definition
 */
 abstract class ProtoMessage {
    abstract type: string; // Name of the message
    
    abstract body: SupportedMessageBodies;
    
    constructor() {
        // Weird initialization fix
        (()=> {
            this.body = {} as SupportedMessageBodies;
        })();
    }
    
    fromComponents(type: string, body: any): void {
        this.type = type;
        this.body = body;
    }

    serialize(): string {
        return SIGNATURE + JSON.stringify({
            type: this.type,
            body: this.body
        });
    }
}

function verifyMagicNumber(msg: string): string | null {
    if(msg.startsWith(SIGNATURE)) {
        return msg.replace(SIGNATURE, "");
    } 
    return null;
}

interface GeneralProtoMessage {
    type: string;
    body: any;
}

/**
 * Expose Function 
 */
interface FunctionDescription {
    name: string;
    numberOfParameters: number;
}

interface ExposeFunctionBody {
    functionData: Array<FunctionDescription>;
}

class ExposeFunction extends ProtoMessage {
    type: string = "ExposeFunction";
    body: ExposeFunctionBody;
    
    constructor(functionData?: Array<FunctionDescription>) {
        super();

        this.body.functionData = functionData ?? new Array<FunctionDescription>();
    }
}

/**
 * Call Remote Function Request 
 */

interface RemoteCallback {
    argumentIndex: number,
    callbackID: string
}

interface CallRemoteFunctionRequestBody {
    requestID: string;
    calleeName: string;
    parameters: Array<any>;
    callbacks: Array<RemoteCallback>;
    isRemoteCallback: boolean; // This is only used if this packet is calling a callback on the other instance
}

class CallRemoteFunctionRequest extends ProtoMessage {
    type: string = "CallRemoteFunctionRequest";
    body: CallRemoteFunctionRequestBody;
    
    constructor(requestID?: string, calleeName?: string, parameters?: Array<any>, callbacks?: Array<RemoteCallback>, isRemoteCallback?: boolean) {
        super();
        this.body.requestID = requestID ?? "";
        this.body.calleeName = calleeName ?? "";
        this.body.parameters = parameters ?? new Array<any>();
        this.body.callbacks = callbacks ?? new Array<RemoteCallback>();
        this.body.isRemoteCallback = isRemoteCallback ?? false;
    }
}

/**
 * Call Remote Function Response 
 */
 interface CallRemoteFunctionResponseBody {
    requestID: string;
    returnValue: any;
    error: any | null; 
}

class CallRemoteFunctionResponse extends ProtoMessage {
    type: string = "CallRemoteFunctionResponse";
    body: CallRemoteFunctionResponseBody;
    
    constructor(requestID?: string, returnValue?: any, error?: any) {
        super();
        this.body.requestID = requestID ?? "";
        this.body.returnValue = returnValue ?? {};
        this.body.error = error ?? null;
    }
}

/**
 * Ready 
 */
 interface ReadyBody {
}

class Ready extends ProtoMessage {
    type: string = "Ready";
    body: ReadyBody;
    
    constructor() {
        super();
    }
}

export {
    ExposeFunction,
    CallRemoteFunctionRequest,
    CallRemoteFunctionResponse,
    Ready,
    
    GeneralProtoMessage,
    verifyMagicNumber,
    RemoteCallback
}