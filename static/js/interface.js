import utils from './../../server/Utils.js';
import game from './game.js';
import consts from './consts.js';

var gbId = document.getElementById.bind(document),
    selectedCharacterIndex = utils.getRandomInt(window.characterNames.length - 1);

const DEATH_SCREEN_CLICK_TIMEOUT = 1000;

document.addEventListener('DOMContentLoaded', function() {
    var data = game.getGameSavedData(),
        rotateCharacter = function(isNext) {
            selectedCharacterIndex += isNext ? 1 : -1;
            if(selectedCharacterIndex < 0) {
                selectedCharacterIndex = window.characterNames.length - 1;
            }
            if(!window.characterNames[selectedCharacterIndex]) {
                selectedCharacterIndex = 0;
            }
            updateSelectedCharacterAvatar();
        };
    gbId('CharacterSelectionLeftArrow').addEventListener('click', function() {
        rotateCharacter(false);
    });
    gbId('CharacterSelectionRightArrow').addEventListener('click', function() {
        rotateCharacter(true);
    });
    setDomElementVisibility(gbId('LoadingMask'), false);
    data && utils.createRequest('/player/' + data.playerId, 'GET', null, function(playerData) {
        setDomElementVisibility(gbId('ContinueGameItemsContainer'), !!playerData);
        updateSelectedCharacterAvatar();
        if(playerData) {
            var text = utils.stringFormat('Continue game as <span class="red-text">{0}</span>', playerData.name);
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

function setDeathScreenVisibility(isVisible) {
    setDomElementVisibility(gbId('DeathScreen'), isVisible);
};

function showEndRoundResult(data) {
    var screen = gbId('EndRoundScreen');
    screen.querySelector('.winner-name').innerHTML = data.topTen[0].name;
    screen.querySelector('.top-ten-container').innerHTML = data.topTen.map((p, i) => {
        return utils.stringFormat('<li>' +
            '<span class="player-name">{0}. {1}</span>' +
            '<span class="player-score">{2}</span>' +
            '</li>', i + 1, p.name, p.score);
    }).join('');
    ['score', 'rank'].forEach((prop) => screen.querySelector('.' + prop).innerHTML = data[prop]);
    setDomElementVisibility(screen, true);
};

function hideAllFullscreenMessages() {
    document.querySelectorAll('.fullscreen').forEach((e) => setDomElementVisibility(e, false));
};

function setDomElementVisibility(element, isVisible) {
    element.classList[isVisible ? 'remove' : 'add']('hidden');
};

function addOnLoginAction(fn) {
    var loginInput = gbId('LoginInput'),
        loginFn = function() {
            fn({
                name: loginInput.value,
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

function addOnDeathScreenClickAction(fn) {
    gbId('DeathScreen').addEventListener('click', fn);
};

function bindJoinGameFunctionToElements(fn) {
    gbId('DeathScreen').addEventListener('click', fn);
    gbId('EndRoundScreen').addEventListener('click', fn);
};

function getSelectedCharacterName() {
    return window.characterNames[selectedCharacterIndex];
};

function updateSelectedCharacterAvatar() {
    gbId('CharacterAvatar').src = utils.stringFormat('{0}{1}.gif',consts.CHARACTERS_GIFS_PATH, getSelectedCharacterName());
};

function updatePlayerInterface(playerData, selectedWeaponData, hasMutipleWeapons) {
    updatePlayerEndurancePanels(playerData.endurance);
    updatePlayerWeaponPanel(selectedWeaponData, hasMutipleWeapons);
    updatePlayerScoreCounter(playerData.score, playerData.rank);
};

function updatePlayerScoreCounter(score, rank) {
    gbId('ScoreCounter').innerHTML = getNumberHtml(score, true);
    gbId('RankNumber').innerHTML = getNumberHtml(rank, true);
};

function updatePlayerEndurancePanels(endurance) {
    updatePlayerHpPanel(endurance.hp);
    updatePlayerArmorPanel(endurance.armor);
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

function updatePlayerWeaponPanel(selectedWeaponData, showChangeWeaponTooltipIcon) {
    var panel = gbId('PlayerWeaponBar');
    panel.querySelector('img').src = utils.stringFormat('{0}{1}.png', consts.WEAPONS_ICONS_PATH, selectedWeaponData.name);
    panel.querySelector('.numbers').innerHTML = selectedWeaponData.ammo == null ? '' : getNumberHtml(selectedWeaponData.ammo);
    setDomElementVisibility(gbId('PrevWeaponIcon'), showChangeWeaponTooltipIcon);
    setDomElementVisibility(gbId('NextWeaponIcon'), showChangeWeaponTooltipIcon);
};

function updatePlayerArmorPanel(armorCount) {
    var panel = gbId('PlayerArmorPanel');
    panel.style.display = armorCount ? '' : 'none';
    panel.querySelector('.numbers').innerHTML = getNumberHtml(armorCount);
};

function getNumberHtml(number, isBig) {
    function getNumeralHtml(numeral) {
        return utils.stringFormat('<img src="{0}{1}{2}.png" />', consts.NUMBER_ICONS_PATH, isBig ? 'big/' : '', numeral);
    };
    number = number || 0;
    return number.toString().split('').map(getNumeralHtml).join('');
};

export default {
    addOnLoginAction: addOnLoginAction,
    bindJoinGameFunctionToElements: bindJoinGameFunctionToElements,
    updatePlayerWeaponPanel: updatePlayerWeaponPanel,
    updatePlayerEndurancePanels: updatePlayerEndurancePanels,
    updatePlayerScoreCounter: updatePlayerScoreCounter,
    updatePlayerInterface: updatePlayerInterface,
    setLoginPanelVisibility: setLoginPanelVisibility,
    setGameInterfaceVisibility: setGameInterfaceVisibility,
    setDeathScreenVisibility: setDeathScreenVisibility,
    setPortalIconVisibility: setPortalIconVisibility,
    showEndRoundResult: showEndRoundResult,
    hideAllFullscreenMessages: hideAllFullscreenMessages
};

