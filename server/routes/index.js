var fs = require('fs'),
    path = require('path'),
    MobileDetect = require('mobile-detect'),
    landscapeProperties = {};

const LANDSCAPE_FOLDER_PATH = path.join(global.appRoot, '/static/images/landscape/');

module.exports = function(app) {
    app.get('/', function(req, res) {
        getLandscapeProperties(function(landscapeProperties) {
            fs.readFile(path.join(global.appRoot, '/static/html/app.html'), 'utf8', function(err, indexPageHtml) {
                var isMobile = (new MobileDetect(req.headers['user-agent'])).mobile();
                indexPageHtml = indexPageHtml.replace('{{IS_MOBILE_CLASS}}', isMobile ? 'mobile' : '');
                indexPageHtml = indexPageHtml.replace('{{GAME_LANDSCAPE_PROPERTIES}}', JSON.stringify(landscapeProperties));
                res.send(indexPageHtml);
            });
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