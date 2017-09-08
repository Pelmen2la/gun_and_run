var fs = require('fs'),
    path = require('path'),
    MobileDetect = require('mobile-detect'),
    dataHelper = require('./../DataHelper'),
    socket = require('./../Socket'),
    characterNames = [],
    landscapeProperties = {};

const LANDSCAPE_FOLDER_PATH = path.join(global.appRoot, '/static/images/landscape/'),
    CHARACTERS_GIF_FOLDER_PATH = path.join(global.appRoot, '/static/images/sprites/characters/gif/');

module.exports = function(app) {
    app.get('/', function(req, res) {
        getLandscapeProperties(function(landscapeProperties) {
            getCharacterNames(function(characterNames) {
                fs.readFile(path.join(global.appRoot, '/static/html/app.html'), 'utf8', function(err, indexPageHtml) {
                    var isMobile = (new MobileDetect(req.headers['user-agent'])).mobile();
                    indexPageHtml = indexPageHtml.replace('{{IS_MOBILE_CLASS}}', isMobile ? 'mobile' : '');
                    indexPageHtml = indexPageHtml.replace('{{GAME_LANDSCAPE_PROPERTIES}}', JSON.stringify(landscapeProperties));
                    indexPageHtml = indexPageHtml.replace('{{GAME_CHARACTER_NAMES}}', JSON.stringify(characterNames));
                    res.send(indexPageHtml);
                });
            });
        });
    });

    app.get('/player/:id/', function(req, res) {
        dataHelper.getPlayer(req.params.id, function(data) {
            res.send(data);
        });
    });

    app.get('/debug/', function(req, res) {
        fs.readFile(path.join(global.appRoot, '/static/html/debug.html'), 'utf8', function(err, debugPageHtml) {
            debugPageHtml = debugPageHtml.replace('{{ROOMS_DATA}}', JSON.stringify(socket.getRooms()));
            res.send(debugPageHtml);
        });
    });
};

function getLandscapeProperties(callback) {
    Object.keys(landscapeProperties).length ? callback(landscapeProperties) :
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
    characterNames.length ? callback(characterNames) :
        fs.readdir(CHARACTERS_GIF_FOLDER_PATH, (err, files) => {
            characterNames = files.map((f) => f.split('.')[0]);
            callback(characterNames);
        });
};