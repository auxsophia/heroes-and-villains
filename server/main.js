import {
  Meteor
} from 'meteor/meteor';

function cleanUpGamesAndPlayers() {
  var cutOff = moment().subtract(2, 'hours').toDate().getTime();

  var numGamesRemoved = Games.remove({
    createdAt: {
      $lt: cutOff
    }
  });

  var numPlayersRemoved = Players.remove({
    createdAt: {
      $lt: cutOff
    }
  });
}

function getRandomLocation() {
  var locationIndex = Math.floor(Math.random() * locations.length);
  return locations[locationIndex];
}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function getRandomFromArray(theArray) {
  var randomIndex = Math.floor(Math.random() * theArray.length);
  return theArray.splice(randomIndex, 1)[0];
}

function assignRoles(players, location, numVillains) {

  var playerArray = [];
  players.forEach(function (player) {
    playerArray.push(player);
  });

  var shuffledPlayers = shuffleArray(playerArray);

  for (var i = 0; i < numVillains; i++) {
    var villainPlayer = shuffledPlayers.pop();
    Players.update(villainPlayer._id, {
      $set: {
        role: "villain",
        isVillain: true,
        suspicionScoreCount: 0,
        isAlive: true
      }
    });
  }
  var guardian = shuffledPlayers.pop();
  Players.update(guardian._id, {
    $set: {
      role: "guardian",
      isVillain: false,
      suspicionScoreCount: 0,
      isAlive: true
    }
  });
  var telepath = shuffledPlayers.pop();
  Players.update(telepath._id, {
    $set: {
      role: "telepath",
      isVillain: false,
      suspicionScoreCount: 0,
      isAlive: true
    }
  });

  shuffledPlayers.forEach(function(player) {
    Players.update(player._id, {
      $set: {
        role: "hero",
        isVillain: false,
        suspicionScoreCount: 0,
        isAlive: true
      }
    });

  });
}


Meteor.startup(function () {
  // Delete all games and players at startup
  Games.remove({});
  Players.remove({});
});

var MyCron = new Cron(60000);

MyCron.addJob(5, cleanUpGamesAndPlayers);

Meteor.publish('games', function (accessCode) {
  return Games.find({
    "accessCode": accessCode
  });
});

Meteor.publish('players', function (gameID) {
  return Players.find({
    "gameID": gameID
  });
});

Games.find({
  "state": 'settingUp'
}).observeChanges({
  added: function (id, game) {
    // We want our game to always get the first location, which is the hero 'homebase'
    var location = locations[0]; //getRandomLocation();
    var players = Players.find({
      gameID: id
    });
    var gameEndTime = moment().add(game.lengthInMinutes, 'minutes').valueOf();

    players.forEach(function (player, index) {
      Players.update(player._id, {
        $set: {
          role: null,
          isVillain: false,
          isFirstPlayer: false,
          suspicionScoreCount: 0,
          isAlive: true,
          selectedPlayerID: null
        }
      });
    });

    assignRoles(players, location, game.villainCount);

    Games.update(id, {
      $set: {
        state: 'roleView',
        location: location,
        endTime: gameEndTime,
        paused: false,
        pausedTime: null
      }
    });
  }
});
