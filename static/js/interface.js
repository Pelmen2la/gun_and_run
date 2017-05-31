import utils from './../../server/Utils.js'

function updatePlayerInterface(playerData) {
    updatePlayerHpPanel(playerData.endurance.hp);
    updatePlayerArmorPanel(playerData.endurance.armor);
};

function updatePlayerHpPanel(hp) {
    function getHeartHtml(isSmall) {
        var cls = isSmall ? 'small' : '';
        return '<img class="' + cls + '" src="/images/icons/heart.png" />';
    }

    var hpHeartsHtml = '';
    for(var i = 0; i < hp / 20; i++) {
        hpHeartsHtml += getHeartHtml();
    }
    hp % 20 && (hpHeartsHtml += getHeartHtml(true));
    document.getElementById('PlayerHpBar').innerHTML = hpHeartsHtml;
};

function updatePlayerArmorPanel(armorCount) {
    var panel = document.getElementById("PlayerArmorPanel");
    panel.style.display = armorCount ? '' : 'none';
    panel.querySelector('.armor-numbers').innerHTML = getNumberHtml(armorCount);
};

export default {
    updatePlayerInterface: updatePlayerInterface
};

function getNumberHtml(number) {
    function getNumeralHtml(numeral) {
        return '<img src="/images/icons/numbers/' + numeral + '.png" />';
    };
    number = number || 0;
    return number.toString().split('').map(getNumeralHtml).join('');
};
