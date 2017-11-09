import { Meteor } from 'meteor/meteor';

function cleanUpGamesAndPlayers() {
  var cutOff = moment().subtract(2, 'hours').toDate().getTime();

  var numGamesRemoved = Games.remove({
    createdAt: {$lt: cutOff}
  });

  var numPlayersRemoved = Players.remove({
    createdAt: {$lt: cutOff}
  });
}

function getRandomLocation(){
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
    var randomIndex = Math.floor(Math.random()*theArray.length);
    return theArray.splice(randomIndex, 1)[0];
 }

function assignRoles(players, location){
  var default_role = location.roles[location.roles.length - 1];
  var roles = location.roles.slice();
  var shuffled_roles = shuffleArray(roles);
  var role = null;

  players.forEach(function(player){
    if (!player.isSpy){
      role = shuffled_roles.pop();

      if (role === undefined){
        role = default_role;
      }

      Players.update(player._id, {$set: {role: role}});
    }
  });
}


Meteor.startup(function () {
  // Delete all games and players at startup
  Games.remove({});
  Players.remove({});
});

var MyCron = new Cron(60000);

MyCron.addJob(5, cleanUpGamesAndPlayers);

Meteor.publish('games', function(accessCode) {
  return Games.find({"accessCode": accessCode});
});

Meteor.publish('players', function(gameID) {
  return Players.find({"gameID": gameID});
});

Games.find({"state": 'settingUp'}).observeChanges({
  added: function (id, game) {
    var location = getRandomLocation();
    var players = Players.find({gameID: id});
    var gameEndTime = moment().add(game.lengthInMinutes, 'minutes').valueOf();

    var bucket = [];
    for (var i=0;i<=players.count();i++) {
        bucket.push(i);
    }
    var firstPlayerIndex = 0;
    var telepathIndex = getRandomFromArray(bucket); 
    console.log(telepathIndex);
    var guardianIndex = getRandomFromArray(bucket); 
    console.log(guardianIndex);
    var villainIndex = getRandomFromArray(bucket); 
    console.log(villainIndex);
    var villainIndex2 = getRandomFromArray(bucket); 
    console.log(villainIndex2);

    players.forEach(function(player, index){
      Players.update(player._id, {$set: {
        isTelepath: index === telepathIndex,
        isGuardian: index === guardianIndex,
        isVillain: index === villainIndex,
        isVillain: index === villainIndex2,
        isFirstPlayer: index === firstPlayerIndex,
        isPlainHero: index !== telepathIndex &&  index !== guardianIndex && index !== villainIndex && index !== villainIndex2
      }});
    });

    assignRoles(players, location);

    Games.update(id, {$set: {state: 'inProgress', location: location, endTime: gameEndTime, paused: false, pausedTime: null}});
  }
});