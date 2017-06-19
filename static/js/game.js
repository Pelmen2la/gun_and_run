require('pixi.js');
require('p2');
require('phaser');

import socket from './socket.js'
import spritesFactory from './spritesFactory.js'
import map from './map.js'
import consts from './consts.js';
import controls from './controls.js';
import userInterface from './interface.js';
import utils from './../../server/Utils.js'
import weapons from './../../server/Weapons.js'

var gameData = {},
    game = new Phaser.Game(window.innerWidth, window.innerHeight,
        Phaser.AUTO, '', {
            preload: preload,
            create: create,
            update: update
        });

function preload() {
    spritesFactory.loadResources();
};

function create() {
    game.time.advancedTiming = true;
    game.renderer.renderSession.roundPixels = true;
    controls.init(getControlsHandlers());
    socket.init(getSocketHandlers(), function() {
        socket.emit('joinRoom');
    });
    window.setInterval(checkCollision, 50);
};

function update() {
    document.getElementById('FPSCounter').innerHTML = 'fps: ' + game.time.fps;
    if(gameData && gameData.player) {
        updatePlayerPosition();
    }
};

function checkCollision() {
    var processPickupItem = function(playerId, itemId, type) {
        map['hide' + type + 'Item'](itemId, utils.getNowTime());
        socket.emit('pickup' + type + 'Item', {
            roomId: gameData.roomId,
            playerId: playerId,
            itemId: itemId
        });
    };

    if(gameData && gameData.player) {
        game.physics.arcade.collide(gameData.bulletsGroup, map.getWallGroup(), function(bullet) {
            window.setTimeout(() => gameData.bulletsGroup.remove(bullet, true), 0);
        });
        game.physics.arcade.collide(gameData.bulletsGroup, gameData.playersGroup, function(bullet, player) {
            socket.emit('hit', {
                roomId: gameData.roomId,
                targetId: player.data.id,
                ownerId: bullet.data.playerId
            });
            bullet.data.ownerId !== player.data.id && window.setTimeout(() => gameData.bulletsGroup.remove(bullet, true), 0);
        });
        game.physics.arcade.collide(map.getEnduranceItemsGroup(), gameData.player, function(player, item) {
            processPickupItem(player.data.id, item.data.id, 'Endurance');
        });
        game.physics.arcade.collide(map.getWeaponItemsGroup(), gameData.player, function(player, item) {
            processPickupItem(player.data.id, item.data.id, 'Weapon');
        });
    }
};

function initData(data) {
    map.drawMap(data.map);
    gameData = {
        map: data.map,
        player: spritesFactory.createPlayer(data.player),
        players: {},
        playersGroup: game.add.group(),
        bulletsGroup: game.add.group(),
        roomId: data.roomId
    };
    game.camera.follow(gameData.player);
};

function getControlsHandlers() {
    var handlers = {};
    handlers['onShotButtonPress'] = onShotButtonPress;
    return handlers;
};

function onShotButtonPress() {
    var playerWeapons = gameData.player.data.weapons,
        playerWeapon = getPlayerSelectedWeapon(),
        weaponData = weapons.getWeaponByName(playerWeapon.name);
    if(Date.now() - (playerWeapon.lastShotTime || 0) > weaponData.reloadTime) {
        playerWeapon.lastShotTime = Date.now();
        playerWeapon.ammo && (playerWeapon.ammo -= 1);
        if(playerWeapon.ammo !== null && playerWeapon.ammo <= 0) {
            playerWeapons.splice(playerWeapons.indexOf(playerWeapon), 1);
            ensurePlayerSelectedWeapon();
        }
        shot(playerWeapon.name);
        updatePlayerInterface();
    }
};

function shot(weaponName) {
    var data = { playerId: gameData.player.data.id, roomId: gameData.roomId, weaponName: weaponName, id: utils.getUid() };
    socket.emit('shot', data);
    data.positionInfo = getPlayerPositionInfo(gameData.player, 'look', false);
    gameData.bulletsGroup.add(spritesFactory.createBullet(data));
};


function getSocketHandlers() {
    return {
        onRoomData: function(data) {
            initData(data);
            window.setInterval(sendPlayerInfo, 100);
            updatePlayerInterface();
        },
        onPlayersData: function(data) {
            updateOtherPlayersPosition(data);
        },
        onOtherPlayerShot: function(data) {
            addShot(data);
        },
        onRespawn: function(data) {
            var player = gameData.players[data.playerId];
            if(player) {
                player.x = data.position.x;
                player.y = data.position.y;
                player.id === gameData.player.id && socket.emit('respawnComplete',
                    { roomId: gameData.roomId, playerId: gameData.player.id });
            }
        },
        onPlayerLeave: function(playerId) {
            removePlayer(playerId);
        },
        onScore: function(score) {
            gameData.player.data.score = score;
            updatePlayerInterface();
        },
        onEnduranceInfo: function(endurance) {
            gameData.player.data.endurance = endurance;
            updatePlayerInterface();
        },
        onWeaponsInfo: function(weapons) {
            gameData.player.data.weapons = weapons;
            var selectedWeaponIndex = weapons.findIndex((w) => w.selected);
            if(selectedWeaponIndex !== -1) {
                setPlayerSelectedWeapon(selectedWeaponIndex);
            }
            ensurePlayerSelectedWeapon();
            updatePlayerInterface();
        },
        onEnduranceItemPickuped: function(data) {
            map.hideEnduranceItem(data.itemId, data.time);
        },
        onWeaponItemPickuped: function(data) {
            map.hideWeaponItem(data.itemId, data.time);
        }
    }
};

function sendPlayerInfo() {
    var player = gameData.player;
    socket.emit('playerInfo', {
        roomId: gameData.roomId,
        playerId: player.data.id,
        positionInfo: getPlayerPositionInfo(player, 'move', false)
    });
};

function getPlayerPositionInfo(player, directionName, isCenter) {
    return {
        x: player.x + (isCenter ? player.body.width / 2 : 0),
        y: player.y + (isCenter ? player.body.height / 2 : 0),
        direction: player.data[directionName + 'Direction']
    }
};

function getPlayerSelectedWeapon() {
    return gameData.player.data.weapons[gameData.player.data.selectedWeaponIndex];
};

function setPlayerSelectedWeapon(weaponIndex) {
    gameData.player.data.selectedWeaponIndex = weaponIndex;
};

function ensurePlayerSelectedWeapon() {
    var index = gameData.player.data.selectedWeaponIndex,
        weaponsCount = gameData.player.data.weapons.length;
    (index < 0 || index > weaponsCount - 1) && setPlayerSelectedWeapon(weaponsCount - 1);
};

function updatePlayerPosition() {
    var player = gameData.player,
        body = player.body,
        moveDirection = controls.getMoveDirection();
    game.physics.arcade.collide(player, map.getWallGroup());
    body.velocity = {x: 0, y: 0};

    spritesFactory.updatePlayerSprite(player, moveDirection);
};

function updateOtherPlayersPosition(playersData) {
    var ids = {};
    if(gameData && playersData) {
        utils.forEachEntryInObject(playersData, function(playerId, playerData) {
            if(playerId !== gameData.player.data.id) {
                var pos = playerData.positionInfo;
                ids[playerId] = true;
                if(!gameData.players[playerId]) {
                    gameData.players[playerId] = spritesFactory.createPlayer(playerData);
                    gameData.playersGroup.add(gameData.players[playerId]);
                }
                var player = gameData.players[playerId];
                spritesFactory.updatePlayerSprite(player, pos.moveDirection);
                player.x = pos.x;
                player.y = pos.y;
            }
        });
    }
    utils.forEachEntryInObject(gameData.players, function(playerId, player) {
        if(!ids[playerId] && gameData.player.data.id !== playerId) {
            player.kill();
            delete gameData.players[playerId];
        }
    });
};

function removePlayer(playerId) {
    if(gameData.players[playerId]) {
        gameData.players[playerId].kill();
        delete gameData.players[playerId];
    }
};

function updatePlayerInterface() {
    var playerData = gameData.player.data;
    userInterface.updatePlayerInterface(playerData, getPlayerSelectedWeapon());
};


function addShot(data) {
    var player = gameData.players[data.playerId];
    data.positionInfo = getPlayerPositionInfo(player, 'look', false);
    player && gameData.bulletsGroup.add(spritesFactory.createBullet(data));
};

export default {
    instance: game
};