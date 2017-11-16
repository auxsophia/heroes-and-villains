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

  console.log(shuffledPlayers);

  for (var i = 0; i < numVillains; i++) {
    var villainPlayer = shuffledPlayers.pop();
    Players.update(villainPlayer._id, {
      $set: {
        role: "villain"
      }
    });
  }
  var guardian = shuffledPlayers.pop();
  Players.update(guardian._id, {
    $set: {
      role: "guardian"
    }
  });
  var telepath = shuffledPlayers.pop();
  Players.update(telepath._id, {
    $set: {
      role: "telepath"
    }
  });

  shuffledPlayers.forEach(function(player) {
    Players.update(player._id, {
      $set: {
        role: "hero"
      }
    });

  });

  // var default_role = location.roles[location.roles.length - 1];
  // var roles = location.roles.slice();
  // var shuffled_roles = shuffleArray(roles);
  // var role = null;

  // players.forEach(function (player) {
  //   if (!player.isVillain) {
  //     role = shuffled_roles.pop();

  //     if (role === undefined) {
  //       role = default_role;
  //     }

  //     Players.update(player._id, {
  //       $set: {
  //         role: role
  //       }
  //     });

  //     if (role === 'locations.roles.herobase.guardian') {
  //       Players.update(player._id, {
  //         $set: {
  //           isGuardian: true,
  //           isTelepath: false,
  //           isVillain: false
  //         }
  //       });
  //     }

  //     if (role === 'locations.roles.herobase.telepath') {
  //       Players.update(player._id, {
  //         $set: {
  //           isTelepath: true,
  //           isGuardian: false,
  //           isVillain: false
  //         }
  //       });
  //     }
  //   }
  // });
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

    var villainIndex = Math.floor(Math.random() * players.count());
    console.log(villainIndex);

    players.forEach(function (player, index) {
      Players.update(player._id, {
        $set: {
          isVillain: index === villainIndex,
          isGuardian: false,
          isTelepath: false
        }
      });
    });

    /*console.log("player count");
    console.log(players.count());
    var bucket = [];
    for (var i = 0; i < players.count(); i++) {
      bucket.push(i);
    }
    var telepathIndex = getRandomFromArray(bucket);
    console.log(telepathIndex);
    var guardianIndex = getRandomFromArray(bucket);
    console.log(guardianIndex);
    var villainIndex = getRandomFromArray(bucket);
    console.log(villainIndex);
    var villainIndex2 = getRandomFromArray(bucket);
    console.log(villainIndex2);

    players.forEach(function (player, index) {
      Players.update(player._id, {
        $set: {
          isTelepath: index === telepathIndex,
          isGuardian: index === guardianIndex,
          isVillain: index === villainIndex || villainIndex2,
          isPlainHero: index !== telepathIndex && index !== guardianIndex && index !== villainIndex && index !== villainIndex2
        }
      });
    });*/

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