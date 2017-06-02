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
        socket.on('pickupEnduranceItem', onSocketPickupEnduranceItem);
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
        processPlayerDamage(target, bulletDamage);
        if(target.hp <= 0) {
            var position = getPlayerSpawnPosition(room);
            target.positionInfo.x = position.x;
            target.positionInfo.y = position.y;
            target.endurance.hp = 100;
            target.endurance.armor = 0;
            target.idDead = true;
            owner.score += 1;
            io.sockets.in(data.roomId).emit('respawn', {
                playerId: target.id,
                position: position
            });
            io.sockets.connected[owner.socketId].emit('score', owner.score);
        } else {
            io.sockets.connected[target.socketId].emit('enduranceInfo', target.endurance);
        }
    }
};

function onSocketShot(data) {
    var room = getRoomBySocketData(data);
    if(room) {
        delete data.roomId;
        data.time = utils.getNowTime();
        io.sockets.in(room.id).emit('otherPlayerShot', data);
    }
};

function onSocketRespawnComplete(data) {
    var player = getPlayerBySocketData(data);
    player && (player.isDead = false);
};

function onSocketPickupEnduranceItem(data) {
    var room = getRoomBySocketData(data),
        player = getPlayerBySocketData(data),
        item = room.map.enduranceItems.find((item) => item.uid === data.itemId);
    if(room && player && item && (!item.lastPickupTime || utils.getNowTime() - item.lastPickupTime > item.respawnTime)) {
        item.itemType == 'armor' && (player.endurance.armor = 10);
        item.itemType == 'hp' && (player.endurance.hp = 100);
        io.sockets.connected[player.socketId].emit('enduranceInfo', player.endurance);
        item.lastPickupTime = utils.getNowTime();
        io.sockets.in(room.id).emit('enduranceItemPickuped', { itemId: item.id, time: item.lastPickupTime });
    }
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

function processPlayerDamage(player, damage) {
    var hpDamage = damage - player.endurance.armor * 10;
    hpDamage = hpDamage < 0 ? 0 : hpDamage;
    player.endurance.hp -= hpDamage;
    player.endurance.armor -= damage % 10;
    player.endurance.armor = player.endurance.armor < 0 ? 0 : player.endurance.armor;

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

function addNewPlayerToRoom(socket, room) {
    var player = dataHelper.getNewPlayer(getPlayerSpawnPosition(room), socket.id);
    room.players[player.id] = player;
    socket.join(room.id);
    return player;
};

function getPlayerSpawnPosition(room) {
    var groundTiles = room.map.tiles.filter(function(tile) {
            return tile.tileType === 'ground';
        }),
        playerStartTile = groundTiles[utils.getRandomInt(groundTiles.length - 1)];
    return {x: playerStartTile.x - room.map.tileDimension / 2, y: playerStartTile.y - room.map.tileDimension / 2};
};