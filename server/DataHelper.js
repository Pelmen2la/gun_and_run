'use strict'

var utils = require('./Utils'),
    weapons = require('./Weapons'),
    path = require('path'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    Map = mongoose.model('map'),
    Player = mongoose.model('player');

const RANK_LIMIT = 10000;

function getPlayer(id, callback) {
    Player.find({ id: id }, (err, data) => {
        var player = err || data.length === 0 ? null : data[0];
        if(player) {
            player.lastLoginTime = utils.getNowTime();
            player.save();
            getPlayerRank(id, (rank) => {
                player.set('rank', rank);
                callback(player);
            });
        } else {
            callback(player);
        }
    });
};

function setPlayerData(playerId, data, callback) {
    getPlayer(playerId, (p) => {
        p && utils.forEachEntryInObject(data, (k, v) => p.set(k, v));
        p && p.save();
        callback();
    })
};


function getPlayerNewGameData(id, position, socketId, callback) {
    getPlayer(id, function(playerData) {
        playerData = playerData && extendPlayerWithNewGameData(playerData.toObject(), position, socketId);
        callback(playerData);
    });
};

function getNewPlayer(position, socketId, login, characterName, isBot) {
    var player = {
        id: utils.getUid(),
        score: 0,
        rank: RANK_LIMIT,
        login: login || getGuestLogin(),
        characterName: characterName,
        lastLoginTime: utils.getNowTime(),
        isBot: isBot
    };
    (new Player(player)).save();
    extendPlayerWithNewGameData(player, position, socketId);
    return player;
};

function extendPlayerWithNewGameData(player, position, socketId) {
    var props = {
        socketId: socketId,
        lastUpdateTime: utils.getNowTime(),
        idDead: false,
        score: 0,
        weapons: getPlayerStartWeapons(),
        endurance: {
            hp: 100,
            armor: 0
        },
        positionInfo: {
            x: position.x,
            y: position.y,
            moveDirection: ''
        }
    };
    utils.forEachEntryInObject(props, (key, data) => player[key] = data);
    return player;
};

function getPlayerStartWeapons() {
    return [weapons.getWeaponByName('pistol', true)];
};

function getPlayerRank(playerId, callback) {
    Player.find(null, null, { sort: { score: -1 }, limit: RANK_LIMIT }, function(err, players) {
        var index = players.indexOf(players.filter((p) => p.get('id') == playerId)[0]);
        callback(index === -1 ? RANK_LIMIT : index);
    });
};

function getGuestLogin() {
    return 'Guest_' + utils.getUid();
};

function getNewMap(callback) {
    var tiles = [],
        enduranceItems = [],
        weaponItems = [],
        wallsCache = {},
        tileSize = 32,
        bordersWidth = tileSize * 6,
        xDimension = getRandomDimension(),
        yDimension = getRandomDimension(),
        getBaseTileData = function(x, y, offsetX, offsetY) {
            return {
                x: bordersWidth + x * tileSize - (offsetX || 0),
                y: bordersWidth + y * tileSize - (offsetY || 0)
            }
        },
        getItemTileData = function(x, y) {
            var data = getBaseTileData(x, y,  tileSize / 2,  tileSize / 2);
            data.id = utils.getUid();
            data.lastPickupTime = 0;
            return data;
        },
        getCoordsStringCode = function(x, y) {
            return utils.stringFormat('{0}-{1}', x, y);
        };

    for(var x = 0; x < xDimension; x++) {
        for(var y = 0; y < yDimension; y++) {
            var tile = getBaseTileData(x, y);
            tile.tileType = Math.random() < 0.05 ? 'wall' : 'ground';
            tiles.push(tile);
            wallsCache[getCoordsStringCode(x, y)] = tile.tileType === 'wall';
        }
    }

    var itemSectorsCount = [utils.getRandomInt(3, 2), utils.getRandomInt(3, 2)],
        sectorXSize = Math.round(xDimension / itemSectorsCount[0]),
        sectorYSize = Math.round(yDimension / itemSectorsCount[1]),
        isNearWall = function(x, y) {
            for(var i = -1; i <= 1; i++) {
                for(var j = -1; j <= 1; j++) {
                    if(wallsCache[getCoordsStringCode(x + i, y + j)]) {
                        return true;
                    }
                }
            }
            return false;
        },
        isNearBorder = function(x, y) {
            return x <= 2 || y <= 2 || x >= xDimension - 2 || y >= yDimension - 2;
        },
        isNearBarrier = function(pos) {
            return !pos || isNearWall(pos[0], pos[1]) || isNearBorder(pos[0], pos[1]);
        };

    for(var i = 0; i < itemSectorsCount[0]; i++) {
        for(var j = 0; j < itemSectorsCount[1]; j++) {
            let itemPos;
            while(isNearBarrier(itemPos)) {
                itemPos = [utils.getRandomInt((i + 1) * sectorXSize, i * sectorXSize),
                            utils.getRandomInt((j + 1) * sectorYSize, j * sectorYSize)];
            };
            var item = getItemTileData(itemPos[0], itemPos[1]);
            if(utils.flipCoin()) {
                item.itemType = utils.flipCoin() ? 'armor' : 'hp';
                item.respawnTime = 10000;
                enduranceItems.push(item);
            } else {
                var weaponsArr = weapons.getNotStandardWeapons(),
                    randomWeapon = weaponsArr[utils.getRandomInt(weaponsArr.length - 1)];
                item.name = randomWeapon.name;
                item.respawnTime = 10000;
                weaponItems.push(item);
            }
        }
    }

    var portalPos;
    while(isNearBarrier(portalPos)) {
        portalPos = [utils.getRandomInt(xDimension), utils.getRandomInt(yDimension)];
    }

    fs.readdir(path.join(global.appRoot, '/static/images/landscape/'), (err, folders) => {
        var map = Map({
            id: utils.getUid(),
            date: new Date(),
            landscapeType: folders[utils.getRandomInt(folders.length - 1)],
            tileSize: tileSize,
            bordersWidth: bordersWidth,
            dimension: {
                x: xDimension,
                y: yDimension
            },
            tiles: tiles,
            enduranceItems: enduranceItems,
            weaponItems: weaponItems,
            portal: getBaseTileData(portalPos[0], portalPos[1], 33 / 2, 55 / 2)
        });
        map.save((err, mapData) => {
                callback(mapData.toObject());
            }
        );
    });
};

function getPlayerSpawnPosition(map) {
    var groundTiles = map.tiles.filter(function(tile) {
            return tile.tileType === 'ground';
        }),
        playerStartTile = groundTiles[utils.getRandomInt(groundTiles.length - 1)];
    return {x: playerStartTile.x + map.tileSize / 2, y: playerStartTile.y + map.tileSize / 2};
};

function getRandomDimension() {
    return Math.round(30 + 20 * Math.random());
};

module.exports = {
    getNewMap: getNewMap,
    getNewPlayer: getNewPlayer,
    getPlayer: getPlayer,
    getPlayerStartWeapons: getPlayerStartWeapons,
    getPlayerRank: getPlayerRank,
    setPlayerData: setPlayerData,
    getPlayerNewGameData: getPlayerNewGameData,
    getPlayerSpawnPosition: getPlayerSpawnPosition
};