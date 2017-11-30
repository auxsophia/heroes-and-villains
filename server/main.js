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

  shuffledPlayers.forEach(function (player) {
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
  Meteor.methods({
    makeVote: playerSetVote
  })
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
        roundNumber: 1,
        location: location,
        gameLog: [],
        guardianLog: [],
        telepathLog: [],
        villainLog: [],
        endTime: gameEndTime,
        paused: false,
        pausedTime: null
      }
    });
  }
});

function isUnanimous(votes) {
  var previousVote = "";
  for (index = 0; index < votes.length; index++) {
    var currentVote = votes[index];
    if (currentVote == "no vote" || (previousVote != "" && currentVote != previousVote)) {
      return false;
    }
    previousVote = currentVote;
  }
  return true;
}
function hasMajority(votes) {
  var majorityNumber = Math.floor(votes.length / 2) + 1;
  voteCount = [];
  votes.forEach(function (value) {
    if (value != "no vote") {
      if (!voteCount[value]) {
        voteCount[value] = 1;
      } else {
        voteCount[value] += 1;
      }
    }
  });
  killedID = false;
  for (var playerID in voteCount) {
    if (+voteCount[playerID] >= majorityNumber) {
      killedID = playerID;
    }
  }
  return killedID;
}

getAllCurrentPlayers = function (gameID) {
  return Players.find({ 'gameID': gameID }, { 'sort': { 'createdAt': 1 } }).fetch();
}

function clearVotes(gameID) {
  console.log("Clearing Votes");
  var players = getAllCurrentPlayers(gameID);
  players.forEach(function (player) {
    Players.update(player._id, { $set: { selectedPlayerID: null, suspicionScoreCount: 0 } });
  });
  console.log("players with non-null selectedPlayerID:")
  var stillVotingPlayers = Players.find({gameID: gameID, selectedPlayerID:{$ne: null}});
  stillVotingPlayers.forEach(function(player) {
    console.log(player.name + " voting for: " +Players.findOne(player.selectedPlayerID).name);
  });
}

function guardianIsDead(gameID) {
  var guardian = Players.findOne({ 'gameID': gameID, 'role': 'guardian'})
  return !guardian.isAlive;
}
function telepathIsDead(gameID) {
  var telepath = Players.findOne({ 'gameID': gameID, 'role': 'telepath'})
  return !telepath.isAlive;
}

function checkWinCondition(gameID) {
  var villainAliveCount = Players.find({ $and: [{ 'gameID': gameID }, { 'isVillain': true }, { 'isAlive': true }] }).count();
  var heroAliveCount = Players.find({ $and: [{ 'gameID': gameID }, { 'isVillain': false }, { 'isAlive': true }] }).count();
  console.log("Checking Win - Heroes: " + heroAliveCount + ", Villains: " + villainAliveCount);
  if (villainAliveCount === 0) {
    return "heroWin";
  }
  if (heroAliveCount <= villainAliveCount) {
    return "villainWin";
  }
  return false;
}

function getRandomNumberBetween(low, high) {
  return Math.random() * (high-low) + low;
}
function wrapUpDayOrNightPhase(game, currentPhase, nextPhase) {
  clearVotes(game._id);
  var gameLog = game.gameLog;
  var didGameEnd = checkWinCondition(game._id);
  if (didGameEnd){
    var whoWon = didGameEnd == "heroWin" ? "Heroes" : "Villains";
    gameLog.push({ phase: currentPhase, roundNumber: game.roundNumber, message: whoWon + " Win!" })
    Games.update(game._id, { $set: { state: didGameEnd, gameLog: gameLog } });
  } else {
    Games.update(game._id, { $set: { state: nextPhase, gameLog: gameLog} });
  }
}

function wrapUpFailedGuardianPhase(game, guardianLogEntry) {
  var playerKilledName = Players.findOne(game.pendingKill).name;
  var guardianLog = game.guardianLog;
  var gameLog = game.gameLog;
  Players.update(game.pendingKill, {
    $set: { isAlive: false },
  });
  guardianLog.push({ phase: "Night", roundNumber: game.roundNumber, message: guardianLogEntry});
  gameLog.push({ phase: "Night", roundNumber: game.roundNumber, message: playerKilledName + " was killed." });
  Games.update(game._id, { $set: { gameLog: gameLog, guardianLog: guardianLog} });
  wrapUpDayOrNightPhase(game, "Night", "dayPhase");
}

function wrapUpTelepathPhase(game, telepathLogEntry) {
  var telepathLog = game.telepathLog;
  telepathLog.push({ phase: "Night", roundNumber: game.roundNumber, message: telepathLogEntry});
  Games.update(game._id, { $set: { state: "guardianNightPhase", telepathLog: telepathLog} });
  clearVotes(game._id);
  
  // Must advance here if guardian is dead also!
  if (guardianIsDead(game._id)) {
    Meteor.setTimeout(function() {
      wrapUpFailedGuardianPhase(game, "You were dead, did nothing.");
    }, getRandomNumberBetween(12000,17000));
  }
}

function processVote(gameID) {
  var game = Games.findOne(gameID);
  var nextState = null;
  var players = null;

  switch (game.state) {
    case "villainNightPhase":
      // Consider votes from villains who are ready and alive
      votingVillains = Players.find({ $and: [{ 'gameID': game._id }, { 'role': 'villain' }, { 'isAlive': true }] }).fetch();
      // must be unanimous
      votes = [];
      votingVillains.forEach(function (player) {
        if (player.selectedPlayerID) {
          votes.push(player.selectedPlayerID);
        } else {
          votes.push("no vote");
        }
      });
      if (isUnanimous(votes)) {
        var gameLog = game.gameLog;
        var pendingKilledPlayerID = votes[0];
        var pendingKilledPlayerName = Players.findOne(pendingKilledPlayerID).name;
        var villainLog = game.villainLog;
        villainLog.push({ phase: "Night", roundNumber: game.roundNumber, message: "You tried to kill " + pendingKilledPlayerName });
        Games.update(game._id, { $set: { state: "telepathNightPhase", villainLog: villainLog, pendingKill: pendingKilledPlayerID } });
        clearVotes(game._id);

        // if Telepath is dead set timer for end of telapath round
        if (telepathIsDead(game._id)) {
          Meteor.setTimeout(function() {
            wrapUpTelepathPhase(game, "You were dead, did nothing.");
          }, getRandomNumberBetween(12000,17000));
        }
      }
      break;
      case "telepathNightPhase":
          // Consider votes from telepaths (currently only one telepath at a time) who are ready and alive
          telepathVote = Players.find({ $and: [{ 'gameID': game._id }, { 'role': 'telepath' }, { 'isAlive': true }] }).fetch();
          var readPlayerID = telepathVote[0].selectedPlayerID;
          var readPlayerName = Players.findOne(readPlayerID).name;
          var readPlayerRole = Players.findOne(readPlayerID).role == 'villain' ? "Villain" : "Hero";
          console.log("Telepath -- " + "Name: " + readPlayerName + ", role: " + readPlayerRole);
          wrapUpTelepathPhase(game, readPlayerName + " is a " + readPlayerRole);
           // if Guardian is dead set timer for end of telapath round
        if (guardianIsDead(game._id)) {
          Meteor.setTimeout(function() {
            wrapUpFailedGuardianPhase(game, "You were dead, did nothing.");
          }, getRandomNumberBetween(12000,17000));
        }
          break;
    case "guardianNightPhase":
      // Consider votes from villains who are ready and alive
      guardianVote = Players.find({ $and: [{ 'gameID': game._id }, { 'role': 'guardian' }, { 'isAlive': true }] }).fetch();
      var protectedPlayerID = guardianVote[0].selectedPlayerID;
      var protectedPlayerName = Players.findOne(protectedPlayerID).name;
      var playerKilledName = Players.findOne(game.pendingKill).name;
      var gameLog = game.gameLog;
      var guardianLog = game.guardianLog;
      if (protectedPlayerID == game.pendingKill) {
        guardianLog.push({ phase: "Night", roundNumber: game.roundNumber, message: "You rescued " + protectedPlayerName });
        gameLog.push({ phase: "Night", roundNumber: game.roundNumber, message: "No hero was killed" });
        Games.update(game._id, { $set: { state: "guardianNightPhase", gameLog: gameLog, guardianLog: guardianLog} });
      } else {
        wrapUpFailedGuardianPhase(game, "You chose " + protectedPlayerName + " but " + playerKilledName + " was killed." );
      }
      wrapUpDayOrNightPhase(game, "Night", "dayPhase");

      break;
    case "dayPhase":
      // Consider votes from everyone alive
      // Has majority voted for one player
      votingPlayers = Players.find({ $and: [{ 'gameID': game._id }, { 'isAlive': true }] }).fetch();
      votes = [];
      votingPlayers.forEach(function (player) {
        if (player.selectedPlayerID) {
          votes.push(player.selectedPlayerID);
        } else {
          votes.push("no vote");
        }
      });
      var majorityVotedID = hasMajority(votes);
      if (majorityVotedID) {
        var gameLog = game.gameLog;
        var playerLockedUpName = Players.findOne(majorityVotedID).name;
        gameLog.push({ phase: "Day", roundNumber: game.roundNumber, message: playerLockedUpName + " was locked up." });
        Players.update(majorityVotedID, {
          $set: { isAlive: false },
        });
        wrapUpDayOrNightPhase(game, "Day", "villainNightPhase");
      }
  }
}

function playerSetVote(gameID, voterID, selectedPlayerID) {
  console.log("VOTE -- gameID: " + gameID + " voterID: " + voterID + " selectedPlayerID: " + selectedPlayerID);
  Players.update(voterID, {
    $set: { selectedPlayerID: selectedPlayerID },
  });
  // Then update the suspicionScoreCount for all players
  var players = getAllCurrentPlayers(gameID);
  players.forEach(function (player) {
    Players.update(player._id, {
      $set: { suspicionScoreCount: Players.find({ selectedPlayerID: player._id }).count() }
    });
  });
  processVote(gameID);
}
