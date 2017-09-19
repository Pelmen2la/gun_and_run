var fs = require('fs'),
    path = require('path');

const LANDSCAPE_FOLDER_PATH = path.join(global.appRoot, '/static/images/landscape/'),
    PORTAL_SPRITES_PATH = path.join(global.appRoot, '/static/images/sprites/portals/'),
    CHARACTERS_GIF_FOLDER_PATH = path.join(global.appRoot, '/static/images/sprites/characters/gif/');

module.exports = function(callback) {
    getLandscapeProperties(function(landscapeProperties) {
        getFileNames(CHARACTERS_GIF_FOLDER_PATH, function(characterNames) {
            getFileNames(PORTAL_SPRITES_PATH, function(portalNames) {
                global.landscapeProperties = landscapeProperties;
                global.characterNames = characterNames;
                global.portalNames = portalNames;
                callback();
            });
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

function getFileNames(path, callback) {
    fs.readdir(path, (err, files) => {
        var names = files.map((f) => f.split('.')[0]);
        callback(names);
    });
};