import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import '../templates/day-phase.html';
//import '../heroes-villains.html';
//import '../main.js';

Template.dayPhase.helpers({
    game: function () {
      return getCurrentGame();
    },
    accessLink: function () {
      return getAccessLink();
    },
    player: function () {
      return getCurrentPlayer();
    },
    players: function () {
      var game = getCurrentGame();
      var currentPlayer = getCurrentPlayer();
  
      if (!game) {
        return null;
      }
  
      var players = Players.find({'gameID': game._id}, {'sort': {'createdAt': 1}}).fetch();
  
      players.forEach(function(player){
        if (player._id === currentPlayer._id){
          player.isCurrent = true;
        }
      });
  
      return players;
    },
    isLoading: function() {
      var game = getCurrentGame();
      return game.state === 'settingUp';
    }
  });