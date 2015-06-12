/* Extension for the Dawn Robotics' rover robot */
/* Phil Bennett <philipbennett28@gmail.com>, Jun 2015 */

new (function() {
    var ext = this;
     
    var ipAddress = '127.0.0.1';
    var port = 42001;

    var socket = new WebSocket('ws://' + ipAddress + ':' + port);
     
    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {};

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        return {status: 2, msg: 'Ready'};
    };

    // Functions for block with type 'w' will get a callback function as the 
    // final argument. This should be called to indicate that the block can
    // stop waiting.
    ext.move_forward = function(callback) {
        socket.send('move100');
        //TODO set timeout waiting for response
        socket.onmessage = function (evt) {
            if ( evt.data == 'allCommandsComplete'){
                callback();
            }
       };
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            ['w', 'move Rover forward %n cm', 'move_forward'],
        ]
    };

    // Register the extension
    ScratchExtensions.register('Dawn Robotics Rover extension', descriptor, ext);
})();
