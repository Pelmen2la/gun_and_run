import utils from './../../server/Utils.js'
import consts from './consts.js';

function updatePlayerInterface(playerData, selectedWeaponData) {
    updatePlayerEndurancePanels(playerData);
    updatePlayerWeaponPanel(selectedWeaponData);
};

function updatePlayerEndurancePanels(playerData) {
    updatePlayerHpPanel(playerData.endurance.hp);
    updatePlayerArmorPanel(playerData.endurance.armor);
};

function updatePlayerHpPanel(hp) {
    function getHeartHtml(isSmall) {
        var cls = isSmall ? 'small' : '';
        return utils.stringFormat('<img class="{0}" src="{1}heart.png" />', cls, consts.ICONS_PATH);
    }

    var hpHeartsHtml = '';
    for(var i = 0; i < hp / 20; i++) {
        hpHeartsHtml += getHeartHtml();
    }
    hp % 20 && (hpHeartsHtml += getHeartHtml(true));
    document.getElementById('PlayerHpBar').innerHTML = hpHeartsHtml;
};

function updatePlayerWeaponPanel(selectedWeaponData) {
    var panel = document.getElementById('PlayerWeaponBar');
    panel.querySelector('img').src = utils.stringFormat('{0}{1}.png', consts.WEAPONS_ICONS_PATH, selectedWeaponData.name);
    panel.querySelector('.numbers').innerHTML = selectedWeaponData.ammo == null ? '' : getNumberHtml(selectedWeaponData.ammo);
};

function updatePlayerArmorPanel(armorCount) {
    var panel = document.getElementById('PlayerArmorPanel');
    panel.style.display = armorCount ? '' : 'none';
    panel.querySelector('.numbers').innerHTML = getNumberHtml(armorCount);
};

function getNumberHtml(number) {
    function getNumeralHtml(numeral) {
        return utils.stringFormat('<img src="{0}{1}.png" />', consts.NUMBER_ICONS_PATH, numeral);
    };
    number = number || 0;
    return number.toString().split('').map(getNumeralHtml).join('');
};

export default {
    updatePlayerWeaponPanel: updatePlayerWeaponPanel,
    updatePlayerEndurancePanels: updatePlayerEndurancePanels,
    updatePlayerInterface: updatePlayerInterface
};

