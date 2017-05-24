import game from './game.js'

var groundGroup, wallGroup;

function drawMap(mapData) {
    groundGroup = game.instance.add.group();
    wallGroup = game.instance.add.group();
    wallGroup.enableBody = true;
    mapData.tiles.forEach(function(tile) {
        var isWall = tile.tileType == 'wall',
            tile = (isWall ? wallGroup : groundGroup).create(tile.x, tile.y, tile.tileType);
        tile.body && (tile.body.immovable = isWall);
    });

    var worldWidth = mapData.tileDimension * mapData.dimension.x,
        worldHeight = mapData.tileDimension * mapData.dimension.y;

    [[1, 1, worldWidth, 1], [1, 1, 1, worldHeight], [worldWidth - 1, 1, 1, worldHeight],
        [1, worldHeight - 1, worldWidth, 1]].forEach(function(params) {
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
}

export default {
    drawMap: drawMap,
    getWallGroup: getWallGroup
};