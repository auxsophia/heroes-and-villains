import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './test-helpers.html';
import './main.js';

var fakePlayerNames = [
    "Bob",
    "Jim",
    "Jane",
    "Billy",
    "Christobal",
    "Praneet",
    "Goeffrey",
    "Lacesita",
    "Heironymous",
    "Portia",
    "Donny",
    "Laertes",
    "Yul",
    "Bearnice"
];

Template.addTestPlayers.events({
    'click .btn-add-test-player': function (event) {
        var game = Games.findOne({_id: Session.get("gameID")});
        if (fakePlayerNames.length > 0){
          var url = 'http://localhost:3000' + '/' + game.accessCode + '/';
          var win = window.open(url);
          win.focus();

          generateNewPlayer(game, fakePlayerNames.pop());
        } else {
            console.error("Ran out of names, couldn't add another fake player");
        }
    },
    'click .btn-add-fake-player': function (event) {
        var game = Games.findOne({_id: Session.get("gameID")});
        if (fakePlayerNames.length > 0){
          generateNewPlayer(game, fakePlayerNames.pop());
        } else {
            console.error("Ran out of names, couldn't add another fake player");
        }
    }
});
