function getUid() {
    function getPart() {
        var part = (Math.random() * 46656) | 0;
        return ("000" + part.toString(36)).slice(-3);
    }
    return getPart() + getPart();
};

function getGuid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
};

function getRandomInt(max, min) {
    return (min || 0) + Math.round(max * Math.random());
};

function forEachEntryInObject(o, callback) {
    for(var key in o) {
        if(o.hasOwnProperty(key)) {
            callback(key, o[key]);
        }
    }
};

function getNowTime() {
    return new Date().getTime();
};


function stringFormat(str, args) {
    for(var i = 1; i < arguments.length; i++) {
        str = str.replace('{' + (i - 1) + '}', arguments[i]);
    }
    return str;
};

module.exports = {
    getUid: getUid,
    getGuid: getGuid,
    getRandomInt: getRandomInt,
    getNowTime: getNowTime,
    forEachEntryInObject: forEachEntryInObject,
    stringFormat: stringFormat
};