var mongoose = require('mongoose'),
    requireTree = require('require-tree'),
    models = requireTree('../models');

module.exports = function (app) {
    mongoose.connect('mongodb://localhost:27017/gun_and_run');
};