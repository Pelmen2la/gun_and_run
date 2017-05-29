require('pixi.js');
require('p2');
require('phaser');

import socket from './socket.js'
import spritesFactory from './spritesFactory.js'
import map from './map.js'
import consts from './consts.js';
import controls from './controls.js';
import utils from './../../server/Utils.js'

var gameData = {},
    game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, '', {
        preload: preload,
        create: create,
        update: update
    });

function preload() {
    game.load.spritesheet('beans', 'images/sprites/characters/beans.png', 27, 32);
    game.load.spritesheet('ground', 'images/tiles/ground.png', 32, 32);
    game.load.spritesheet('wall', 'images/tiles/wall.png', 32, 32);
    game.load.spritesheet('bullet', 'images/tiles/bullet.png', 5, 5);
    game.load.spritesheet('blank', 'images/tiles/blank.png', 1, 1);
};

function create() {
    controls.init(getControlsHandlers());
    socket.init(getSocketHandlers(), function() {
        socket.emit('joinRoom');
    });
};

function update() {
    if(gameData && gameData.player) {
        updatePlayerPosition();
        game.physics.arcade.collide(gameData.bulletsGroup, map.getWallGroup(), function(bullet) {
            window.setTimeout(() => gameData.bulletsGroup.remove(bullet, true), 0);
        });
        game.physics.arcade.collide(gameData.bulletsGroup, gameData.playersGroup, function(bullet, player) {
            bullet.data.ownerId == gameData.player.data.id && socket.emit('hit', {
                roomId: gameData.roomId,
                targetId: player.data.id,
                ownerId: bullet.data.ownerId
            });
            bullet.data.ownerId !== player.data.id && window.setTimeout(() => gameData.bulletsGroup.remove(bullet, true), 0);
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
    if(Date.now() - (gameData.player.lastShotTime || 0) > consts.SHOT_TIMEOUT) {
        shot();
    }
};

function shot() {
    socket.emit('shot', {ownerId: gameData.player.data.id, roomId: gameData.roomId});
    var bullet = spritesFactory.createBullet(gameData.player, new Date().getTime(), true);
    gameData.player.lastShotTime = Date.now();
    gameData.bulletsGroup.add(bullet);
};


function getSocketHandlers() {
    return {
        onRoomData: function(data) {
            initData(data);
            window.setInterval(sendPlayerInfo, 100);
            updatePlayerDataPanel();
        },
        onPlayersData: function(data) {
            updateOtherPlayersPosition(data);
        },
        onShot: function(data) {
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
            updatePlayerDataPanel();
        },
        onHp: function(hp) {
            gameData.player.data.hp = hp;
            updatePlayerDataPanel();
        }
    }
};

function sendPlayerInfo() {
    var player = gameData.player;
    socket.emit('playerInfo', {
        roomId: gameData.roomId,
        playerId: player.data.id,
        positionInfo: {
            x: player.x,
            y: player.y,
            moveDirection: player.data.moveDirection
        }
    });
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

function updatePlayerDataPanel() {
    updatePlayerHpPanel(gameData.player.data.hp);
    document.getElementById('PlayerScoreLabel').innerHTML = gameData.player.data.score + ' points';
};

function updatePlayerHpPanel(hp) {
    function getHeartHtml(isSmall) {
        var cls = isSmall ? 'small' : '';
        return '<img class="' + cls + '" src="/images/icons/heart.png" />';
    }

    var hpHeartsHtml = '';
    for(var i = 0; i < hp / 20; i++) {
        hpHeartsHtml += getHeartHtml();
    }
    hp % 20 && (hpHeartsHtml += getHeartHtml(true));
    document.getElementById('PlayerHpBar').innerHTML = hpHeartsHtml;
};

function addShot(data) {
    var ownerId = data.ownerId,
        player = gameData.players[ownerId];
    player && gameData.bulletsGroup.add(spritesFactory.createBullet(player, data.time));
};

export default {
    instance: game
}