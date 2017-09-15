var fs = require('fs'),
    path = require('path');

const LANDSCAPE_FOLDER_PATH = path.join(global.appRoot, '/static/images/landscape/'),
    CHARACTERS_GIF_FOLDER_PATH = path.join(global.appRoot, '/static/images/sprites/characters/gif/');

module.exports = function(callback) {
    getLandscapeProperties(function(landscapeProperties) {
        getCharacterNames(function(characterNames) {
            global.characterNames = characterNames;
            global.landscapeProperties = landscapeProperties;
            callback();
        });
    });
};

function getLandscapeProperties(callback) {
    var landscapeProperties = {};
    fs.readdir(LANDSCAPE_FOLDER_PATH, (err, folders) => {
        folders.forEach(folder => {
            landscapeProperties[folder] = {
                groundTilesCount: 0,
                wallTilesCount: 0
            };
            fs.readdirSync(path.join(LANDSCAPE_FOLDER_PATH, folder)).forEach(file => {
                landscapeProperties[folder].groundTilesCount += file.indexOf('ground') != -1;
                landscapeProperties[folder].wallTilesCount += file.indexOf('wall') != -1;
            });
        });
        callback(landscapeProperties);
    });
};

function getCharacterNames(callback) {
    fs.readdir(CHARACTERS_GIF_FOLDER_PATH, (err, files) => {
        characterNames = files.map((f) => f.split('.')[0]);
        callback(characterNames);
    });
};