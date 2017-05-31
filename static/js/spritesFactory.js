import game from './game.js';
import consts from './consts.js';

function loadResources() {
    game.instance.load.spritesheet('beans', 'images/sprites/characters/beans.png', 27, 32);
    game.instance.load.spritesheet('hp', 'images/sprites/items/hp.png', 32, 32);
    game.instance.load.spritesheet('armor', 'images/sprites/items/armor.png', 32, 32);
    game.instance.load.spritesheet('ground', 'images/tiles/ground.png', 32, 32);
    game.instance.load.spritesheet('wall', 'images/tiles/wall.png', 32, 32);
    game.instance.load.spritesheet('bullet', 'images/tiles/bullet.png', 5, 5);
    game.instance.load.spritesheet('blank', 'images/tiles/blank.png', 1, 1);
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

function getSpriteAnimProps(moveDirection) {
    var props = {
        upleft: [-0.7, -0.7, 'upright', true, false],
        upright: [0.7, -0.7, 'upright', false, false],
        downleft: [-0.7, 0.7, 'downright', true, false],
        downright: [0.7, 0.7, 'downright', false, false],
        up: [0, -1, 'up', false, false],
        left: [-1, 0, 'right', true, false],
        right: [1, 0, 'right', false, false],
        down: [0, 1, 'down', false, false]
    }[moveDirection];
    return {
        vX: props[0],
        vY: props[1],
        anim: props[2],
        flipX: props[3],
        flipY: props[4]
    }
};

function createPlayer(data) {
    var pos = data.positionInfo,
        player = getSprite('beans', pos.x, pos.y);
    player.data = {
        id: data.id,
        score: 0,
        endurance: data.endurance
    };

    player.animations.add('up', [0, 1, 2, 3], 10, true);
    player.animations.add('upright', [4, 5, 6, 7], 10, true);
    player.animations.add('right', [16, 17, 18, 19], 10, true);
    player.animations.add('downright', [8, 9, 10, 11], 10, true);
    player.animations.add('down', [12, 13, 14, 15], 10, true);

    return player;
};

function createEnduranceItem(data) {
    var item = getSprite(data.itemType, data.x, data.y);
    item.animations.add('rotate', [0, 1, 2, 3, 4, 5, 6, 7], 10, true);
    item.animations.play('rotate');
    item.data = {
        id: data.id,
        itemType: data.itemType,
        respawnTime: data.respawnTime
    };
    return item;
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

function createBullet(owner, time) {
    var timeDelta = (time - new Date().getTime()) / 1000,
        data = {
            ownerId: owner.data.id,
            positionInfo: {
                x: owner.body.x + owner.body.width / 2,
                y: owner.body.y + owner.body.height / 2,
                direction: owner.data.lookDirection
            }
        },
        bullet = createBulletCore(data, timeDelta);
    return bullet;
};

function createBulletCore(data, timeDelta) {
    var pos = data.positionInfo,
        animProps = getSpriteAnimProps(pos.direction),
        x = pos.x + (animProps.vX * consts.BULLET_VELOCITY * timeDelta),
        y = pos.y + (animProps.vY * consts.BULLET_VELOCITY * timeDelta),
        bullet = getSprite('bullet', x, y);
    bullet.data = {
        ownerId: data.ownerId
    };
    bullet.body.velocity.x = animProps.vX * consts.BULLET_VELOCITY;
    bullet.body.velocity.y = animProps.vY * consts.BULLET_VELOCITY;
    return bullet;
};


export default {
    loadResources: loadResources,
    getSprite: getSprite,
    hideSprite: hideSprite,
    getSpriteAnimProps: getSpriteAnimProps,
    createPlayer: createPlayer,
    updatePlayerSprite: updatePlayerSprite,
    updatePlayerDirections: updatePlayerDirections,
    createBullet: createBullet,
    createEnduranceItem: createEnduranceItem
};