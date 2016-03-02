var express = require('express');
var compress = require('compression');

var chalk = require("chalk");
var fs = require("fs");
var ini = require('./modules/ini.js');

var PlayerFish = require("./entity/PlayerFish");
var Food = require("./entity/Food");

function GameServer() {
  this.fish = []; // Entities
  this.food = []; // Food
  
  // Cached lengths
  this.fishLength = 0;
  this.foodLength = 0;

  this.config = {
    TPS: 60, // Ticks per second
    port: 80, // Server port

    idLength: 5, // The lenght of an id
    maxPlayers: 100, // Maximum amount of players on the server
    topLength: 10, // Maximum number of players to be displayed in the top
    disconnectTime: 3 * 1000,

    leapToRadiusRatio: 30,

    sizeVelDecay: 0.9,
    speedVelDecay: 0.9,

    startSize: 500, // The starting score
    scoreDecay: 0.000005, // How much score to be losed in a tick
    bonusToEat: 1.2, // Minimum difference between two fish fro one to eat another

    areaSize: 3000, // Size of the map
    chunkSize: 100, // Size of one chunk

    foodSize: 1, // Size of one food bar
    minFood: 10000, // The amount of food on the map

    // View range
    visibleWidth: 100,
    visibleHeight: 50,

    minSizeFeed: 350,
    feedSize: 100,
    feedSpeed: 3,
    feedRemoveTime: 10 * 60 * 1000,

    foodUpdateTicks: 8
  }

  this.loadConfig();

  this.config.chunks = Math.floor(this.config.areaSize / this.config.chunkSize);

  // The position in this.food where are stored the the food bars in that chunk
  this.chunks = [];
  for (var i = 0; i < this.config.chunks * this.config.chunks; i++)
    this.chunks[i] = 0;
}

module.exports = GameServer;

GameServer.prototype.loadConfig = function() {
  try {
    // Load the contents of the config file
    var load = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));

    // Replace all the default config's values with the loaded config's values
    for (var obj in load) {
      this.config[obj] = load[obj];
    }
  } catch (err) {
    // No config
    console.log("Created config file");

    // Create a new config
    fs.writeFileSync('./config.ini', ini.stringify(this.config));
  }
};

// Start the server
GameServer.prototype.start = function(name) {
  setInterval(this.mainLoop.bind(this), 1000 / this.config.TPS);
  this.serverName = name;
}

GameServer.prototype.isFood = function(food) {
  var x = Math.floor(food.x / this.config.chunkSize);
  var y = Math.floor(food.y / this.config.chunkSize);

  var chunkEnd = this.chunkEnd(x, y);
  for (var i = this.chunkStart(x, y); i < chunkEnd; i++)
    if (this.food[i] == food)
      return 1;

  return 0;
}

GameServer.prototype.newPlayer = function(name, socket){
  if (this.fishLength >= this.config.maxPlayers)
		return;

	var player = new PlayerFish(socket, name, this);
	
	this.fish.push(player);
	this.fishLength ++;
  
  return player;
}

GameServer.prototype.addFood = function() {
  var food = new Food(this);

  var chunkX = Math.floor(food.x / this.config.chunkSize);
  var chunkY = Math.floor(food.y / this.config.chunkSize);

  this.food.splice(this.chunks[chunkX * this.config.chunks + chunkY], 0, food);

  for (var i = chunkX * this.config.chunks + chunkY + 1; i < this.config.chunks * this.config.chunks; i++)
    this.chunks[i] ++;

  this.foodLength ++;
}

GameServer.prototype.chunkStart = function(x, y) {
  if (x < 0 || y < 0 || x > this.config.chunks || y > this.config.chunks)
    return undefined;
  else
    return this.chunks[x * this.config.chunks + y];
}

GameServer.prototype.chunkEnd = function(x, y) {
  if (x < 0 || y < 0 || x > this.config.chunks || y > this.config.chunks)
    return undefined;
  else if (x * this.config.chunks + y < this.config.chunks * this.config.chunks - 1)
    return this.chunks[x * this.config.chunks + y + 1];
  else
    return this.foodLength;
}

GameServer.prototype.getTime = function() {
  var date = new Date();
  return date.getTime();
}

GameServer.prototype.mainLoop = function() {
  for (var i = 0; i < this.fishLength; i++) {
    var fish = this.fish[i];

    if (fish.isPlayer())
      fish.update();

    fish.updateSize(); // Update his size
    fish.decay(); // As time went player's size will decrease
    fish.move(); // Move player

    if (fish.toRemove == true || // Handle eaten fish 
        fish.isPlayer() && fish.size < this.config.startSize * 1.5 && fish.isDisconnected) { // Handle disconnections

      if (fish.isPlayer()) {
        // Emit an 'died' massage (for the modal to apear)
        fish.socket.emit('died', true);
      }

      // Remove the player
      this.fish.splice(i, 1);
      this.fishLength--;
      
      i--;
    }
  }
  
  // Sort fish
  for (var i = 1; i < this.fishLength; i ++) {
    if ( this.fish[i].size > this.fish[i - 1].size ){
      var aux = this.fish[i];
      this.fish[i] = this.fish[i - 1];
      this.fish[i - 1] = aux;
    }
  }

  // Refill eaten food
  while (this.foodLength < this.config.minFood) {
    this.addFood();
  }
}
