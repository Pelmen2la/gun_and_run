var mongoose = require('mongoose'),
    Player = new mongoose.Schema({
        id: String,
        lastLoginTime: Number,
        name: String,
        rank: Number,
        characterName: String
    });

mongoose.model('player', Player);