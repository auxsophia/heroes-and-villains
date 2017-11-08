import { Template } from 'meteor/templating';
 
import { Games } from '../api/games.js';
 
import './body.html';
import './game.js'; 
function generateAccessCode(){
  var code = "";
  var possible = "abcdefghijklmnopqrstuvwxyz";

    for(var i=0; i < 6; i++){
      code += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return code;
}

Template.body.events({
'submit .new-game'(event) {
    // Prevent default browser form submit
    event.preventDefault();
 
    // Get value from form element
    const target = event.target;
    gameid = generateAccessCode();
 
    // Insert a task into the collection
    Games.insert({
      gameid,
      createdAt: new Date(), // current time
    });
 
    // Clear form
    target.text.value = '';
  },
});

Template.body.helpers({
  games() {
    return Games.find({}, {sort: {createdAt: -1}});
  },
});
Template.body.helpers({
  asimplemessage() {
    return "BLAH";
  },
});
