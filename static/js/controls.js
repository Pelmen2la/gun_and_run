import game from './game.js';
import touchPosition from 'touch-position';
import touch from 'touches';

var cursors = {},
    isControlsEnabled = false,
    mobileStickDirection = '',
    wKey, dKey, sKey, aKey;

function init(handlers) {
    document.documentElement.className.indexOf('mobile') > -1 ? initTouchControls(handlers) : initKeyboard(handlers);
};

function initKeyboard(handlers) {
    var keyboard = game.instance.input.keyboard;
    cursors = keyboard.createCursorKeys();
    keyboard.addKey(Phaser.Keyboard.SPACEBAR).onHoldCallback = handlers.onShotButtonPress;
    keyboard.addKey(Phaser.Keyboard.R).processKeyDown = prepareHandler(handlers.onPortalButtonDown);
    keyboard.addKey(Phaser.Keyboard.E).processKeyDown = prepareHandler(handlers.onChangeWeaponButtonDown, [true]);
    keyboard.addKey(Phaser.Keyboard.Q).processKeyDown = prepareHandler(handlers.onChangeWeaponButtonDown, [false]);
    wKey = keyboard.addKey(Phaser.Keyboard.W);
    dKey = keyboard.addKey(Phaser.Keyboard.D);
    sKey = keyboard.addKey(Phaser.Keyboard.S);
    aKey = keyboard.addKey(Phaser.Keyboard.A);
};

function initTouchControls(handlers) {
    initMobileStick();
    initMobileShotButton(prepareHandler(handlers.onShotButtonPress));
    touch(document.getElementById('PortalIcon')).on('start', prepareHandler(handlers.onPortalButtonDown));
    touch(document.getElementById('PrevWeaponIcon')).on('start', prepareHandler(handlers.onChangeWeaponButtonDown, [false]));
    touch(document.getElementById('NextWeaponIcon')).on('start', prepareHandler(handlers.onChangeWeaponButtonDown, [true]));
};

function setControlsEnabled(enabled) {
    isControlsEnabled = enabled;
};

function prepareHandler(handler, args) {
    return function() {
        isControlsEnabled && handler.apply(this, args);
    };
};

function initMobileShotButton(shotFn) {
    var mobileShotButton = document.getElementById('MobileShotButton'),
        buttonTouch = touch(mobileShotButton),
        mobileShotTimeoutId = null;
    buttonTouch.on('start', function() {
        mobileShotTimeoutId = window.setInterval(shotFn, 50);
    });
    buttonTouch.on('end', function() {
        window.clearInterval(mobileShotTimeoutId);
    });
};

function initMobileStick() {
    var mobileStick = getMobileStick(),
        emitter = touchPosition.emitter({ element: mobileStick });

    emitter.on('move', function(e) {
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
    if(!isControlsEnabled) {
        return ''
    }
    var mobileMoveDirection = getMobileStickMoveDirection();
    window.c = cursors;
    if(mobileMoveDirection) {
        return mobileMoveDirection;
    } else if((cursors.up.isDown && cursors.left.isDown) || (wKey.isDown && aKey.isDown)) {
        return 'upleft';
    } else if((cursors.up.isDown && cursors.right.isDown) || (wKey.isDown && dKey.isDown)) {
        return 'upright';
    } else if((cursors.down.isDown && cursors.left.isDown) || (sKey.isDown && aKey.isDown)) {
        return 'downleft';
    } else if((cursors.down.isDown && cursors.right.isDown) || (sKey.isDown && dKey.isDown)) {
        return 'downright';
    } else if(cursors.up.isDown || wKey.isDown) {
        return 'up';
    } else if(cursors.left.isDown || aKey.isDown) {
        return 'left';
    } else if(cursors.right.isDown || dKey.isDown) {
        return 'right';
    } else if(cursors.down.isDown || sKey.isDown) {
        return 'down';
    }
    return '';
};

export default {
    init: init,
    initKeyboard: initKeyboard,
    setControlsEnabled: setControlsEnabled,
    getMoveDirection: getMoveDirection
}