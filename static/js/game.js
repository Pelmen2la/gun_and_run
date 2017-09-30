require('pixi.js');
require('p2');
require('phaser');

import socket from './socket.js'
import spritesFactory from './spritesFactory.js'
import audio from './audio.js'
import map from './map.js'
import consts from './consts.js';
import controls from './controls.js';
import userInterface from './interface.js';
import utils from './../../server/Utils.js'
import weapons from './../../server/Weapons.js'


var gameData = {},
    joinGameTimeout,
    game = new Phaser.Game('100%', '100%',
        Phaser.AUTO, document.getElementById('MainContainer'), {
            preload: preload,
            create: create,
            update: update
        });

function preload() {
    spritesFactory.loadResources();
    audio.loadResources();
};

function create() {
    game.time.advancedTiming = true;
    game.renderer.renderSession.roundPixels = true;
    socket.init(getSocketHandlers(), function() {
        userInterface.addOnLoginAction(function(data) {
            socket.emit('joinGame', data);
        });
        userInterface.bindJoinGameFunctionToElements(onTryJoinGameAction);
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
        },
        tryEmitHitOnCollide = function(bullet, player) {
            if(bullet.data.playerId !== player.data.id) {
                socket.emit('hit', {
                    roomId: gameData.roomId,
                    targetId: player.data.id,
                    playerId: bullet.data.playerId,
                    bulletId: bullet.data.id
                });
            }
        };


    if(gameData && gameData.player) {
        game.physics.arcade.collide(gameData.bulletsGroup, map.getWallGroup(), function(bullet) {
            window.setTimeout(() => gameData.bulletsGroup.remove(bullet, true), 0);
        });
        game.physics.arcade.collide(gameData.bulletsGroup, gameData.playersGroup, function(bullet, player) {
            tryEmitHitOnCollide(bullet, player);
            bullet.data.playerId !== player.data.id && window.setTimeout(() => gameData.bulletsGroup.remove(bullet, true), 0);
        });
        game.physics.arcade.collide(gameData.flameGroup, gameData.playersGroup, function(bullet, player) {
            tryEmitHitOnCollide(bullet, player);
        });
        game.physics.arcade.collide(map.getEnduranceItemsGroup(), gameData.player, function(player, item) {
            processPickupItem(player.data.id, item.data.id, 'Endurance');
        });
        game.physics.arcade.collide(map.getWeaponItemsGroup(), gameData.player, function(player, item) {
            processPickupItem(player.data.id, item.data.id, 'Weapon');
        });
        game.physics.arcade.collide(map.getPortal(), gameData.player, function(player, item) {
            window.clearTimeout(gameData.allowPortalTimeoutId);
            userInterface.setPortalIconVisibility(true);
            gameData.allowPortalTimeoutId = window.setTimeout(function() {
                gameData.allowPortalTimeoutId = null;
                userInterface.setPortalIconVisibility(false);
            }, 400);
        });
    }
};

function initGameData(data) {
    var gameMap = data.map;
    game.world.removeAll();
    map.drawMap(gameMap);
    controls.init(getControlsHandlers());
    data.player.selectedWeaponIndex = gameData.player ? gameData.player.data.selectedWeaponIndex : 0;
    var player = spritesFactory.createPlayer(data.player, true);
    gameData = {
        map: gameMap,
        player: player,
        players: {},
        playersGroup: game.add.group(),
        bulletsGroup: game.add.group(),
        flameGroup: game.add.group(),
        roomId: data.roomId
    };
    gameData.players[player.data.id] = player;
    gameData.playersGroup.add(player);
    ensurePlayerSelectedWeapon();
    game.camera.follow(gameData.player);
};

function getControlsHandlers() {
    var handlers = {
        onShotButtonPress: onShotButtonPress,
        onPortalButtonDown: onPortalButtonDown,
        onChangeWeaponButtonDown: onChangeWeaponButtonDown
    };
    return handlers;
};

function onShotButtonPress() {
    ensurePlayerSelectedWeapon();
    var playerWeapons = gameData.player.data.weapons,
        playerWeapon = getPlayerSelectedWeapon(),
        weaponData = weapons.getWeaponByName(playerWeapon.name);
    if(!playerWeapon.isReload) {
        playerWeapon.isReload = true;
        window.setTimeout(function() { playerWeapon.isReload = false; }, weaponData.reloadTime);
        if(playerWeapon.name !== 'pistol') {
            playerWeapon.ammo && (playerWeapon.ammo -= 1);
            if(playerWeapon.ammo <= 0) {
                playerWeapons.splice(playerWeapons.indexOf(playerWeapon), 1);
                ensurePlayerSelectedWeapon();
            }
        }
        shot(playerWeapon.name);
        updatePlayerWeaponInterface();
    }
};

function onTryJoinGameAction() {
    if(gameData.player.data.isDead) {
        window.clearInterval(gameData.sendPlayerInfoIntevalId);
        window.clearTimeout(joinGameTimeout);
        joinGameTimeout = window.setTimeout(() => socket.emit('joinGame', {playerId: gameData.player.data.id}), 300);
    }
};

function onPortalButtonDown() {
    if(gameData.player.data.isDead) {
        onTryJoinGameAction();
    } else if(gameData.allowPortalTimeoutId) {
        window.clearInterval(gameData.sendPlayerInfoIntevalId);
        socket.emit('portal', { playerId: gameData.player.data.id, roomId: gameData.roomId });
    }
};

function onChangeWeaponButtonDown(isNext) {
    var weaponIndex = gameData.player.data.selectedWeaponIndex + (isNext ? 1 : -1);
    if(weaponIndex < 0) {
        gameData.player.data.weapons.length - 1
    }  else if(weaponIndex > gameData.player.data.weapons.length - 1) {
        weaponIndex = 0;
    }
    setPlayerSelectedWeapon(weaponIndex);
};

function shot(weaponName) {
    var data = { playerId: gameData.player.data.id, roomId: gameData.roomId, weaponName: weaponName, bulletId: utils.getUid(),
        positionInfo: getPlayerPositionInfo(gameData.player, 'look', false) };
    socket.emit('shot', data);
    weaponName === 'flamethrower' ? addFlamethrowerFlame(data) : addBullets(data);
};

function addBullets(data) {
    if(data.weaponName === 'doublepistol') {
        addBulletCore(data, 10);
        addBulletCore(data, -10);
    } else {
        if(data.weaponName === 'shotgun') {
            addBulletCore(data, -5);
            addBulletCore(data, 5);
        }
        addBulletCore(data);
    }
};

function addBulletCore(data, deviationAngle) {
    data.deviationAngle = deviationAngle || 0;
    playWeaponShot(data);
    gameData.bulletsGroup.add(spritesFactory.createBullet(data));
    console.log(gameData.bulletsGroup.children);
};

function addFlamethrowerFlame(data) {
    socket.emit('shot', data);
    var counter = 0,
        flameSpritesIntervalId = window.setInterval(function() {
            var flame = spritesFactory.createFlamethrowerFlame(data, counter);
            playWeaponShot(data);
            gameData.flameGroup.add(flame);
            counter++;
            counter == 4 && window.clearInterval(flameSpritesIntervalId);
            window.setTimeout(function() {
                gameData.flameGroup.remove(flame);
            }, 150);
        }, 100);
};

function playWeaponShot(shootData) {
    var distanceToBullet = utils.getDistance(shootData.positionInfo, gameData.player),
        decrease = 1 - distanceToBullet / 512;
    decrease < 0 && (decrease = 0);
    audio.playWeaponShot(shootData.weaponName, decrease);
};


function getSocketHandlers() {
    function disableGame() {
        window.clearInterval(gameData.sendPlayerInfoIntevalId);
        userInterface.setGameInterfaceVisibility(false);
        controls.setControlsEnabled(false);
    };
    function initGame(data) {
        initGameData(data);
        userInterface.setLoginPanelVisibility(false);
        userInterface.setGameInterfaceVisibility(true);
        userInterface.hideAllFullscreenMessages();
        updatePlayerInterface(true);
        controls.setControlsEnabled(true);
        setPlayerIsDead(false);
        gameData.sendPlayerInfoIntevalId = window.setInterval(sendPlayerInfo, 100);
    };

    return {
        onJoinGameData: function(data) {
            setGameSavedData({
                playerId: data.player.id
            });
            controls.initKeyboard(getControlsHandlers());
            initGame(data);
        },
        onJoinRoomData: function(data) {
            initGame(data);
        },
        onPlayersData: function(data) {
            updateOtherPlayersPosition(data);
        },
        onOtherPlayerShot: function(data) {
            addShot(data);
        },
        onDeath: function() {
            setPlayerIsDead(true);
            gameData.player.data.selectedWeaponIndex = 0;
            userInterface.setDeathScreenVisibility(true);
            disableGame();
        },
        onPlayerLeave: function(playerId) {
            removePlayer(playerId);
        },
        onScore: function(data) {
            gameData.player.data.score = data.score;
            userInterface.updatePlayerScoreCounter(data.score, data.rank);
        },
        onEnduranceInfo: function(endurance) {
            setPlayerEndurance(endurance);
        },
        onWeaponsInfo: function(weapons) {
            gameData.player.data.weapons = weapons;
            var selectedWeaponIndex = weapons.findIndex((w) => w.selected);
            if(selectedWeaponIndex !== -1) {
                setPlayerSelectedWeapon(selectedWeaponIndex);
            }
        },
        onEnduranceItemPickuped: function(data) {
            map.hideEnduranceItem(data.itemId, data.time);
        },
        onWeaponItemPickuped: function(data) {
            map.hideWeaponItem(data.itemId, data.time);
        },
        onForceReload: function() {
            location.reload();
        },
        onEndRound: function(data) {
            setPlayerIsDead(true);
            gameData.player.data.selectedWeaponIndex = 0;
            userInterface.showEndRoundResult(data);
            disableGame();
        }
    }
};

function setPlayerEndurance(endurance) {
    gameData.player.data.endurance = endurance;
    userInterface.updatePlayerEndurancePanels(endurance);
};

function setPlayerIsDead(isDead) {
    gameData.player.data.isDead = isDead;
};

function getGameSavedData(data) {
    return localStorage.gunAndRunData ? JSON.parse(localStorage.gunAndRunData) : null;
};

function setGameSavedData(data) {
    localStorage.gunAndRunData = JSON.stringify(data);
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
    ensurePlayerSelectedWeapon();
};

function ensurePlayerSelectedWeapon() {
    var index = gameData.player.data.selectedWeaponIndex,
        weaponsCount = gameData.player.data.weapons.length;
    (index < 0 || index > weaponsCount - 1) && setPlayerSelectedWeapon(weaponsCount - 1);
    updatePlayerWeaponInterface();
};

function updatePlayerWeaponInterface() {
    userInterface.updatePlayerWeaponPanel(getPlayerSelectedWeapon(), gameData.player.data.weapons.length > 1);
};

function updatePlayerPosition() {
    var player = gameData.player,
        body = player.body,
        moveDirection = controls.getMoveDirection();
    game.physics.arcade.collide(player, map.getWallGroup());
    body.velocity = {x: 0, y: 0};

    spritesFactory.updatePlayerSprite(player, moveDirection, true);
};

function updateOtherPlayersPosition(playersData) {
    var onlinePlayerIds = {};
    if(gameData && playersData) {
        utils.forEachEntryInObject(playersData, function(playerId, playerData) {
            if(playerId !== gameData.player.data.id) {
                var pos = playerData.positionInfo;
                onlinePlayerIds[playerId] = true;
                if(!gameData.players[playerId]) {
                    gameData.players[playerId] = spritesFactory.createPlayer(playerData);
                    gameData.playersGroup.add(gameData.players[playerId]);
                }
                var player = gameData.players[playerId];
                spritesFactory.updatePlayerSprite(player, pos.direction);
                player.x = pos.x;
                player.y = pos.y;
            }
        });
    }
    utils.forEachEntryInObject(gameData.players, function(playerId, player) {
        if(!onlinePlayerIds[playerId] && gameData.player.data.id !== playerId) {
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
    userInterface.updatePlayerInterface(playerData, getPlayerSelectedWeapon(), gameData.player.data.weapons.length > 1);
};


function addShot(data) {
    var player = gameData.players[data.playerId];
    player && (data.weaponName === 'flamethrower' ? addFlamethrowerFlame(data) : addBullets(data));
};

export default {
    getGameSavedData: getGameSavedData,
    instance: game
};