import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './heroes-villains.html';
import './test-helpers.html';
import './templates/day-phase.html';

Handlebars.registerHelper('toCapitalCase', function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

function initUserLanguage() {
  var language = amplify.store("language");

  if (language) {
    Session.set("language", language);
  }

  setUserLanguage(getUserLanguage());
}

function getUserLanguage() {
  var language = Session.get("language");

  if (language) {
    return language;
  } else {
    return "en";
  }
};

function setUserLanguage(language) {
  TAPi18n.setLanguage(language).done(function () {
    Session.set("language", language);
    amplify.store("language", language);
  });
}

function getLanguageDirection() {
  var language = getUserLanguage()
  var rtlLanguages = ['he', 'ar', 'fa'];

  if ($.inArray(language, rtlLanguages) !== -1) {
    return 'rtl';
  } else {
    return 'ltr';
  }
}

function getLanguageList() {
  var languages = TAPi18n.getLanguages();
  var languageList = _.map(languages, function (value, key) {
    var selected = "";

    if (key == getUserLanguage()) {
      selected = "selected";
    }

    // Gujarati isn't handled automatically by tap-i18n,
    // so we need to set the language name manually
    if (value.name == "gu") {
      value.name = "ગુજરાતી";
    }

    return {
      code: key,
      selected: selected,
      languageDetails: value
    };
  });

  if (languageList.length <= 1) {
    return null;
  }

  return languageList;
}

function getCurrentGame() {
  var gameID = Session.get("gameID");

  if (gameID) {
    return Games.findOne(gameID);
  }
}

function getAccessLink() {
  var game = getCurrentGame();

  if (!game) {
    return;
  }

  return Meteor.settings.public.url + game.accessCode + "/";
}


function getCurrentPlayer() {
  var playerID = Session.get("playerID");

  if (playerID) {
    return Players.findOne(playerID);
  }
}

getAllCurrentPlayers = function () {
  var game = getCurrentGame();
  var currentPlayer = getCurrentPlayer();

  if (!game) {
    return null;
  }

  var players = Players.find({ 'gameID': game._id }, { 'sort': { 'createdAt': 1 } }).fetch();

  players.forEach(function (player) {
    if (player._id === currentPlayer._id) {
      player.isCurrent = true;
    }
  });

  return players;
}

// Get all but the current player
getNonCurrentPlayers = function () {
  var game = getCurrentGame();
  var currentPlayer = getCurrentPlayer();
  var players = Players.find({ $and: [{ 'gameID': game._id }, { '_id':{$not:{$eq:currentPlayer._id}}}]}, { 'sort': { 'createdAt': 1 }} ).fetch();
  return players;
}

function generateAccessCode() {
  var code = "";
  var possible = "abcdefghijklmnopqrstuvwxyz";

  for (var i = 0; i < 6; i++) {
    code += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return code;
}

function generateNewGame() {
  var game = {
    accessCode: generateAccessCode(),
    state: "waitingForPlayers",
    location: null,
    currentPhase: "preStart",
    lengthInMinutes: 8,
    villainCount: 1,
    endTime: null,
    paused: false,
    pausedTime: null
  };

  var gameID = Games.insert(game);
  game = Games.findOne(gameID);

  return game;
}

generateNewPlayer = function (game, name) {
  var player = {
    gameID: game._id,
    name: name,
    role: null,
    isVillain: false,
    isFirstPlayer: false,
    suspicionScoreCount: 0,
    isAlive: true,
    selectedPlayerID: null,
    isReady: false // Boolean to check if player is ready to transition to next game state
  };

  var playerID = Players.insert(player);

  return Players.findOne(playerID);
}

function resetUserState() {
  var player = getCurrentPlayer();

  if (player) {
    Players.remove(player._id);
  }

  Session.set("gameID", null);
  Session.set("playerID", null);
}

function trackGameState() {
  var gameID = Session.get("gameID");
  var playerID = Session.get("playerID");

  if (!gameID || !playerID) {
    return;
  }

  var game = Games.findOne(gameID);
  var player = Players.findOne(playerID);

  if (!game || !player) {
    Session.set("gameID", null);
    Session.set("playerID", null);
    Session.set("currentView", "startMenu");
    return;
  }

  if (game.state === "roleView") {
    Session.set("currentView", "roleView");
  } else if (game.state === "nightPhaseVillain") {
    Session.set("currentView", "nightPhaseVillain");
  } else if (game.state === "guardianNightPhase") {
    Session.set("currentView", "guardianNightPhase");
  // } else if(game.state === "summaryNightPhase") {
  //   Session.set("currentView", "summaryNightPhase")
  // } else if(game.state === "summaryDayPhase") {
  //   Session.set("currentView", "summaryDayPhase")
  } else if (game.state === "dayPhase") {
    Session.set("currentView", "dayPhase");
  } else if (game.state === "waitingForPlayers") {
    Session.set("currentView", "lobby");
  } else if (game.state === "telepathPhase") {
    Session.set("currentView", "telepathPhase")
  } else if (game.state ==="villainWin") {
    Session.set("currentView","villainWin")
  } else if (game.state ==="heroWin") {
    Session.set("currentView","heroWin")
  }
}

function leaveGame() {
  GAnalytics.event("game-actions", "gameleave");
  var player = getCurrentPlayer();

  Session.set("currentView", "startMenu");
  Players.remove(player._id);

  Session.set("playerID", null);
}

function hasHistoryApi() {
  return !!(window.history && window.history.pushState);
}

initUserLanguage();

Meteor.setInterval(function () {
  Session.set('time', new Date());
}, 1000);

if (hasHistoryApi()) {
  function trackUrlState() {
    var accessCode = null;
    var game = getCurrentGame();
    if (game) {
      accessCode = game.accessCode;
    } else {
      accessCode = Session.get('urlAccessCode');
    }

    var currentURL = '/';
    if (accessCode) {
      currentURL += accessCode + '/';
    }
    window.history.pushState(null, null, currentURL);
  }
  Tracker.autorun(trackUrlState);
}
Tracker.autorun(trackGameState);

window.onbeforeunload = resetUserState;
window.onpagehide = resetUserState;

FlashMessages.configure({
  autoHide: true,
  autoScroll: false
});

Template.main.rendered = function () {
  $.getScript("//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", function () {
    var ads, adsbygoogle;
    ads = '<ins class="adsbygoogle" style="display:block;" data-ad-client="ca-pub-3450817379541922" data-ad-slot="4101511012" data-ad-format="auto"></ins>';
    $('.adspace').html(ads);
    return (adsbygoogle = window.adsbygoogle || []).push({});
  });
};



Template.main.helpers({
  whichView: function () {
    return Session.get('currentView');
  },
  language: function () {
    return getUserLanguage();
  },
  textDirection: function () {
    return getLanguageDirection();
  }
});

Template.footer.helpers({
  languages: getLanguageList
})

Template.footer.events({
  'click .btn-set-language': function (event) {
    var language = $(event.target).data('language');
    setUserLanguage(language);
    GAnalytics.event("language-actions", "set-language-" + language);
  },
  'change .language-select': function (event) {
    var language = event.target.value;
    setUserLanguage(language);
    GAnalytics.event("language-actions", "set-language-" + language);
  }
})

Template.registerHelper('concat', (string1, string2) => {
  return string1 + string2;
});
Template.registerHelper('currentPlayerName', () => {
    return getCurrentPlayer().name
});
Template.registerHelper('gameLog', () => {
    return getCurrentGame().gameLog;
});
Template.registerHelper('guardianLog', () => {
  return getCurrentGame().guardianLog;
});
Template.registerHelper('isGuardian', () => {
  return getCurrentPlayer().role == 'guardian';
});
Template.registerHelper('currentPlayer', () => {
  return getCurrentPlayer();
});


Template.startMenu.events({
  'click #btn-new-game': function () {
    Session.set("currentView", "createGame");
  },
  'click #btn-join-game': function () {
    Session.set("currentView", "joinGame");
  }
});

Template.startMenu.helpers({
  announcement: function () {
    return Meteor.settings.public.announcement;
  },
  alternativeURL: function () {
    return Meteor.settings.public.alternative;
  }
});

Template.startMenu.rendered = function () {
  GAnalytics.pageview("/");

  resetUserState();
};

Template.createGame.events({
  'submit #create-game': function (event) {
    GAnalytics.event("game-actions", "newgame");


    var playerName = event.target.playerName.value;


    if (!playerName || Session.get('loading')) {
      return false;
    }

    var game = generateNewGame();
    var player = generateNewPlayer(game, playerName);

    Meteor.subscribe('games', game.accessCode);

    Session.set("loading", true);

    Meteor.subscribe('players', game._id, function onReady() {
      Session.set("loading", false);

      Session.set("gameID", game._id);
      Session.set("playerID", player._id);
      Session.set("currentView", "lobby");
    });

    return false;
  },
  'click .btn-back': function () {
    Session.set("currentView", "startMenu");
    return false;
  }
});

Template.createGame.helpers({
  isLoading: function () {
    return Session.get('loading');
  }
});

Template.createGame.rendered = function (event) {
  $("#player-name").focus();
};

Template.joinGame.events({
  'submit #join-game': function (event) {
    GAnalytics.event("game-actions", "gamejoin");

    var accessCode = event.target.accessCode.value;
    var playerName = event.target.playerName.value;

    if (!playerName || Session.get('loading')) {
      return false;
    }

    accessCode = accessCode.trim();
    accessCode = accessCode.toLowerCase();

    Session.set("loading", true);

    Meteor.subscribe('games', accessCode, function onReady() {
      Session.set("loading", false);

      var game = Games.findOne({
        accessCode: accessCode
      });

      if (game) {
        // Only allow players to be added when game state is preStart or waitingForPlayers
        console.log(game.state);
        if (game.state == "preStart" || game.state == "waitingForPlayers") {
          Meteor.subscribe('players', game._id);
          player = generateNewPlayer(game, playerName);


          Session.set('urlAccessCode', null);
          Session.set("gameID", game._id);
          Session.set("playerID", player._id);
          Session.set("currentView", "lobby");
        }
        // Otherwise send error
        FlashMessages.sendError(TAPi18n.__("ui.tried to join running game"));
        return false;

      } else {
        FlashMessages.sendError(TAPi18n.__("ui.invalid access code"));
        GAnalytics.event("game-actions", "invalidcode");
      }
    });

    return false;
  },
  'click .btn-back': function () {
    Session.set('urlAccessCode', null);
    Session.set("currentView", "startMenu");
    return false;
  }
});

Template.joinGame.helpers({
  isLoading: function () {
    return Session.get('loading');
  }
});


Template.joinGame.rendered = function (event) {
  resetUserState();

  var urlAccessCode = Session.get('urlAccessCode');

  if (urlAccessCode) {
    $("#access-code").val(urlAccessCode);
    $("#access-code").hide();
    $("#player-name").focus();
  } else {
    $("#access-code").focus();
  }
};

Template.lobby.helpers({
  game: function () {
    return getCurrentGame();
  },
  accessLink: function () {
    return getAccessLink();
  },
  player: function () {
    return getCurrentPlayer();
  },
  players: getAllCurrentPlayers,
  villainCount: function () {
    var game = getCurrentGame();
    return game.villainCount;
  },
  // Must be at least 1 villain
  disableDecrease: function () {
    var game = getCurrentGame();
    return game.villainCount <= 1;
  },
  // never allow 50% or greater villainy
  disableIncrease: function () {
    var game = getCurrentGame();
    var players = getAllCurrentPlayers();
    return game.villainCount >= (players.length / 2);
  },
  gameHasTooFewPlayers: function() {
    return getAllCurrentPlayers().length < 4;
  },
  isLoading: function () {
    var game = getCurrentGame();
    return game.state === 'settingUp';
  }
});

Template.lobby.events({
  'click .increase-villains': function () {
    game = getCurrentGame();
    Games.update(game._id, {
      $set: { villainCount: game.villainCount + 1 },
    });
  },
  'click .decrease-villains': function () {
    game = getCurrentGame();
    Games.update(game._id, {
      $set: { villainCount: game.villainCount - 1 },
    });
  },
  'click .btn-leave': leaveGame,
  'click .btn-start': function () {
    GAnalytics.event("game-actions", "gamestart");

    var game = getCurrentGame();
    Games.update(game._id, { $set: { moderator: getCurrentPlayer()._id, state: 'settingUp' } });
  },
  'click .btn-toggle-qrcode': function () {
    $(".qrcode-container").toggle();
  },
  'click .btn-remove-player': function (event) {
    var playerID = $(event.currentTarget).data('player-id');
    Players.remove(playerID);
  },
  'click .btn-edit-player': function (event) {
    var game = getCurrentGame();
    resetUserState();
    Session.set('urlAccessCode', game.accessCode);
    Session.set('currentView', 'joinGame');
  }
});

Template.lobby.rendered = function (event) {
  var url = getAccessLink();
  var qrcodesvg = new Qrcodesvg(url, "qrcode", 250);
  qrcodesvg.draw();
};

function getTimeRemaining() {
  var game = getCurrentGame();
  var localEndTime = game.endTime - TimeSync.serverOffset();

  if (game.paused) {
    var localPausedTime = game.pausedTime - TimeSync.serverOffset();
    var timeRemaining = localEndTime - localPausedTime;
  } else {
    var timeRemaining = localEndTime - Session.get('time');
  }

  if (timeRemaining < 0) {
    timeRemaining = 0;
  }

  return timeRemaining;
}

function goToNight() {
  game = getCurrentGame();
  Games.update(game._id, {
    $set: {
      state: 'nightPhaseVillain'
    }
  });
}

Template.roleView.helpers({
  isModerator: function () {
    game = getCurrentGame();
    return getCurrentPlayer()._id == game.moderator;;
  },
  player: getCurrentPlayer
})

Template.roleView.events({
  "click .btn-lets-play": goToNight,

})

Template.nightPhaseVillain.helpers({
  game: getCurrentGame,
  player: getCurrentPlayer,
  players: getAllCurrentPlayers,
  isVillain: function () { 
    var player = getCurrentPlayer();
    if(player.role === 'villain') {
      return true;
    }
    return false;
  },
  isGuardian: function () { 
    var player = getCurrentPlayer();
    if(player.role === 'guardian') {
      return true;
    }
    return false;
  }
});

Template.guardianNightPhase.helpers({
  game: getCurrentGame,
  player: getCurrentPlayer,
  players: getAllCurrentPlayers,
  isGuardian: function () { 
    var player = getCurrentPlayer();
    if(player.role === 'guardian') {
      return true;
    }
    return false;
  }
});

Template.nightPhaseVillain.events({
  'click .btn-leave': leaveGame,
  'click .btn-end': function () {
    GAnalytics.event("game-actions", "gameend");

    var game = getCurrentGame();
    Games.update(game._id, { $set: { state: 'waitingForPlayers' } });
  },
  'click .btn-toggle-status': function () {
    $(".status-container-content").toggle();
  },
  'click .game-countdown': function () {
    var game = getCurrentGame();
    var currentServerTime = TimeSync.serverTime(moment());

    if (game.paused) {
      GAnalytics.event("game-actions", "unpause");
      var newEndTime = game.endTime - game.pausedTime + currentServerTime;
      Games.update(game._id, { $set: { paused: false, pausedTime: null, endTime: newEndTime } });
    } else {
      GAnalytics.event("game-actions", "pause");
      Games.update(game._id, { $set: { paused: true, pausedTime: currentServerTime } });
    }
  },
  'click .player-name': function (event) {
    event.currentTarget.className = 'player-name-striked';
  },
  'click .player-name-striked': function (event) {
    event.currentTarget.className = 'player-name';
  },
  'click .location-name': function (event) {
    event.target.className = 'location-name-striked';
  },
  'click .location-name-striked': function (event) {
    event.target.className = 'location-name';
  },
  'click .btn-test': function (event) {
    var game = getCurrentGame();
    Games.update(game._id, { $set: { state: 'telepathPhase' } });
  }
});






/*
      day-phase start
*/

Template.dayPhase.helpers({
  suspicionScoreCount: function () {
    var player = getCurrentPlayer();
    return player.suspicionScoreCount;
  }
});

/*
      day-phase end
*/

/*
      player-vote start
*/

Template.playerVote.helpers({
  players: getNonCurrentPlayers,
  isReady: function () {
    var player = getCurrentPlayer();
    return player.isReady;
  }
});

Template.playerVote.events({
  'change input:radio[name=player]': function () {
    var vSelectedPlayerID = $(this)[0]._id;
    // Keep track of the current players selection
    var player = getCurrentPlayer();
    game = getCurrentGame();
    Meteor.call('makeVote', game._id, player._id, vSelectedPlayerID, function(err, response) {
      if (err) {
        console.error("error Voting");
      }
    });
  },
  'click .btn-player-ready': function (event) {
    var player = getCurrentPlayer();
    Players.update(player._id, {
      $set: { isReady: true },
    });
    checkAllPlayerIsReady();
  }
});

Template.telepathPhase.helpers({
  players: getAllCurrentPlayers,
  isReady: function () {
    var player = getCurrentPlayer();
    return player.isReady;
  },
  playerRole: function () {
    var player = getCurrentPlayer();
    if (player.isReady) {
      var selectedPlayer = Players.find({ _id: player.selectedPlayerID });
      return selectedPlayer.role;
    } else {
      return "";
    }
  }
});

Template.telepathPhase.events({
  'change input:radio[name=player]': function () {
    var vSelectedPlayerID = $(this)[0]._id;
    // Keep track of the current players selection
    var player = getCurrentPlayer();
    Players.update(player._id, {
      $set: { selectedPlayerID: vSelectedPlayerID },
    });
  },

  'click .btn-player-ready': function (event) {
    var player = getCurrentPlayer();
    Players.update(player._id, {
      $set: { isReady: true },
    });
  }
});

// If players are ready transition to appropriate state

/*
      player-vote end
*/


/*
      summary-night-phase start
*/
Template.summaryNightPhase.nameOfKilledPlayer = function (){
  var player = Players.findOne({},{sort:{suspicionScoreCount:-1}});
  return player.name;
}

// Template.summaryNightPhase.rendered = function() {
//   // Set player with highest suspicionScoreCount to not alive before resetting voting variables
//   // Show results screen for 5 seconds before switching to day phase
//   Meteor.setTimeout(function (){
//     setPlayerNotAlive();
//     resetPlayerVotingVariables();
//     if(!isWinCondition()){
//       game = getCurrentGame();
//       Games.update(game._id, { $set: { state: "dayPhase" } });
//     }
//   }, 5000);
// }

/*
      summary-night-phase end
*/


/*
      summary-day-phase start
*/
Template.summaryDayPhase.nameOfKilledPlayer = function (){
  var player = Players.findOne({},{sort:{suspicionScoreCount:-1}});
  return player.name;
}

// Template.summaryDayPhase.rendered = function() {
//   // Set player with highest suspicionScoreCount to not alive before resetting voting variables
//   // Show results screen for 5 seconds before switching to day phase
//   Meteor.setTimeout(function (){
//     setPlayerNotAlive();
//     resetPlayerVotingVariables();
//     if(!isWinCondition()){
//       game = getCurrentGame();
//       Games.update(game._id, { $set: { state: "nightPhaseVillain" } });
//     }
//   }, 5000);
// }

/*
      summary-day-phase end
*/

/*
    end-game start
*/

Template.villainWin.events ({
  'click .btn-leave': leaveGame
});

Template.heroWin.events ({
  'click .btn-leave': leaveGame
});

/*
    end-game end
*/

/*
    Utility Functions
*/

function resetPlayerVotingVariables (){
  // Reset suspicionScoreCount, selectedPlayerID, isReady to default values after each voting phase
  var game = getCurrentGame();
  var players = Players.find({ 'gameID': game._id }, { 'sort': { 'createdAt': 1 } }).fetch();
  players.forEach(function (player) {
    Players.update(player._id, {
      $set: { suspicionScoreCount: 0, selectedPlayerID: null, isReady: false }
    });
  });
}

function isWinCondition(){
  var game = getCurrentGame();
  var villainAliveCount = Players.find({ $and: [{ 'gameID': game._id }, { 'isVillain':true},{'isAlive':true}]}).count();
  var heroAliveCount    = Players.find({ $and: [{ 'gameID': game._id }, { 'isVillain':false},{'isAlive':true}]}).count();

  if(villainAliveCount === 0){
    Games.update(game._id, { $set: { state: "heroWin" } });
    return true;
  }
  console.log(heroAliveCount+" "+villainAliveCount);
  if(heroAliveCount <= villainAliveCount) {
    Games.update(game._id, { $set: { state: "villainWin" } });
    return true;
  }
  return false;
}

