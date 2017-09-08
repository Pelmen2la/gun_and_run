const ROOM_UPDATE_INTERVAL = 100,
    SCORE_UPDATE_INTERVAL = 500,
    SCORES_TO_WIN = 10,
    PING_TOLERANCE_TIME = 100,
    BULLET_LIFE_TIME = 2000,
    ROOM_MAX_PLAYERS_COUNT = 10,
    PLAYER_KICK_TIMEOUT = 10000;

var socketIO = require('socket.io'),
    io,
    utils = require('./Utils'),
    dataHelper = require('./DataHelper.js'),
    weapons = require('./Weapons.js'),
    consts = require('../static/js/consts.js'),
    jointCode = require('./JointCode.js'),
    bots = require('./Bots.js'),
    rooms = [],
    roomsCache = {},
    players = [],
    scoreArr = [],
    lastScoreArrUpdateTime = utils.getNowTime(),
    score = {};

function init(server) {
    io = socketIO(server);
    io.sockets.on('connection', (socket) => {
        socket.on('joinGame', onSocketJoinGame);
        socket.on('shot', onSocketShot);
        socket.on('playerInfo', onSocketPlayerInfo);
        socket.on('hit', onSocketHit);
        socket.on('pickupEnduranceItem', onSocketPickupEnduranceItem);
        socket.on('pickupWeaponItem', onSocketPickupWeaponItem);
        socket.on('portal', onSocketPortal);
    });
    ensureEmptyRoomAvailable();
    setInterval(processRoomsState, ROOM_UPDATE_INTERVAL);
};

function onSocketJoinGame(data) {
    var socket = this,
        playerId = data.playerId,
        player = players.find((p) => p.id == playerId),
        exceptRoomId = player && player.isDead ? player.roomId : null;
    score[playerId] = score[playerId] || 0;
    player && tryRemovePlayerFromCurrentRoom(player);
    findRoomForPlayer(playerId, exceptRoomId, function(room) {
        var joinGameFn = () => {
                if(players.indexOf(player) === -1) {
                    players.push(player);
                }
                player.socketId = socket.id;
                addPlayerToRoom(room, socket, player);
                emitJoinGame(socket, room, player);
            },
            position = dataHelper.getPlayerSpawnPosition(room.map);

        if(player) {
            if(player.isDead) {
                dataHelper.extendPlayerWithNewGameData(player, position, socket.id);
            }
            joinGameFn();
        } else {

            dataHelper.getPlayerNewGameData(playerId, position, socket.id, function(playerData) {
                player = playerData || dataHelper.getNewPlayer(position, socket.id, data.name, data.characterName);
                joinGameFn();
            });
        }
    });
};

function findRoomForPlayer(playerId, exceptRoomId, callback) {
    var room = rooms.find((r) => r.playersCache[playerId] && r.id != exceptRoomId);
    if(room) {
        callback(room);
    } else {
        var roomCandidates = rooms.filter(function(r) {
            return r.id !== exceptRoomId && r.players.length < ROOM_MAX_PLAYERS_COUNT;
        });
        if(roomCandidates.length) {
            callback(roomCandidates[utils.getRandomInt(roomCandidates.length - 1)]);
        } else {
            addNewRoom(callback);
        }
        ensureEmptyRoomAvailable();
    }
};

function addNewRoom(callback) {
    dataHelper.createNewRoom(function(room) {
        rooms.push(room);
        roomsCache[room.id] = room;
        callback && callback(room);
    });
}

function ensureEmptyRoomAvailable() {
    var emptyRooms = rooms.filter((r) => !r.players.length);
    if(!emptyRooms.length) {
        addNewRoom();
    }
};


function onSocketPlayerInfo(data) {
    var player = getPlayerBySocketData(data);
    if(player) {
        player.positionInfo = data.positionInfo;
        player.lastUpdateTime = utils.getNowTime();
    }
};

function onSocketHit(data) {
    var room = getRoomBySocketData(data),
        owner = room ? room.playersCache[data.playerId] : null,
        target = room ? room.playersCache[data.targetId] : null,
        bullet = room.bullets[data.bulletId],
        targetSocket = io.sockets.connected[target.socketId];
    if(owner && target && bullet && target.id !== owner.id && (bullet.hitsCounter[target.id] || 0) < bullet.maxHitsCount) {
        bullet.hitsCounter[target.id] = (bullet.hitsCounter[target.id] || 0) + 1;
        processPlayerDamage(target, bullet.damage);
        if(target.endurance.hp <= 0) {
            if(target.isBot) {
                respawnBot(target, room.map);
            } else {
                target.isDead = true;
                targetSocket.emit('death');
            }
            if(!owner.isBot) {
                score[owner.id] = (score[owner.id] || 0) + 1;
                score[owner.id] >= SCORES_TO_WIN && endRound();
            }
        } else {
            !target.isBot && targetSocket.emit('enduranceInfo', target.endurance);
        }
    }
};

function endRound() {
    var scoreArr = getScoreArray(true),
        roundResult = scoreArr.slice(0, 10).map(function(r) {
            return { name: r.name, score: r.score };
        });
    scoreArr.forEach((r, i) => {
        tryEmit(r.socketId, 'endRound', {topTen: roundResult, rank: i + 1, score: r.score });
    });
    utils.forEachEntryInObject(rooms, (id, room) => {
        var bots = room.bots;
        room.playersCache = {};
        bots.forEach((b) => room.playersCache[b.id] = b);
    });
    score = {};
    players = [];
};

function respawnBot(bot, map) {
    var spawnPosition = dataHelper.getPlayerSpawnPosition(map);
    bot.positionInfo.x = spawnPosition.x;
    bot.positionInfo.y = spawnPosition.y;
    bot.weapons = dataHelper.getPlayerStartWeapons();
    bot.endurance = { hp: 100, armor: 0 };
};

function onSocketShot(shotData) {
    var room = getRoomBySocketData(shotData),
        player = getPlayerBySocketData(shotData);
    if(player) {
        var weapon = player.weapons.find(function(w) { return w.name === shotData.weaponName }),
            now = utils.getNowTime();
        if(weapon && now - weapons.isWeaponCanShoot(weapon, PING_TOLERANCE_TIME)) {
            weapon.lastShotTime = now;
            var weaponProps = weapons.getWeaponByName(weapon.name),
                bulletData = {
                    bulletId: shotData.bulletId,
                    playerId: shotData.playerId,
                    positionInfo: shotData.positionInfo,
                    weaponName: shotData.weaponName,
                    damage: weaponProps.damage
                };
            utils.forEachEntryInObject(room.playersCache, (id, p) => {
                var socket = io.sockets.connected[p.socketId];
                socket && id != bulletData.playerId && !p.isBot && socket.emit('otherPlayerShot', bulletData)
            });
            utils.extendObject(bulletData, {
                time: utils.getNowTime(),
                maxHitsCount: weaponProps.bulletsCount || 1,
                hitsCounter: {}
            });
            room.bullets[bulletData.bulletId] = bulletData;
            weapon.ammo -= 1;
            if(weapon.ammo <= 0) {
                player.weapons.splice(player.weapons.indexOf(weapon), 1);
                !player.isBot && io.sockets.connected[player.socketId].emit('weaponsInfo', player.weapons);
            }
        }
    }
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
        tryRemovePlayerFromCurrentRoom(player);
        findRoomForPlayer(player.id, currentRoom.id, function(newRoom) {
            addPlayerToRoom(newRoom, socket, player);
            utils.extendObject(player.positionInfo, dataHelper.getPlayerSpawnPosition(newRoom.map));
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
    return room ? room.playersCache[playerId] : null;
};

function getScoreArray(forceCalculate) {
    if(forceCalculate || utils.getNowTime() - lastScoreArrUpdateTime > SCORE_UPDATE_INTERVAL) {
        lastScoreArrUpdateTime = utils.getNowTime();
        scoreArr = [];
        players.forEach((p) => {
            scoreArr.push({score: score[p.id], socketId: p.socketId, name: p.name});
        });
        scoreArr.sort((a, b) => b.score - a.score);
    }
    return scoreArr;
};

function tryEmit(socketId, eventName, data) {
    var socket = io.sockets.connected[socketId];
    socket && socket.emit(eventName, data)
};

function processRoomsState() {
    utils.forEachEntryInObject(roomsCache, function(roomId, room) {
        var now = utils.getNowTime();
        utils.forEachEntryInObject(room.playersCache, function(playerId, player) {
            var timeAfterLastUpdate = now - player.lastUpdateTime || 0;
            if(player.isBot) {
                bots.processBotsMoves(room);
            } else if(timeAfterLastUpdate > ROOM_UPDATE_INTERVAL * 5) {
                player.positionInfo.moveDirection = '';
                if(timeAfterLastUpdate > PLAYER_KICK_TIMEOUT) {
                    kickPlayer(player);
                    io.sockets.in(roomId).emit('playerLeave', room.playerId);
                }
            }
        });
        getScoreArray().forEach((s, index) => {
            tryEmit(s.socketId, 'score', {score: s.score || 0, rank: index + 1});
        });
        utils.forEachEntryInObject(room.bullets, function(bulletId, bullet) {
            if(now - bullet.time > BULLET_LIFE_TIME) {
                delete room[bulletId];
            }
        });
        io.sockets.in(roomId).emit('playersData', room.playersCache);
    });
};

function processPlayerDamage(player, damage) {
    var hpDamage = damage - player.endurance.armor * 10;
    hpDamage = hpDamage < 0 ? 0 : hpDamage;
    player.endurance.hp -= hpDamage;
    player.endurance.armor -= Math.round(damage / 10);
    player.endurance.armor = player.endurance.armor < 0 ? 0 : player.endurance.armor;
};

function emitJoinGame(socket, room, player) {
    socket.emit('joinGameData', getJoinRoomData(room, player));
};

function getJoinRoomData(room, player) {
    return { map: room.map, roomId: room.id, player: player };
};

function addPlayerToRoom(room, socket, player) {
    var socket = io.sockets.connected[player.socketId];
    socket.join(room.id);
    room.playersCache[player.id] = player;
    room.players.indexOf(player) === -1 && room.players.push(player);
    player.roomId = room.id;
};

function tryRemovePlayerFromCurrentRoom(player) {
    var room = rooms.find((r) => !!r.players.find((p) => p.id === player.id));
        socket = io.sockets.connected[player.socketId];
    socket && socket.leave(room.id);
    if(room) {
        delete room.playersCache[player.id];
        room.players.splice(room.players.indexOf(player), 1);
    }
};

function kickPlayer(player) {
    tryRemovePlayerFromCurrentRoom(player);
    players.splice(players.indexOf(player), 1);
};

function getRooms() {
    return rooms;
};

module.exports = {
    getRooms: getRooms,
    onSocketShot: onSocketShot,
    init: init
};