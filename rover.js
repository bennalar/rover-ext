/* Extension for the Dawn Robotics' rover robot */
/* Phil Bennett <philipbennett28@gmail.com>, Jun 2015 */

new (function() {
    var ext = this;
     
    var serverStatus = 0;
    var ipAddress = 'localhost';
    var port = 42004;

    var socket;
    connectToServer();
    
    
    
    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {
        if (socket.readyState <= 1){
            socket.close();
        }
    };

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        // If not connected - try again
        if( socket.readyState > 1){
            connectToServer();
        }
        
        if( socket.readyState == 1){
            return {status: 2, msg: 'Ready'};
        }
        return {status: 0, msg: 'Not connected'};
    };
    
    var commandCompletedCmd = 'allCommandsComplete';

    // Functions for block with type 'w' will get a callback function as the 
    // final argument. This should be called to indicate that the block can
    // stop waiting.
    ext.move_forward = function(distance, callback) {
        submitCommand('move'+distance);
        //TODO set timeout waiting for response
        socket.onmessage = function (evt) {
            if ( evt.data.slice(0, commandCompletedCmd.length) == commandCompletedCmd ){
                if( event.data.slice(commandCompletedCmd.length+1) == '1'){
                    callback();
                }
                //Todo: error?
            }
            //todo error?
       };
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            ['w', 'move Rover forward %n cm', 'move_forward']
        ]
    };
    
    function connectToServer() {
        socket = new WebSocket('ws://' + ipAddress + ':' + port);
        socket.onopen = function(){
            socket.send('reset');
        }
        socket.onerror = function (error) {
            console.log('WebSocket Error ' + error);
        };
    }
    
    // Submits command as a string
    function submitCommand(cmdString) {
        // If not connected - try again
        if( socket.readyState > 1){
            connectToServer();
        }
        // Wait if not connected yet - FIXME to wait instead of loop
        while (socket.readyState != 1){}
        socket.send(cmdString);
    }

    // Register the extension
    ScratchExtensions.register('Dawn Robotics Rover extension', descriptor, ext);
})();
