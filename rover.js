/* Extension for the Dawn Robotics' rover robot */
/* Phil Bennett <philipbennett28@gmail.com>, Jun 2015 */

new (function() {
    var ext = this;
     
    var serverStatus = 0;
    var ipAddress = 'localhost';
    var port = 42004;
    var readyForCommand = false;
    var CONNECTION_RETRY_INTERVAL = 10000; //10 secs
    
    var waitingReporterCallbacks = {};
    var waitingCommandCallback = null;
    
    var socket;
    connectToServer();
    
    ext.resetAll = function() {
    	if(socket.readyState > 1){
            //try to reconnect
            connectToServer();
        }
    	socket.send('reset');
    	waitingReporterCallbacks = {};
    	waitingCommandCallback = null;
    };
    
    
    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {
        if (socket.readyState <= 1){
            socket.close();
        }
    };

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        if( socket.readyState == 1){
            return {status: 2, msg: 'Ready'};
        }
        return {status: 0, msg: 'Not connected'};
    };
    
    var commandCompletedCmd = 'allCommandsComplete';
    var reporterResultCmd = 'reporterResult';

    // Functions for block with type 'w' will get a callback function as the 
    // final argument. This should be called to indicate that the block can
    // stop waiting.
    ext.forward = function(distance, callback) {
        setWaitingCommandCallback(callback);
        submitCommand('move'+distance);
    };
    
    ext.reverse = function(distance, callback) {
        ext.forward('-'+distance, callback);
    };
    
    ext.right = function(angle, callback) {
        setWaitingCommandCallback(callback);
        submitCommand('turn'+angle);
    };
    
    ext.left = function(angle, callback) {
        ext.right('-'+angle, callback);
    };
    
    ext.roverPos = function(pos, callback) {
    	reporterVariable = "rover"+pos.toUpperCase();
        addWaitingReporterCallback(reporterVariable, callback);
        requestReporterValue(reporterVariable);
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            ['w', 'move Rover forward %n cm', 'forward'],
            ["w", "move Rover backward %n cm", "reverse", 1],
            ["w", "turn Rover left %n degrees", "left", 90],
            ["w", "turn Rover right %n degrees", "right", 90],
            ["R", "get Rover %m.pos position", "roverPos"],
        ],
        menus: {
            pos: ["x", "y", "headingDegrees"],
        }
    };
    
    function setWaitingCommandCallback(callback){
    	waitingCommandCallback = callback;
    }
    
    function callWaitingCommandCallback(){
    	if( waitingCommandCallback ){
   	    waitingCommandCallback();
    	}
    	//error?
    	waitingCommandCallback = null;
    }
    
    function addWaitingReporterCallback(reporterName, callback){
    	waitingReporterCallbacks[reporterName] = callback;
    }
    
    function callWaitingReporterCallback(reporterName, reporterValue){
    	if( waitingReporterCallbacks[reporterName] != null ){
   	    (waitingReporterCallbacks[reporterName])(reporterValue);
   	    waitingReporterCallbacks[reporterName] = null;
    	}
    	else
    	{
   	    console.log('Unexpected reporter callback:'+reporterName)
    	}
    }
    
    function processMessage(msg){
    	// Check if a command has completed
    	if ( msg.data.slice(0, commandCompletedCmd.length) == commandCompletedCmd ){
    	    if( event.data.slice(commandCompletedCmd.length+1) == '1'){
                callWaitingCommandCallback();
            }
	}
	//else check if reporter value
	else if ( msg.data.slice(0, reporterResultCmd.length) == reporterResultCmd ){
    	    // get reporter key
    	    vals = msg.data.split(" ");
    	    if ( vals.length == 3 ){
                callWaitingReporterCallback(vals[1], vals[2]);
            }
            else{
            	console.log('Invalid reporter data returned from server:'+msg.data)
            }
	}
	else{
	    console.log('Unexpected command returned from server:'+msg.data)
	}
    }
    
    function connectToServer() {
        socket = new WebSocket('ws://' + ipAddress + ':' + port);
        socket.onopen = function(){
            // socket.send('reset');
            // setTimeout(function(){readyForCommand = true;}, 1000);
        };
        
        
        socket.onerror = function (error) {
            console.log('WebSocket Error ' + error);
        };
        
        socket.onmessage = function (msg) {
        	processMessage(msg);
        };
        
        socket.onclose = function () {
            readyForCommand = false;
            console.log('Socket closed');
            
        };
        
    }
    function requestReporterValue(reporterName){
    	submitCommand('reporter'+reporterName);
    }
    
    // Submits command as a string
    function submitCommand(cmdString) {
        // if(socket.readyState > 1){
        //     //keep trying to reconnect
        //     setTimeout(connectToServer, CONNECTION_RETRY_INTERVAL);
        // }
        socket.send(cmdString);
    }

    // Register the extension
    ScratchExtensions.register('Dawn Robotics Rover extension', descriptor, ext);
})();
