var utils = require('./Utils'),
    weapons = require('./Weapons'),
    path = require('path'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    Map = mongoose.model('map');

function getNewPlayer(position, socketId) {
    return {
        id: utils.getUid(),
        score: 0,
        socketId: socketId,
        lastUpdateTime: utils.getNowTime(),
        idDead: false,
        weapons: [weapons.getWeaponByName('pistol', true)],
        endurance: {
            hp: 100,
            armor: 0
        },
        positionInfo: {
            x: position.x,
            y: position.y,
            moveDirection: ''
        }
    }
};

function getMapForPlayer(callback) {
    Map.remove({}, function() {
        Map.findOne({}, function(err, mapData) {
            if(!mapData) {
                generateNewMap(callback);
            } else {
                callback(mapData.toObject())
            }
        });
    });
};

function generateNewMap(callback) {
    var tiles = [],
        enduranceItems = [],
        weaponItems = [],
        tileDimension = 32,
        bordersWidth = tileDimension * 6,
        xDimension = getRandomDimension(),
        yDimension = getRandomDimension(),
        getBaseTileData = function(x, y, withOffset) {
            var offset = withOffset ? tileDimension / 2 : 0;
            return {
                x: bordersWidth + x * tileDimension - offset,
                y: bordersWidth + y * tileDimension - offset
            }
        },
        getItemTileData = function(x, y, withOffset) {
            var data = getBaseTileData(x, y, withOffset);
            data.id = utils.getUid();
            data.lastPickupTime = 0;
            return data;
        };
    for(var x = 0; x < xDimension; x++) {
        for(var y = 0; y < yDimension; y++) {
            var tile = getBaseTileData(x, y, false);
            tile.tileType = Math.random() < 0.05 ? 'wall' : 'ground';
            tiles.push(tile);

            var isNearBorders = x <= 2 || y <= 2 || x >= xDimension -2 || y >= yDimension - 2,
                checkIsItemNear = function(x, y, items) {
                    return items.find(function(item) {
                        return Math.abs(item.x / tileDimension - x) < utils.getRandomInt(10, 20)
                            && Math.abs(item.y / tileDimension - y) < utils.getRandomInt(10, 20);
                    });
                },
                isEnduranceItemNear = checkIsItemNear(x, y, enduranceItems),
                isWeaponItemNear = checkIsItemNear(x, y, weaponItems),
                canCreateItem = !isNearBorders && tile.tileType !== 'wall' && !isEnduranceItemNear && !isWeaponItemNear;
            if(canCreateItem && Math.random() < 0.05) {
                var item = getItemTileData(x, y, true);
                item.itemType = Math.random() < 0.5 ? 'armor' : 'hp';
                item.respawnTime = 10000;
                enduranceItems.push(item);
            } else if(canCreateItem && Math.random() < 0.05) {
                var item = getItemTileData(x, y, true),
                    weaponsArr = weapons.getNotStandardWeapons(),
                    randomWeapon = weaponsArr[utils.getRandomInt(weaponsArr.length - 1)];
                item.name = randomWeapon.name;
                item.respawnTime = 10000;
                weaponItems.push(item);
            }
        }
    };

    fs.readdir(path.join(global.appRoot, '/static/images/landscape/'), (err, folders) => {
        var map = Map({
            id: utils.getUid(),
            date: new Date(),
            landscapeType: folders[utils.getRandomInt(folders.length - 1)],
            tileDimension: tileDimension,
            bordersWidth: bordersWidth,
            dimension: {
                x: xDimension,
                y: yDimension
            },
            tiles: tiles,
            enduranceItems: enduranceItems,
            weaponItems: weaponItems
        });
        map.save((err, mapData) => {
                callback(mapData.toObject());
            }
        );
    });
};

function getRandomDimension() {
    return Math.round(30 + 20 * Math.random());
};

module.exports = {
    getMapForPlayer: getMapForPlayer,
    getNewPlayer: getNewPlayer
};