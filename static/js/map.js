import game from './game.js';
import spritesFactory from './spritesFactory.js';
import utils from './../../server/Utils.js'

var groundGroup, wallGroup, enduranceItemsGroup;

function drawMap(mapData) {
    var borderW = mapData.bordersWidth;
    groundGroup = game.instance.add.group();
    wallGroup = game.instance.add.group();
    wallGroup.enableBody = true;
    enduranceItemsGroup = game.instance.add.group();
    mapData.tiles.forEach(function(tile) {
        var isWall = tile.tileType == 'wall',
            tile = (isWall ? wallGroup : groundGroup).create(tile.x, tile.y, tile.tileType);
        tile.body && (tile.body.immovable = isWall);
    });

    mapData.enduranceItems.forEach(function(item) {
        enduranceItemsGroup.add(spritesFactory.createEnduranceItem(item));
    });

    var worldWidth = borderW * 2 + mapData.tileDimension * mapData.dimension.x,
        worldHeight = borderW * 2 + mapData.tileDimension * mapData.dimension.y;

    [[0, borderW - 1, worldWidth, 1], [borderW, 0, 1, worldHeight], [worldWidth - borderW, 0, 1, worldHeight],
        [borderW, worldHeight - borderW, worldWidth, 1]].forEach(function(params) {
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

function hideEnduranceItem(id, startHideTime) {
    var item = getEnduranceItemsGroup().children.find((item) => item.data.id === id);
    item && spritesFactory.hideSprite(item, item.data.respawnTime - (utils.getNowTime() - startHideTime));
};

export default {
    drawMap: drawMap,
    getWallGroup: getWallGroup,
    getEnduranceItemsGroup: getEnduranceItemsGroup,
    hideEnduranceItem: hideEnduranceItem
};