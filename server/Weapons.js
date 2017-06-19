const pistol = {
        name: 'pistol',
        ammo: Infinity,
        damage: 30,
        bulletSpeed: 500,
        reloadTime: 500,
        bulletSize: [6, 6]
    },
    machinegun = {
        name: 'machinegun',
        ammo: 30,
        damage: 20,
        bulletSpeed: 700,
        reloadTime: 200,
        bulletSize: [5, 5]
    },
    rocketLauncher = {
        name: 'rocketlauncher',
        ammo: 3,
        damage: 80,
        bulletSpeed: 900,
        reloadTime: 3000,
        bulletSize: [10, 8]
    };

function getWeapons() {
    return [pistol, machinegun, rocketLauncher];
};

function getNotStandardWeapons() {
    return getWeapons().filter((w) => w !== pistol);
};

function getWeaponByName(name, partialData) {
    var weapon = getWeapons().find((i) => i.name === name);
    return partialData ? {
        name: weapon.name,
        ammo: weapon.ammo
    } : weapon;
};

module.exports = {
    getWeapons: getWeapons,
    getNotStandardWeapons: getNotStandardWeapons,
    getWeaponByName: getWeaponByName
};