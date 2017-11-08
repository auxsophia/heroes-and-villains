import { Template } from 'meteor/templating';
import { Games } from '../api/games.js';

import './body.html';


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
    lengthInMinutes: 8,
    endTime: null,
    paused: false,
    pausedTime: null
  };

  var gameID = Games.insert(game);
  game = Games.findOne(gameID);

  return game;
}

function generateNewPlayer(game, name) {
  var player = {
    gameID: game._id,
    name: name,
    role: null,
    isSpy: false,
    isFirstPlayer: false
  };

  var playerID = Players.insert(player);

  return Players.findOne(playerID);
}

Template.game.events({
  'click .delete' () {
    Games.remove(this._id);
  },
  'click .join' () {

  },
});

Template.body.events({
  'submit .new-game' (event) {
    // Prevent default browser form submit
    event.preventDefault();

    generateNewGame();
  },
});

Template.body.helpers({
  games() {
    return Games.find({}, {
      sort: {
        createdAt: -1
      }
    });
  },
  anyGamesExist() {
    return Games.find().count() > 0;
  }
});