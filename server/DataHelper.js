var utils = require('./Utils'),
    mongoose = require('mongoose'),
    Map = mongoose.model('map');

getMapForPlayer = function(callback) {
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
        tileDimension = 32,
        xDimension = getRandomDimension(),
        yDimension = getRandomDimension();
    for(var x = 0; x < xDimension; x++) {
        for(var y = 0; y < yDimension; y++) {
            tiles.push({
                x: x * tileDimension,
                y: y * tileDimension,
                tileType: Math.random() < 0.05 ? 'wall' : 'ground'
            });
        }
    }

    var map = Map({
        id: utils.getUid(),
        date: new Date(),
        tileDimension: tileDimension,
        dimension: {
            x: xDimension,
            y: yDimension
        },
        tiles: tiles
    });
    map.save(function(err, mapData) {
            callback(mapData.toObject());
        }
    );
};

function getRandomDimension() {
    return Math.round(20 + 20 * Math.random());
};

module.exports = {
    getMapForPlayer: getMapForPlayer
};