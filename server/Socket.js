var UPDATE_INTERVAL = 100,
    DROP_TIMEOUT = 5000;

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
        socket.on('respawnComplete', onSocketRespawnComplete);
    });
    setInterval(processRoomsState, UPDATE_INTERVAL);
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
    var player = getPlayerBySocketData(data);
    if(player) {
        !player.idDead && (player.positionInfo = data.positionInfo);
        player.lastUpdateTime = utils.getNowTime();
    }
};

function onSocketHit(data) {
    var room = getRoomBySocketData(data),
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
            target.idDead = true;
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
    if(getRoomBySocketData(data)) {
        delete data.roomId;
        data.time = utils.getNowTime();
        io.sockets.in(data.roomId).emit('shot', data);
    }
};

function onSocketRespawnComplete(data) {
    var player = getPlayerBySocketData(data);
    player && (player.isDead = false);
};

function getRoomBySocketData(data) {
    return getRoom(data.roomId);
};

function getRoom(roomId) {
    return roomsCache[roomId] || null;
};

function getPlayerBySocketData(data) {
    return getPlayer(data.roomId, data.playerId);
};

function getPlayer(roomId, playerId) {
    var room = getRoom(roomId);
    return room ? room.players[playerId] : null;
};

function processRoomsState() {
    utils.forEachEntryInObject(roomsCache, function(roomId, room) {
        utils.forEachEntryInObject(room.players, function(playerId, player) {
            var timeAfterLastUpdate = utils.getNowTime() - player.lastUpdateTime || 0;
            if(timeAfterLastUpdate > UPDATE_INTERVAL * 5) {
                player.positionInfo.moveDirection = '';
                if(timeAfterLastUpdate > DROP_TIMEOUT) {
                    delete room.players[playerId];
                    io.sockets.in(roomId).emit('playerLeave', room.playerId);
                }
            }
        });
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
        lastUpdateTime: utils.getNowTime(),
        idDead: false,
        positionInfo: {
            x: position.x,
            y: position.y,
            moveDirection: ''
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