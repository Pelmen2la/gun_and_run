var utils = require('./Utils');

const pistol = {
        name: 'pistol',
        ammo: Infinity,
        damage: 20,
        bulletSpeed: 500,
        reloadTime: 500,
        bulletSize: [6, 6]
    },
    doublepistol = {
        name: 'doublepistol',
        ammo: 10,
        damage: 25,
        bulletSpeed: 600,
        reloadTime: 450,
        bulletSize: [6, 6],
        bulletsCount: 2
    },
    machinegun = {
        name: 'machinegun',
        ammo: 30,
        damage: 25,
        bulletSpeed: 700,
        reloadTime: 200,
        bulletSize: [5, 5]
    },
    shotgun = {
        name: 'shotgun',
        ammo: 7,
        damage: 30,
        bulletSpeed: 900,
        reloadTime: 700,
        bulletSize: [4, 4],
        bulletsCount: 3,
        bulletLifeTime: 300
    },
    rocketLauncher = {
        name: 'rocketlauncher',
        ammo: 3,
        damage: 80,
        bulletSpeed: 900,
        reloadTime: 3000,
        bulletSize: [10, 8]
    },
    flamethrower = {
        name: 'flamethrower',
        ammo: 30,
        damage: 30,
        bulletSpeed: 700,
        reloadTime: 150
    };

function getWeapons() {
    return [pistol, doublepistol, machinegun, shotgun, rocketLauncher, flamethrower];
};

function getNotStandardWeapons() {
    return getWeapons().filter((w) => w !== pistol);
};

function getWeaponByName(name, partialData) {
    var weapon = getWeapons().find((i) => i.name === name);
    return partialData ? {
        name: weapon.name,
        ammo: weapon.ammo
    } : utils.getObjectClone(weapon);
};

function isWeaponCanShoot(weapon, reloadTimeDiff) {
    return utils.getNowTime() - (weapon.lastShotTime || 0) > getWeaponByName(weapon.name).reloadTime + (reloadTimeDiff || 0);
};

module.exports = {
    getWeapons: getWeapons,
    getNotStandardWeapons: getNotStandardWeapons,
    getWeaponByName: getWeaponByName,
    isWeaponCanShoot: isWeaponCanShoot
};