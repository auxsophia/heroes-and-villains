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
    'click .btn-add-test-players': function (event) {
        console.log("Adding test players");
        var game = Games.findOne({_id: Session.get("gameID")});
        console.log(Meteor.settings.public);
        fakePlayerNames.forEach(function(name) {
            generateNewPlayer(game, name);

        })
    }

});
