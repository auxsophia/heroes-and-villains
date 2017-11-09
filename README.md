# heroes-and-villains
A team project to fulfill the requirements of CS 620: a graduate level course in human-computer interaction.

## Basic Install

This app depends on [Meteor.js](https://www.meteor.com)

Clone source code on the command line using gitbash shell for Windows, or iTerm on a Mac
`cd` into repository directory.
Run `meteor npm install`. If there are any errors address the fixes that are proposed.
Start the server with the command `meteor`. 

## View the Database

You can view the database by opening up a new terminal/gitbash window and run the command `meteor mongo` in the repository directory. This opens up a command line MongoDB session. Try the query `db.games.find({})` to list all games. Can sort them newest first with `db.games.find({},{sort: {createdAd: -1}})`
