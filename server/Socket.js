const ROOM_UPDATE_INTERVAL = 100,
    BULLET_LIFE_TIME = 2000,
    PLAYER_DROP_TIMEOUT = 10000;

var io = require('socket.io').listen(8100),
    utils = require('./Utils'),
    dataHelper = require('./DataHelper.js'),
    weapons = require('./Weapons.js'),
    rooms = [],
    roomsCache = {};

module.exports = function(app) {
    io.sockets.on('connection', (socket) => {
        socket.on('joinGame', function(data) {
            onSocketJoinGame(socket, data.login, data.id);
        });
        socket.on('shot', onSocketShot);
        socket.on('playerInfo', onSocketPlayerInfo);
        socket.on('hit', onSocketHit);
        socket.on('respawnComplete', onSocketRespawnComplete);
        socket.on('pickupEnduranceItem', onSocketPickupEnduranceItem);
        socket.on('pickupWeaponItem', onSocketPickupWeaponItem);
    });
    setInterval(processRoomsState, ROOM_UPDATE_INTERVAL);
};

function onSocketJoinGame(socket, login, id) {
    findRoomForPlayer(id, function(room) {
        var player = room.players[id],
            emitJoinGameFn = () => emitJoinGame(socket, room, player);
        if(player) {
            player.socketId = socket.id;
            emitJoinGame(socket, room, player);
            emitJoinGameFn();
        } else {
            var position = getPlayerSpawnPosition(room);
            dataHelper.getPlayerNewGameData(id, position, socket.id, function(playerData) {
                player = playerData || dataHelper.getNewPlayer(position, socket.id, login);
                addNewPlayerToRoom(room, socket, player);
                emitJoinGameFn();
            });
        }
    });
};

function findRoomForPlayer(playerId, callback) {
    if(!rooms.length) {
        createNewRoom(function(room) {
            rooms.push(room);
            roomsCache[room.id] = room;
            callback(room);
        });
    } else {
        var room = rooms.find((r) => r.players[playerId]);
        callback(room || rooms[0]);
    }
};


function onSocketPlayerInfo(data) {
    var player = getPlayerBySocketData(data);
    if(player) {
        !player.idDead && (player.positionInfo = data.positionInfo);
        player.lastUpdateTime = utils.getNowTime();
    } else {
        this.emit('forceReload');
    }
};

function onSocketHit(data) {
    var room = getRoomBySocketData(data),
        owner = room ? room.players[data.ownerId] : null,
        target = room ? room.players[data.targetId] : null,
        bullet = room.bullets[data.id];
    if(owner && target && bullet) {
        processPlayerDamage(target, bullet.damage);
        delete room.bullets[data.id];
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

function onSocketShot(bulletData) {
    var room = getRoomBySocketData(bulletData),
        player = getPlayerBySocketData(bulletData);
    if(player) {
        var weapon = player.weapons.find(function(w) { return w.name === bulletData.weaponName });
        if(weapon) {
            delete bulletData.roomId;
            bulletData.time = utils.getNowTime();
            room.bullets[bulletData.id] = bulletData;
            utils.forEachEntryInObject(room.players, (id, p) =>
                id != bulletData.playerId && io.sockets.connected[p.socketId].emit('otherPlayerShot',
                    { playerId: bulletData.playerId, weaponName: bulletData.weaponName, damage: weapon.damage })
            );
            weapon.ammo -= 1;
            if(weapon.ammo <= 0) {
                player.weapons.splice(player.weapons.indexOf(weapon), 1);
                io.sockets.connected[player.socketId].emit('weaponsInfo', player.weapons);
            }
        }
    }
};

function onSocketRespawnComplete(data) {
    var player = getPlayerBySocketData(data);
    player && (player.isDead = false);
};

function onSocketPickupEnduranceItem(data) {
    tryPickupItem(data, 'endurance', function(room, player, item) {
        item.itemType == 'armor' && (player.endurance.armor = 10);
        item.itemType == 'hp' && (player.endurance.hp = 100);
        io.sockets.connected[player.socketId].emit('enduranceInfo', player.endurance);
        io.sockets.in(room.id).emit('enduranceItemPickuped', {itemId: item.id, time: item.lastPickupTime});
    });
};

function onSocketPickupWeaponItem(data) {
    tryPickupItem(data, 'weapon', function(room, player, item) {
        var weapon = weapons.getWeaponByName(item.name, true);
            playerWeapon = player.weapons.find((w) => w.name === item.name);
        weapon.selected = true;
        playerWeapon ? (playerWeapon.ammo += weapon.ammo) : (player.weapons.push(weapon));
        io.sockets.connected[player.socketId].emit('weaponsInfo', player.weapons);
        io.sockets.in(room.id).emit('weaponItemPickuped', {itemId: item.id, time: item.lastPickupTime});
    });
};

function tryPickupItem(data, itemType, callback) {
    var room = getRoomBySocketData(data),
        player = getPlayerBySocketData(data),
        item = room && room.map[itemType + 'Items'].find((item) => item.id === data.itemId);
    if(room && player && item && (!item.lastPickupTime || utils.getNowTime() - item.lastPickupTime > item.respawnTime)) {
        item.lastPickupTime = utils.getNowTime();
        callback(room, player, item);
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
        var now = utils.getNowTime();
        utils.forEachEntryInObject(room.players, function(playerId, player) {
            var timeAfterLastUpdate = now - player.lastUpdateTime || 0;
            if(timeAfterLastUpdate > ROOM_UPDATE_INTERVAL * 5) {
                player.positionInfo.moveDirection = '';
                if(timeAfterLastUpdate > PLAYER_DROP_TIMEOUT) {
                    delete room.players[playerId];
                    io.sockets.in(roomId).emit('playerLeave', room.playerId);
                }
            }
        });
        utils.forEachEntryInObject(room.bullets, function(bulletId, bullet) {
            if(now - bullet.time > BULLET_LIFE_TIME) {
                delete room[bulletId];
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

function emitJoinGame(socket, room, player) {
    socket.emit('joinGameData', { map: room.map, roomId: room.id, player: player });
};

function createNewRoom(callback) {
    var room = {
        id: utils.getUid(),
        players: {},
        bullets: {}
    };
    dataHelper.getMapForPlayer(function(mapData) {
        room.map = mapData;
        callback(room);
    });
};

function addNewPlayerToRoom(room, socket, player) {
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