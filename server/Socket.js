const ROOM_UPDATE_INTERVAL = 100,
    BULLET_LIFE_TIME = 2000,
    ROOM_MAX_PLAYERS_COUNT = 10,
    PLAYER_DROP_TIMEOUT = 10000;

var io = require('socket.io').listen(8100),
    utils = require('./Utils'),
    dataHelper = require('./DataHelper.js'),
    weapons = require('./Weapons.js'),
    rooms = [],
    roomsCache = {};

module.exports = function(app) {
    io.sockets.on('connection', (socket) => {
        socket.on('joinGame', onSocketJoinGame);
        socket.on('shot', onSocketShot);
        socket.on('playerInfo', onSocketPlayerInfo);
        socket.on('hit', onSocketHit);
        socket.on('respawnComplete', onSocketRespawnComplete);
        socket.on('pickupEnduranceItem', onSocketPickupEnduranceItem);
        socket.on('pickupWeaponItem', onSocketPickupWeaponItem);
        socket.on('portal', onSocketPortal);
    });
    setInterval(processRoomsState, ROOM_UPDATE_INTERVAL);
};

function onSocketJoinGame(data) {
    var socket = this,
        playerId = data.playerId;
    findRoomForPlayer(playerId, null, function(room) {
        var player = room.players[playerId],
            emitJoinGameFn = () => emitJoinGame(socket, room, player);
        if(player) {
            player.socketId = socket.id;
            emitJoinGameFn();
        } else {
            var position = getPlayerSpawnPosition(room);
            dataHelper.getPlayerNewGameData(playerId, position, socket.id, function(playerData) {
                player = playerData || dataHelper.getNewPlayer(position, socket.id, data.login, data.characterName);
                addNewPlayerToRoom(room, socket, player);
                emitJoinGameFn();
            });
        }
    });
};

function findRoomForPlayer(playerId, exceptRoomId, callback) {
    var room = rooms.find((r) => r.players[playerId]);
    if(room && !exceptRoomId) {
        callback(room);
    } else {
        var roomCandidates = rooms.filter(function(r) {
            var playersCount = 0;
            utils.forEachEntryInObject(r.players, () => playersCount++);
            return r.id !== exceptRoomId && playersCount < ROOM_MAX_PLAYERS_COUNT;
        });
        if(roomCandidates.length) {
            callback(roomCandidates[utils.getRandomInt(roomCandidates.length - 1)]);
        } else {
            createNewRoom(function(room) {
                rooms.push(room);
                roomsCache[room.id] = room;
                callback(room);
            });
        }
    }
};


function onSocketPlayerInfo(data) {
    var player = getPlayerBySocketData(data);
    if(player) {
        player.positionInfo = data.positionInfo;
        player.lastUpdateTime = utils.getNowTime();
    } else {
        this.emit('death');
    }
};

function onSocketHit(data) {
    var room = getRoomBySocketData(data),
        owner = room ? room.players[data.playerId] : null,
        target = room ? room.players[data.targetId] : null,
        bullet = room.bullets[data.bulletId],
        targetSocket = io.sockets.connected[target.socketId];
    if(owner && target && bullet && target.id !== owner.id) {
        processPlayerDamage(target, bullet.damage);
        delete room.bullets[data.id];
        if(target.endurance.hp <= 0) {
            owner.score += 1;
            targetSocket.emit('death');
            removePlayerFromRoom(room, targetSocket, target);
            dataHelper.setPlayerData(owner.id, { score: owner.score }, () => {
                dataHelper.getPlayerRank(owner.id, (rank) => {
                    io.sockets.connected[owner.socketId].emit('score', { score: owner.score, rank: rank });
                });
            });
        } else {
            targetSocket.emit('enduranceInfo', target.endurance);
        }
    }
};

function respawnPlayer(player) {
    var spawnPosition = getPlayerSpawnPosition(room);
    player.positionInfo.x = spawnPosition.x;
    player.positionInfo.y = spawnPosition.y;
    player.endurance = { hp: 100, armor: 0 };
    player.isDead = true;
    player.lastRespawnTime = utils.getNowTime();
    io.sockets.connected[player.socketId].emit('respawn', {
        endurance: player.endurance,
        position: position
    });
};

function onSocketShot(bulletData) {
    var room = getRoomBySocketData(bulletData),
        player = getPlayerBySocketData(bulletData);
    if(player) {
        var weapon = player.weapons.find(function(w) { return w.name === bulletData.weaponName });
        if(weapon) {
            delete bulletData.roomId;
            bulletData.time = utils.getNowTime();
            bulletData.damage = weapons.getWeaponByName(weapon.name).damage;
            room.bullets[bulletData.id] = bulletData;
            utils.forEachEntryInObject(room.players, (id, p) =>
                id != bulletData.playerId && io.sockets.connected[p.socketId].emit('otherPlayerShot', bulletData)
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

function onSocketPortal(data) {
    var socket = this;
        currentRoom = getRoomBySocketData(data),
        player = getPlayerBySocketData(data);
    if(currentRoom && player) {
        findRoomForPlayer(player.id, currentRoom.id, function(newRoom) {
            removePlayerFromRoom(currentRoom, socket, player);
            addNewPlayerToRoom(newRoom, socket, player);
            utils.extendObject(player.positionInfo, getPlayerSpawnPosition(newRoom));
            socket.emit('joinRoomData', getJoinRoomData(newRoom, player));
        });
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
    socket.emit('joinGameData', getJoinRoomData(room, player));
};

function getJoinRoomData(room, player) {
    return { map: room.map, roomId: room.id, player: player };
};

function createNewRoom(callback) {
    var room = {
        id: utils.getUid(),
        players: {},
        bullets: {}
    };
    dataHelper.getNewMap(function(mapData) {
        room.map = mapData;
        callback(room);
    });
};

function removePlayerFromRoom(room, socket, player) {
    socket.leave(room.id);
    delete room.players[player.id];
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
