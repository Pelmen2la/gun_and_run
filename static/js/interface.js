import utils from './../../server/Utils.js';
import game from './game.js';
import consts from './consts.js';

var gbId = document.getElementById.bind(document),
    selectedCharacterIndex = utils.getRandomInt(window.characterNames.length - 1);

document.addEventListener('DOMContentLoaded', function() {
    var data = game.getGameSavedData();
    gbId('CharacterAvatar').addEventListener('click', function() {
        selectedCharacterIndex = selectedCharacterIndex + 1 > window.characterNames.length - 1 ? 0 : selectedCharacterIndex + 1;
        updateSelectedCharacterAvatar();
    });
    data && utils.createRequest('/player/' + data.playerId, 'GET', null, function(playerData) {
        setDomElementVisibility(gbId('ContinueGameItemsContainer'), !!playerData);
        updateSelectedCharacterAvatar();
        if(playerData) {
            var text = utils.stringFormat('Continue game as <span class="red-text">{0}</span>', playerData.login);
            gbId('ContinueGameButton').innerHTML = text;
        }
    });
});

function setLoginPanelVisibility(isVisible) {
    setDomElementVisibility(gbId('LoginPanel'), isVisible);
};

function setPortalIconVisibility(isVisible) {
    setDomElementVisibility(document.getElementById('PortalIcon'), isVisible);
};

function setGameInterfaceVisibility(isVisible) {
    setDomElementVisibility(gbId('GameInterfaceContainer'), isVisible);
};

function setDomElementVisibility(element, isVisible) {
    element.classList[isVisible ? 'remove' : 'add']('hidden');
};

function addOnLoginAction(fn) {
    var loginInput = gbId('LoginInput'),
        loginFn = function() {
            fn({
                login: loginInput.value,
                characterName: getSelectedCharacterName()
            });
        };
    loginInput.onkeydown = function(e) {
        e.keyCode === 13 && loginFn();
    };
    gbId('StartGameButton').onclick = loginFn;
    gbId('ContinueGameButton').onclick = function() {
        fn({ playerId: game.getGameSavedData().playerId });
    };
};

function getSelectedCharacterName() {
    return window.characterNames[selectedCharacterIndex];
};

function updateSelectedCharacterAvatar() {
    gbId('CharacterAvatar').src = utils.stringFormat('{0}{1}.gif',consts.CHARACTERS_GIFS_PATH, getSelectedCharacterName());
};

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
    gbId('PlayerHpBar').innerHTML = hpHeartsHtml;
};

function updatePlayerWeaponPanel(selectedWeaponData) {
    var panel = gbId('PlayerWeaponBar');
    panel.querySelector('img').src = utils.stringFormat('{0}{1}.png', consts.WEAPONS_ICONS_PATH, selectedWeaponData.name);
    panel.querySelector('.numbers').innerHTML = selectedWeaponData.ammo == null ? '' : getNumberHtml(selectedWeaponData.ammo);
};

function updatePlayerArmorPanel(armorCount) {
    var panel = gbId('PlayerArmorPanel');
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
    addOnLoginAction: addOnLoginAction,
    updatePlayerWeaponPanel: updatePlayerWeaponPanel,
    updatePlayerEndurancePanels: updatePlayerEndurancePanels,
    updatePlayerInterface: updatePlayerInterface,
    setLoginPanelVisibility: setLoginPanelVisibility,
    setGameInterfaceVisibility: setGameInterfaceVisibility,
    setPortalIconVisibility: setPortalIconVisibility
};

