var mongoose = require('mongoose'),
    Map = new mongoose.Schema({
        id: String,
        date: Date,
        tileDimension: Number,
        dimension: {
            x: Number,
            y: Number
        },
        tiles: [{
            tileType: String,
            x: Number,
            y: Number
        }]
    });

mongoose.model('map', Map);