import game from './game.js';
import touchPosition from 'touch-position';
import touch from 'touches';

var cursors = {},
    touchEmitter = touchPosition.emitter({ element: getMobileStick() }),
    mobileStickDirection = '';

function init(handlers) {
    cursors = game.instance.input.keyboard.createCursorKeys();
    game.instance.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).onHoldCallback = handlers.onShotButtonPress;
    initMobileStick();
};

function initMobileStick() {
    var mobileStick = getMobileStick();

    touchEmitter.on('move', function(e) {
        ensureMobileStickPointerPosition({ x: e.clientX, y: e.clientY });
    });
    touch(mobileStick).on('end', function() {
        resetMobileStickPointerPosition();
    });
};

function getMobileStick() {
    return document.getElementById('MobileStick');
};

function getMobileStickPointer() {
    return document.getElementById('MobileStickPointer');
};

function resetMobileStickPointerPosition() {
    getMobileStickPointer().style = '';
};

function ensureMobileStickPointerPosition(touchPos) {
    var offset = getMobileStickTouchOffset(touchPos),
        pointer = getMobileStickPointer(),
        halfPointerSize = pointer.offsetHeight / 2,
        halfStickSize = getMobileStick().offsetHeight / 2,
        left = halfStickSize - halfPointerSize - offset.x,
        top = halfStickSize - halfPointerSize - offset.y;
    pointer.style = 'left: ' + left + 'px;top:' + top + 'px;';
};

function getElementCenterPos(el) {
    var pos = el.getBoundingClientRect();
    return {
        x: pos.left + el.offsetWidth / 2,
        y: pos.top + el.offsetHeight / 2
    }
};

function getMobileStickOffset() {
    var stickCenter = getElementCenterPos(getMobileStick()),
        stickPointerCenter = getElementCenterPos(getMobileStickPointer());
    return {
        x: stickPointerCenter.x - stickCenter.x,
        y: stickPointerCenter.y - stickCenter.y
    }
};

function getMobileStickTouchOffset(touchPos) {
    var stick = getMobileStick(),
        stickCenter = getElementCenterPos(stick),
        halfStickSize = stick.offsetHeight / 2,
        xDiff = stickCenter.x - touchPos.x,
        yDiff = stickCenter.y - touchPos.y,
        vectorLength = Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));
    if(vectorLength > halfStickSize) {
        xDiff = xDiff * halfStickSize / vectorLength;
        yDiff = yDiff * halfStickSize / vectorLength;
    }
    return {
        x: xDiff,
        y: yDiff
    }
};

function getMobileStickMoveDirection() {
    var offset = getMobileStickOffset();
    if(!Math.trunc(offset.x) && !Math.trunc(offset.y)) {
        return ''
    }
    var angle = Math.abs(Math.atan(offset.y / offset.x) * 180 / Math.PI),
        isLeft = offset.x < 0,
        isTop = offset.y < 0,
        ignoreX = angle > 70,
        ignoreY = angle < 20,
        isDiagonal = !ignoreX && !ignoreY;
    if(isTop && ignoreX) {
        return 'up';
    } else if(isTop && !isLeft && isDiagonal) {
        return 'upright';
    } else if(!isLeft && ignoreY) {
        return 'right';
    } else if(!isTop && !isLeft && isDiagonal) {
        return 'downright';
    } else if(!isTop && ignoreX) {
        return 'down';
    } else if(!isTop && isLeft && isDiagonal) {
        return 'downleft';
    } else if(isLeft && ignoreY) {
        return 'left';
    } else if(isTop && isLeft && isDiagonal) {
        return 'upleft';
    }
    return '';
};


function getMoveDirection() {
    var mobileMoveDirection = getMobileStickMoveDirection();
    if(mobileMoveDirection) {
        return mobileMoveDirection;
    } else if(cursors.up.isDown && cursors.left.isDown) {
        return 'upleft';
    } else if(cursors.up.isDown && cursors.right.isDown) {
        return 'upright';
    } else if(cursors.down.isDown && cursors.left.isDown) {
        return 'downleft';
    } else if(cursors.down.isDown && cursors.right.isDown) {
        return 'downright';
    } else if(cursors.up.isDown) {
        return 'up';
    } else if(cursors.left.isDown) {
        return 'left';
    } else if(cursors.right.isDown) {
        return 'right';
    } else if(cursors.down.isDown) {
        return 'down';
    }
    return '';
};

export default {
    init: init,
    getMoveDirection: getMoveDirection
}