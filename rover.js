/* Extension for the Dawn Robotics' rover robot */
/* Phil Bennett <philipbennett28@gmail.com>, Jun 2015 */
/*
	This script communicates with a WebSocket service running on ipAddress (default: localhost) at the 
	specified port (default: 42004).
	
	The webservice may be acting as a simulator or a communication bridge to the robot.
	This script mostly uses the asyncronous scratch functions. It sends an async requst to the server
	and then calls the relevant callback which updates the scratch data. The benefit of using the async
	callback is that the scratch interpreter will wait on the command block until a response is received.

*/

new (function() {
    var ext = this;
    
    var ipAddress = 'localhost';
    var port = 42004;
    var CONNECTION_RETRY_INTERVAL = 5000; //5 secs
    var timeoutId = null;
    
    // We can have multiple reporters in our code - scratch hangs whilst waiting
    var waitingReporterCallbacks = {};
    // We can only exceute one waiting command concurrently - robot only responds to one command at a time
    var waitingCommandCallback = null;
    
    var socket;
    connectToServer();
    
    // ******* Required extension functions *********
    ext.resetAll = function() {
    	if(socket.readyState > 1){
            //try to reconnect
            connectToServer();
        }
    	socket.send('reset');
    	// Call all callbacks to prevent GUI from hanging
    	for(waitingReporterCallback in waitingReporterCallbacks){
    		waitingReporterCallback("");
    	}
    	waitingReporterCallbacks = {};
    	if( waitingCommandCallback ){
    		waitingCommandCallback();
    	}
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

	//****** Scratch blocks *******
    ext.forward = function(distance, callback) {
    	submitWaitingCommand('move'+distance, callback);
    };
    
    ext.reverse = function(distance, callback) {
    	// Opposite of forward
        ext.forward('-'+distance, callback);
    };
    
    ext.right = function(angle, callback) {
        submitWaitingCommand('turn'+angle, callback);
    };
    
    ext.left = function(angle, callback) {
    	// Opposite of right
        ext.right('-'+angle, callback);
    };
    
    ext.roverPos = function(pos, callback) {
    	if (pos == 'headingDegrees'){
    		reporterVariable = "roverHeadingDegrees"
    	}
    	else{
    		reporterVariable = "rover"+pos.toUpperCase()
    	}
        submitReporterValueCommand(reporterVariable, callback);
    };
    
    
    //****** Helper functions for dealing with asynchronous callbacks from server ******
    function setWaitingCommandCallback(callback){
    	waitingCommandCallback = callback;
    }
    
    function callWaitingCommandCallback(){
    	if( waitingCommandCallback ){
    		// Call callback
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
    		// Call callback
   	    	(waitingReporterCallbacks[reporterName])(reporterValue);
   	    	waitingReporterCallbacks[reporterName] = null;
    	}
    	else
    	{
   	    	console.log('Unexpected reporter callback:'+reporterName)
    	}
    }
    
    // Parses a WebSocket message from the server and calls the relevant callback function
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
            // Clear any timeouts
            if( timeoutId != null ){
            	clearInterval(timeoutId);
            	timeoutId = null;
            }
            ext.resetAll();
        };
        
        
        socket.onerror = function (error) {
            console.log('WebSocket Error ' + error);
        };
        
        socket.onmessage = function (msg) {
        	processMessage(msg);
        };
        
        socket.onclose = function (msg) {
        	// Set up poller to keep trying to reconnect
        	timeoutId = setInterval(function(){ connectToServer(); }, CONNECTION_RETRY_INTERVAL);
        }
        
    }
    
    // Requests a report value for reporterName from the server and sets up callback for when data is recieved
    function submitReporterValue(reporterName, callback){
    	addWaitingReporterCallback(reporterName, callback);
    	submitCommand('reporter'+reporterName);
    }
    
    // Submits a waiting command to the server and sets up the callback for when data is recieved
    function submitWaitingCommand(cmdString, callback) {
    	setWaitingCommandCallback(callback);
        submitCommand(cmdString);
    }
    
    // Submits command as a string to the server
    function submitCommand(cmdString) {
        socket.send(cmdString);
    }
    
    
    //****** Block and block menu descriptions ******
    var descriptor = {
        blocks: [
            ['w', 'move Rover forward %n cm', 'forward', 1],
            ["w", "move Rover backward %n cm", "reverse", 1],
            ["w", "turn Rover left %n degrees", "left", 90],
            ["w", "turn Rover right %n degrees", "right", 90],
            ["R", "get Rover %m.pos position", "roverPos"],
        ],
        menus: {
            pos: ["x", "y", "headingDegrees"],
        }
    };

    // Register the extension
    ScratchExtensions.register('Dawn Robotics Rover extension', descriptor, ext);
})();
