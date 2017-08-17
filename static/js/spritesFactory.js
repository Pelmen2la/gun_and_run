import game from './game.js';
import consts from './consts.js';
import utils from './../../server/Utils.js'
import weapons from './../../server/Weapons.js'
import jointCode from './../../server/JointCode.js'

const flamethrowerFlameSizes = [[8, 11], [10, 13], [16, 16], [32, 32]],
    getSpriteAnimProps = jointCode.getSpriteAnimProps;

function loadResources() {
    var load = game.instance.load.spritesheet.bind(game.instance.load);
    load('hp', consts.SPRITES_PATH +'items/hp.png', 32, 32);
    load('armor', consts.SPRITES_PATH + 'items/armor.png', 32, 32);
    load('ground', consts.TILES_PATH + 'ground.png', 32, 32);
    load('wall', consts.TILES_PATH + 'wall.png', 32, 32);
    load('blank', consts.TILES_PATH + 'blank.png', 1, 1);
    load('greenportal', consts.SPRITES_PATH +'portals/green.png', 33, 52);

    window.characterNames.forEach((n) => load(n, utils.stringFormat('{0}{1}/{2}.png', consts.SPRITES_PATH,  'characters', n), 27, 32));

    for(var key in window.gameLandscapeProperties) {
        var landscapeProps = window.gameLandscapeProperties[key];
        for(var i = 0; i < landscapeProps.groundTilesCount; i++) {
            load(getLandscapeTileName(key, 'ground', i), getLandscapeTileUrl(key, 'ground', i), 32, 32);
        }
        for(var i = 0; i < landscapeProps.wallTilesCount; i++) {
            load(getLandscapeTileName(key, 'wall', i), getLandscapeTileUrl(key, 'wall', i), 32, 32);
        }
    }
    weapons.getWeapons().forEach(function(w) {
        var size = w.bulletSize;
        w.name !== 'flamethrower' && load(w.name + 'bullet', utils.stringFormat('{0}/bullets/{1}.png', consts.TILES_PATH, w.name), size[0], size[1]);
        w.name !== 'pistol' && load(w.name, utils.stringFormat('{0}{1}.png', consts.WEAPONS_SPRITES_FOLDER_PATH, w.name), 32, 32);

        if(w.name === 'flamethrower') {
            for(var i = 0, size; size = flamethrowerFlameSizes[i]; i++) {
                var flameName = getFlamethrowerFlameTileName(i);
                load(flameName, utils.stringFormat('{0}/bullets/{1}.png', consts.TILES_PATH, flameName), size[0], size[1]);
            }
        }
    });
};

function getFlamethrowerFlameTileName(index) {
    return 'flamethrowerflame' + index;
};

function getLandscapeRandomTileName(landscapeType, tileType) {
    var props = window.gameLandscapeProperties[landscapeType],
        tilesCount = props[tileType + 'TilesCount'],
        randomTileIndex = utils.getRandomInt(tilesCount - 1),
        tileIndex = tileType == 'wall' ? randomTileIndex : (utils.getRandomInt(5) === 0 ? randomTileIndex : 0);
    return getLandscapeTileName(landscapeType, tileType, tileIndex);
};

function getLandscapeTileName(landscapeType, tileType, index) {
    return landscapeType + tileType + index;
};

function getLandscapeTileUrl(landscapeType, tileType, index) {
    return utils.stringFormat('{0}{1}/{2}{3}.png', consts.LANDSCAPE_TILES_FOLDER_PATH, landscapeType, tileType, index);
};

function getSprite(name, x, y) {
    var sprite = game.instance.add.sprite(x, y, name);
    game.instance.physics.arcade.enable(sprite);
    sprite.anchor = {x: 0.5, y: 0.5};
    sprite.body.collideWorldBounds = true;
    sprite.body.gravity.y = 0;
    sprite.body.bounce = [0, 0];
    return sprite;
};

function hideSprite(sprite, hideTime) {
    sprite.alpha = 0;
    sprite.body.enable = false;
    window.setTimeout(function() {
        sprite.alpha = 1;
        sprite.body.enable = true;
    }, hideTime);
};

function createPlayer(data) {
    var pos = data.positionInfo,
        player = getSprite(data.characterName, pos.x, pos.y);
    player.data = {
        id: data.id,
        weapons: data.weapons,
        selectedWeaponIndex: 0,
        score: data.score,
        rank: data.rank,
        endurance: data.endurance,
        lookDirection: 'up'
    };

    player.animations.add('up', [0, 1, 2, 3], 10, true);
    player.animations.add('upright', [4, 5, 6, 7], 10, true);
    player.animations.add('right', [16, 17, 18, 19], 10, true);
    player.animations.add('downright', [8, 9, 10, 11], 10, true);
    player.animations.add('down', [12, 13, 14, 15], 10, true);

    return player;
};

function createAnimatedObject(xy, spriteName, framesCount, fps) {
    var framesArr = [],
        obj = getSprite(spriteName, xy.x, xy.y);
    for(var i = 0; i < framesCount; i++) {
        framesArr.push(i);
    }
    obj.animations.add('anim', framesArr, fps, true);
    obj.animations.play('anim');
    return obj;
};

function createItem(data, spriteName, framesCount, fps) {
    var item = createAnimatedObject(data, spriteName, framesCount, fps);
    item.data = {
        id: data.id,
        itemType: data.itemType,
        respawnTime: data.respawnTime
    };
    return item;
};

function createEnduranceItem(data) {
    return createItem(data, data.itemType, 8, 10);
};

function createWeaponItem(data) {
    return createItem(data, data.name, 8, 5);
};

function updatePlayerSprite(player, moveDirection) {
    if(moveDirection) {
        var animProps = getSpriteAnimProps(moveDirection),
            vX = animProps.vX,
            vY = animProps.vY;
        player.animations.currentAnim.name != animProps.anim && player.animations.play(animProps.anim);
        player.body.velocity.x = vX ? vX * consts.PLAYER_VELOCITY : 0;
        player.body.velocity.y = vY ? vY * consts.PLAYER_VELOCITY : 0;
        player.scale.setTo(animProps.flipX ? -1 : 1, animProps.flipY ? -1 : 1);
    } else {
        player.body.velocity.x = 0;
        player.body.velocity.y = 0;
        player.animations.stop();
    }
    updatePlayerDirections(player, moveDirection);
};

function updatePlayerDirections(player, moveDirection) {
    player.data.lookDirection = moveDirection || player.data.lookDirection;
    player.data.moveDirection = moveDirection;
};

function createBullet(data, timeDelta = 0) {
    var pos = data.positionInfo,
        weapon = weapons.getWeaponByName(data.weaponName),
        speed = weapon.bulletSpeed,
        animProps = getSpriteAnimProps(pos.direction),
        baseOffset = getBaseBulletOffset(animProps.vX, animProps.vY),
        x = pos.x + baseOffset.x + (animProps.vX * speed * timeDelta),
        y = pos.y + baseOffset.y + (animProps.vY * speed * timeDelta),
        vX = animProps.vX * speed,
        vY = animProps.vY * speed,
        bullet = getSprite(weapon.name + 'bullet', x, y);
    if(data.deviationAngle) {
        var deviationAngle = data.deviationAngle / 180 * Math.PI;
        vX = vX * Math.cos(deviationAngle) - vY * Math.sin(deviationAngle);
        vY = vY * Math.cos(deviationAngle) + vX * Math.sin(deviationAngle);
    }
    bullet.data = {
        playerId: data.playerId,
        damage: data.damage,
        id: data.bulletId
    };
    bullet.body.velocity.x = vX;
    bullet.body.velocity.y = vY;
    bullet.angle = - animProps.angle;
    weapon.bulletLifeTime && window.setTimeout(bullet.kill.bind(bullet), weapon.bulletLifeTime);
    return bullet;
};

function createFlamethrowerFlame(data, flameIndex) {
    var pos = data.positionInfo,
        animProps = getSpriteAnimProps(pos.direction),
        baseOffset = getBaseBulletOffset(animProps.vX, animProps.vY),
        flameSizes = flamethrowerFlameSizes.slice(0, flameIndex + 1),
        flameXLength = flameSizes.reduce((pV, cV) => pV + cV[0], 0) + flameSizes.length * 3,
        flameYLength = flameSizes.reduce((pV, cV) => pV + cV[1], 0) + flameSizes.length * 3,
        x = pos.x + baseOffset.x * 3 + (flameXLength - flamethrowerFlameSizes[flameIndex][0] / 2) * animProps.vX,
        y = pos.y + baseOffset.y * 3 + (flameYLength - flamethrowerFlameSizes[flameIndex][1] / 2) * animProps.vY,
        flame = getSprite(getFlamethrowerFlameTileName(flameIndex), x, y);
    flame.data = {
        playerId: data.playerId,
        damage: data.damage,
        id: data.id
    };
    return flame;
};

function getBaseBulletOffset(vX, vY) {
    return {
        x: consts.LANDSCAPE_TILE_SIZE / 2 * vX,
        y: consts.LANDSCAPE_TILE_SIZE / 2 * vY
    }
};


export default {
    loadResources: loadResources,
    getSprite: getSprite,
    getLandscapeRandomTileName: getLandscapeRandomTileName,
    hideSprite: hideSprite,
    getSpriteAnimProps: getSpriteAnimProps,
    createPlayer: createPlayer,
    updatePlayerSprite: updatePlayerSprite,
    updatePlayerDirections: updatePlayerDirections,
    createBullet: createBullet,
    createFlamethrowerFlame: createFlamethrowerFlame,
    createEnduranceItem: createEnduranceItem,
    createWeaponItem: createWeaponItem,
    createAnimatedObject: createAnimatedObject
};