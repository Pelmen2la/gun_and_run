var mongoose = require('mongoose'),
    Map = new mongoose.Schema({
        id: String,
        date: Date,
        tileDimension: Number,
        bordersWidth: Number,
        dimension: {
            x: Number,
            y: Number
        },
        tiles: [{
            tileType: String,
            x: Number,
            y: Number
        }],
        enduranceItems: [{
            id: String,
            itemType: String,
            respawnTime: Number,
            lastPickupTime: Number,
            x: Number,
            y: Number
        }]
    });

mongoose.model('map', Map);