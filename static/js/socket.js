import io from 'socket.io-client';

var socket;

function init(handlers, callback) {
    socket = io(window.location.protocol + '//' + window.location.hostname + ':8100');
    socket.on('connect', function() {
        var eventNames = ['roomData', 'playersData', 'shot', 'respawn', 'playerLeave', 'score', 'enduranceInfo', 'enduranceItemPickuped'];
        eventNames.forEach(function(eventName) {
            var handlerName= 'on' + eventName[0].toUpperCase() + eventName.substring(1);
            socket.on(eventName, handlers[handlerName]);
        });
        callback();
    });
};

function emit(name, data) {
    return socket.emit(name, data);
};

export default {
    init: init,
    emit: emit
}