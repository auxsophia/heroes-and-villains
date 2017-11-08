import { Template } from 'meteor/templating';
import { Games } from '../api/games.js';
 
import './game.html';
 
Template.game.events({
  'click .delete'() {
    Games.remove(this._id);
  },
});
