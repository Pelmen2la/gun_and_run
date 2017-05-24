var io = require('socket.io').listen(8100),
    utils = require('./Utils'),
    dataHelper = require('./DataHelper.js'),
    rooms = [],
    roomsCache = {};

module.exports = function(app) {
    io.sockets.on('connection', (socket) => {
        socket.on('joinRoom', function() {
            onSocketJoinRoom(socket);
        });
        socket.on('shot', onSocketShot);
        socket.on('playerInfo', onSocketPlayerInfo);
        socket.on('hit', onSocketHit);
    });
    setInterval(sendRoomsStateToPlayers, 100);
};

function onSocketJoinRoom(socket) {
    if(!rooms.length) {
        createNewRoom(function(room) {
            rooms.push(room);
            roomsCache[room.id] = room;
            emitRoomData(socket, room);
        });
    } else {
        emitRoomData(socket, rooms[0]);
    }
};

function onSocketPlayerInfo(data) {
    var room = roomsCache[data.roomId],
        player = room ? room.players[data.id] : null;
    if(player) {
        ['positionInfo'].forEach(function(propName) {
            player[propName] = data[propName];
        });
    }
};

function onSocketHit(data) {
    var room = roomsCache[data.roomId],
        owner = room ? room.players[data.ownerId] : null,
        target = room ? room.players[data.targetId] : null,
        bulletDamage = 50;
    if(owner && target) {
        target.hp -= bulletDamage;
        if(target.hp <= 0) {
            var position = getPlayerSpawnPosition(room);
            target.positionInfo.x = position.x;
            target.positionInfo.y = position.y;
            target.hp = 100;
            owner.score += 1;
            io.sockets.in(data.roomId).emit('respawn', {
                playerId: target.id,
                position: position
            });
            io.sockets.connected[owner.socketId].emit('score', owner.score);
        } else {
            io.sockets.connected[target.socketId].emit('hp', target.hp);
        }
    }
};

function onSocketShot(data) {
    var roomId = data.roomId,
        room = roomsCache[roomId];
    if(room) {
        delete data.roomId;
        data.time = new Date().getTime();
        io.sockets.in(roomId).emit('shot', data);
    }
};

function getRoom(roomId) {
};

function getPlayer(roomId, playerId) {
    var room = roomsCache[data.roomId],
        player = room ? room.players[data.targetId] : null;
    if(player) {
    }
};

function sendRoomsStateToPlayers() {
    utils.forEachEntryInObject(roomsCache, function(roomId, room) {
        io.sockets.in(roomId).emit('playersData', room.players);
    });
};

function emitRoomData(socket, room) {
    socket.emit('roomData', { map: room.map, roomId: room.id, player: addNewPlayerToRoom(socket, room) });
};

function createNewRoom(callback) {
    var room = {
        id: utils.getUid(),
        players: {}
    };
    dataHelper.getMapForPlayer(function(mapData) {
        room.map = mapData;
        callback(room);
    });
};

function getNewPlayer(position, socketId) {
    return {
        id: utils.getUid(),
        hp: 100,
        score: 0,
        socketId: socketId,
        positionInfo: {
            x: position.x,
            y: position.y,
            direction: ''
        }
    }
};

function addNewPlayerToRoom(socket, room) {
    var player = getNewPlayer(getPlayerSpawnPosition(room), socket.id);
    room.players[player.id] = player;
    socket.join(room.id);
    return player;
};

function getPlayerSpawnPosition(room) {
    var groundTiles = room.map.tiles.filter(function(tile) {
            return tile.tileType === 'ground';
        }),
        playerStartTile = groundTiles[utils.getRandomInt(groundTiles.length - 1)];
    return {x: playerStartTile.x, y: playerStartTile.y};
};