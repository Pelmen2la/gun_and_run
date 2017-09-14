import game from './game.js';
import spritesFactory from './spritesFactory.js';
import utils from './../../server/Utils.js'

var groundGroup, wallGroup, enduranceItemsGroup, weaponItemsGroup, portal;

function drawMap(mapData) {
    var borderW = mapData.bordersWidth;
    groundGroup = game.instance.add.group();
    wallGroup = game.instance.add.group();
    wallGroup.enableBody = true;
    enduranceItemsGroup = game.instance.add.group();
    weaponItemsGroup = game.instance.add.group();
    mapData.tiles.forEach(function(tile) {
        var isWall = tile.tileType == 'wall',
            tileName = spritesFactory.getLandscapeRandomTileName(mapData.landscapeType, tile.tileType),
            tile = (isWall ? wallGroup : groundGroup).create(tile.x, tile.y, tileName);
        tile.body && (tile.body.immovable = isWall);
    });

    mapData.enduranceItems.forEach(function(item) {
        enduranceItemsGroup.add(spritesFactory.createEnduranceItem(item));
    });
    mapData.weaponItems.forEach(function(item) {
        weaponItemsGroup.add(spritesFactory.createWeaponItem(item));
    });
    portal = spritesFactory.createAnimatedObject({ x: mapData.portal.x, y: mapData.portal.y }, 'greenportal', 8, 5);

    var worldWidth = borderW * 2 + mapData.tileSize * mapData.dimension.x,
        worldHeight = borderW * 2 + mapData.tileSize * mapData.dimension.y,
        screenWidth = Math.min(worldWidth, window.innerWidth),
        screenHeight= Math.min(worldHeight, window.innerHeight),
        mainContainer = document.getElementById('MainContainer');

    game.instance.scale.setGameSize(screenWidth, screenHeight);
    mainContainer.style.width = screenWidth + 'px';
    mainContainer.style.height = screenHeight + 'px';

    [[0, 0, worldWidth, borderW], [0, 0, borderW, worldHeight], [worldWidth - borderW, 0, borderW, worldHeight],
        [0, worldHeight - borderW, worldWidth, borderW]].forEach(function(params) {
            createBorder(params[0], params[1], params[2], params[3]);
        });
    game.instance.world.setBounds(0, 0, worldWidth, worldHeight);
};

function createBorder(x, y, width, height) {
    var border = game.instance.add.tileSprite(x, y, width, height, 'blank');
    game.instance.physics.enable([border], Phaser.Physics.ARCADE);
    border.body.immovable = true;
    wallGroup.add(border);
};

function getWallGroup() {
    return wallGroup;
};

function getEnduranceItemsGroup() {
    return enduranceItemsGroup;
};

function getWeaponItemsGroup() {
    return weaponItemsGroup;
};

function getPortal() {
    return portal;
};

function hideItem(itemGroup, itemId, startHideTime) {
    var item = itemGroup.children.find((item) => item.data.id === itemId);
    item && spritesFactory.hideSprite(item, item.data.respawnTime - (utils.getNowTime() - startHideTime));
};

function hideEnduranceItem(id, startHideTime) {
    hideItem(getEnduranceItemsGroup(), id, startHideTime);
};

function hideWeaponItem(id, startHideTime) {
    hideItem(getWeaponItemsGroup(), id, startHideTime);
};

export default {
    drawMap: drawMap,
    getWallGroup: getWallGroup,
    getEnduranceItemsGroup: getEnduranceItemsGroup,
    getPortal: getPortal,
    hideEnduranceItem: hideEnduranceItem,
    getWeaponItemsGroup: getWeaponItemsGroup,
    hideWeaponItem: hideWeaponItem
};