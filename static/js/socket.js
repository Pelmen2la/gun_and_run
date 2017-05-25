import io from 'socket.io-client';

var socket;

function init(handlers, callback) {
    socket = io(window.location.origin.split(':')[0] + ':8100');
    socket.on('connect', function() {
        socket.on('roomData', function(data) {
            handlers.onRoomData(data);
        });
        socket.on('playersData', function(data) {
            handlers.onPlayersData(data);
        });
        socket.on('shot', function(data) {
            handlers.onShot(data);
        });
        socket.on('respawn', function(data) {
            handlers.onRespawn(data);
        });
        socket.on('score', function(data) {
            handlers.onScore(data);
        });
        socket.on('hp', function(data) {
            handlers.onHp(data);
        });
        callback();
    });
};

function emit(name, data) {
    return socket.emit(name, data);
}

export default {
    init: init,
    emit: emit
}