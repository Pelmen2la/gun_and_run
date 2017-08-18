var utils = require('./Utils'),
    consts = require('../static/js/consts.js'),
    jointCode = require('./JointCode.js'),
    weapons = require('./Weapons.js'),
    dataHelper = require('./DataHelper');

function addBotToRoom(room) {
    var bot = dataHelper.getNewPlayer(dataHelper.getPlayerSpawnPosition(room.map), null, '', 'alex', true);
    bot.botLastUpdateTime = utils.getNowTime();
    room.players[bot.id] = bot;
    room.bots.push(bot);
};

function processBotsMoves(room) {
    function getDistance(obj0, obj1) {
        return Math.sqrt(Math.pow(obj0.x - obj1.x, 2), Math.pow(obj0.y - obj1.y, 2));
    };
    function getObjectCoordinates(obj) {
        return {
            x: Math.trunc(obj.x / map.tileSize),
            y: Math.trunc(obj.y / map.tileSize)
        }
    };

    var map = room.map,
        now = utils.getNowTime();
    room.bots.forEach((bot) => {
        var timeDiff = (now - bot.botLastUpdateTime) / 1000,
            animProps = jointCode.getSpriteAnimProps(bot.positionInfo.direction),
            target;

        bot.positionInfo.x += consts.PLAYER_VELOCITY * animProps.vX * timeDiff;
        bot.positionInfo.y += consts.PLAYER_VELOCITY * animProps.vY * timeDiff;

        utils.forEachEntryInObject(room.players, (k, p) => {
            if(p !== bot && (!target || getDistance(p.positionInfo, bot.positionInfo) < getDistance(target.positionInfo, bot.positionInfo))) {
                target = p;
            }
        });
        if(target) {
            var botCoords = getObjectCoordinates(bot.positionInfo),
                targetCoords = getObjectCoordinates(target.positionInfo);
            tryDoShot(room.id, bot, botCoords, targetCoords);
            if(now - (bot.ensurePathTime || 0) / 1000 > 1) {
                var path = findPathToTarget(map, botCoords, targetCoords),
                    direction = path.length >= 4 ? getDirectionByCoords(botCoords, path[path.length - 1]) : '';
                bot.positionInfo.direction = direction;
                bot.positionInfo.lookDirection = direction || bot.positionInfo.lookDirection || '';
            } else {
                bot.positionInfo.direction = '';
            }
        }
        bot.ensurePathTime = now;
        bot.botLastUpdateTime = now;


    });
};

function tryDoShot(roomId, bot, botCoords, targetCoords) {
    var weaponsToShoot = bot.weapons.filter((w) => weapons.isWeaponCanShoot(w, 0));
    if(weaponsToShoot.length > 0) {
        var weapon = weaponsToShoot[utils.getRandomInt(weaponsToShoot.length - 1)];
        require('./Socket.js').onSocketShot({
            weaponName: weapon.name,
            bulletId: utils.getUid(),
            roomId: roomId,
            playerId: bot.id,
            positionInfo: {
                x: bot.positionInfo.x,
                y: bot.positionInfo.y,
                direction: getDirectionByCoords(botCoords, targetCoords, true)
            }
        });
    }
};

function findPathToTarget(map, startCoord, targetCoord) {
    function getCoordCode(coords) {
        return utils.stringFormat('{0}-{1}', coords.x, coords.y);
    };
    function forEachShift(point, fn) {
        [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach((s) => {
            var x = point.x + s[0],
                y = point.y + s[1];
            fn(x, y, getCoordCode({ x: x, y: y }));
        });
    };

    var minPoint = map.bordersWidth / map.tileSize - 1, cellCache = {}, pathCellArr = [startCoord];
    cellCache[getCoordCode(startCoord)] = 0;
    if(!map.wallCache) {
        map.wallCache = {};
        map.tiles.forEach((t) => {
            var code = getCoordCode({ x: t.x / map.tileSize, y: t.y / map.tileSize });
            map.wallCache[code] = t.tileType === 'wall';
        });
    }
    while(pathCellArr.length && cellCache[getCoordCode(targetCoord)] === undefined) {
        var newCellArr = [];
        pathCellArr.forEach((c) => {
            forEachShift(c, (x, y, code) => {
                if(cellCache[code] === undefined && x >= minPoint && y >= minPoint && x <= minPoint + map.dimension.x && y <= minPoint + map.dimension.y) {
                    var isWall = map.wallCache[code];
                    if(isWall) {
                        var b = 5;
                    }
                    !isWall && newCellArr.push({x: x, y: y});
                    cellCache[code] = isWall ? -1 : cellCache[getCoordCode({x: c.x, y: c.y})] + 1;
                }
            });
        });
        pathCellArr = newCellArr;
    }
    var path = [targetCoord];
    while(cellCache[getCoordCode(path[path.length - 1])] !== 1 && cellCache[getCoordCode(path[path.length - 1])] !== 0) {
        var lastCell = path[path.length - 1],
            cellFounded = false;
        forEachShift(lastCell, (x, y, code) => {
            if(!cellFounded && cellCache[code] === cellCache[getCoordCode(lastCell)] - 1) {
                cellFounded = true;
                path.push({ x: x, y: y });
            }
        });
        if(!cellFounded) {
            path = [startCoord];
            break;
        }
    }
    return path;
};

function getDirectionByCoords(coords0, coords1, diagonalAllowed) {
    var xDiff = coords1.x - coords0.x,
        yDiff = coords1.y - coords0.y;
    if(diagonalAllowed) {
        if(xDiff > 0 && yDiff < 0) {
            return 'upright';
        } else if(xDiff > 0 && yDiff > 0) {
            return 'downright'
        } else if(xDiff < 0 && yDiff > 0) {
            return 'downleft';
        } else if(xDiff < 0 && yDiff < 0) {
            return 'upleft'
        }
    }
    if(xDiff > 0) {
        return 'right';
    } else if(xDiff < 0) {
        return 'left';
    } else if(yDiff > 0) {
        return 'down'
    } else if(yDiff < 0) {
        return 'up';
    }
    return '';
};


module.exports = {
    addBotToRoom: addBotToRoom,
    processBotsMoves: processBotsMoves
};