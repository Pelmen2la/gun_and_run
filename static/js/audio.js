import game from './game.js';
import consts from './consts.js';
import utils from './../../server/Utils.js'
import weapons from './../../server/Weapons.js'

var shotSounds = {};

function loadResources() {
    var load = game.instance.load.audio.bind(game.instance.load);
    weapons.getWeapons().forEach((w) => {
        load(w.name, utils.stringFormat('{0}{1}/{2}.wav', consts.AUDIO_PATH, 'weapons', w.name));
    });
};

function playWeaponShot(name, decrease) {
    if(!shotSounds[name]) {
        shotSounds[name] = game.instance.add.audio(name);
    }
    shotSounds[name].volume  = 0.2 * decrease;
    shotSounds[name].play();
};

export default {
    loadResources: loadResources,
    playWeaponShot: playWeaponShot
};