var mongoose = require('mongoose'),
    Player = new mongoose.Schema({
        id: String,
        lastLoginTime: Number,
        login: String,
        score: Number,
        characterName: String
    });

mongoose.model('player', Player);