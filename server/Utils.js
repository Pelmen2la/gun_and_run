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
    min = min || 0;
    return min + Math.round((max - min) * Math.random());
};

function getRandomArrayMember(arr) {
    return arr[getRandomInt(arr.length - 1)];
};



function flipCoin() {
    return Math.random() < 0.5;
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

function extendObject(obj, props) {
    forEachEntryInObject(props, (key, value) => obj[key] = value);
    return obj;
};

function getObjectClone(obj) {
    var clone = {};
    forEachEntryInObject(obj, (key, value) => clone[key] = value);
    return clone;
};

function createRequest(url, method, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    data && xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function() {
        if(xhr.readyState == 4 && xhr.status == 200) {
            callback(JSON.parse(xhr.responseText));
        }
    };
    xhr.send(data ? 'data=' + JSON.stringify(data) : null);
};

module.exports = {
    getUid: getUid,
    getGuid: getGuid,
    getRandomInt: getRandomInt,
    getRandomArrayMember: getRandomArrayMember,
    flipCoin: flipCoin,
    getNowTime: getNowTime,
    forEachEntryInObject: forEachEntryInObject,
    stringFormat: stringFormat,
    extendObject: extendObject,
    getObjectClone: getObjectClone,
    createRequest: createRequest
};