const ipc = require('node-ipc').default;

ipc.config.id   = 'hello';
ipc.config.retry= 1500;
ipc.config.silent = true;
ipc.connectTo(
    'world',
    function(){
        ipc.of.world.on(
            'connect',
            function(){
                console.log('## connected to world ##');
                ipc.of.world.emit(
                    'socketName',  //any event or socketName type your server listens for
                    'hello'
                )
            }
        );
        ipc.of.world.on(
            'disconnect',
            function(){
                ipc.log('disconnected from world'.notice);
            }
        );
        ipc.of.world.on(
            'socketName',  //any event or socketName type your server listens for
            function(data){
                console.log('got a message from world : ', data);
            }
        );
    }
);