import io from 'socket.io-client';

var socket;

function init(handlers, callback) {
    socket = io();
    socket.on('connect', function() {
        var eventNames = ['joinGameData', 'joinRoomData', 'playersData', 'otherPlayerShot', 'respawn', 'playerLeave', 'score',
            'enduranceInfo', 'weaponsInfo', 'enduranceItemPickuped', 'weaponItemPickuped', 'forceReload', 'death'];
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