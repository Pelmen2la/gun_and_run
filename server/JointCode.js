function getSpriteAnimProps(moveDirection) {
    moveDirection = moveDirection || 'stand';
    var props = {
        upleft: [-0.7, -0.7, 'upright', true, false, 135],
        upright: [0.7, -0.7, 'upright', false, false, 45],
        downleft: [-0.7, 0.7, 'downright', true, false, 225],
        downright: [0.7, 0.7, 'downright', false, false, 315],
        up: [0, -1, 'up', false, false, 90],
        left: [-1, 0, 'right', true, false, 180],
        right: [1, 0, 'right', false, false, 0],
        down: [0, 1, 'down', false, false, 90],
        stand: [0, 0, 'stand', false, false, 0]
    }[moveDirection];
    return {
        vX: props[0],
        vY: props[1],
        anim: props[2],
        flipX: props[3],
        flipY: props[4],
        angle: props[5]
    }
};

module.exports = {
    getSpriteAnimProps: getSpriteAnimProps
};