var express = require('express');
var compress = require('compression');

var chalk = require("chalk");
var fs = require("fs");
var ini = require('./modules/ini.js');

var PlayerHandler = require('./PlayerHandler');

function GameServer() {
  this.run = true;
  this.tick = 0;

  this.players = []; // Entities
  this.food = []; // Food
  
  // Cached lengths
  this.playersLength = 0;
  this.foodLength = 0;

  this.playerIds = []; // Fish's ids
  this.clients = []; // Clients connected to the server

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
    bonusToEat: 1.2, // Minimum difference between two players fro one to eat another

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

  this.playerHandler = new PlayerHandler(this);
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

// Get the distance between two points
GameServer.prototype.getDist = function(deltaX, deltaY) {
  // Pythagoras's theorem
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

// Get distance between two players
GameServer.prototype.playerDist = function(playerA, playerB) { // The actual distance between the entities with the indexed a and b
  return this.getDist(playerA.x - playerB.x, playerA.y - playerB.y);
}

// Check if two players are touching
GameServer.prototype.touching = function(playerA, playerB) {
  return (Math.max(this.getRadius(playerA), this.getRadius(playerB)) > this.playerDist(playerA, playerB));
}

GameServer.prototype.removeId = function(player) {
  this.playerIds[player.id] = undefined;
}

GameServer.prototype.getRadius = function(player) {
  return Math.sqrt(player.size);
}

GameServer.prototype.randomCoord = function() {
  return Math.floor(Math.random() * this.config.areaSize);
}

GameServer.prototype.randomColor = function() {
  var rand = Math.floor(Math.random() * 3);
  if (rand == 0)
    return "#FF" + (Math.random() * 0xFF << 0).toString(16) + "00";
  else if (rand == 1)
    return "#00" + "FF" + (Math.random() * 0xFF << 0).toString(16);
  else
    return "#" + (Math.random() * 0xFF << 0).toString(16) + "00FF";
};

GameServer.prototype.randomAngle = function() {
  return Math.random() * Math.PI - Math.PI;
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

GameServer.prototype.addFood = function() {
  var x = this.randomCoord();
  var y = this.randomCoord();

  var chunkX = Math.floor(x / this.config.chunkSize);
  var chunkY = Math.floor(y / this.config.chunkSize);

  this.food.splice(this.chunks[chunkX * this.config.chunks + chunkY], 0, {
    x: x,
    y: y,
    color: this.randomColor(),
    angle: Math.floor(this.randomAngle() * 100) / 100
  });

  for (i = chunkX * this.config.chunks + chunkY + 1; i < this.config.chunks * this.config.chunks; i++)
    this.chunks[i]++;

  this.foodLength++;
}

GameServer.prototype.removeFood = function(index) {
  var food = this.food[index];
  var x = Math.floor(food.x / this.config.chunkSize);
  var y = Math.floor(food.y / this.config.chunkSize);

  for (i = x * this.config.chunks + y + 1; i < this.config.chunks * this.config.chunks; i++)
    this.chunks[i]--;

  this.food[index] = undefined;

  this.food.splice(index, 1);
  this.foodLength--;
}

GameServer.prototype.removePlayer = function(player) {
  player.toRemove = true;
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

GameServer.prototype.movePlayer = function(player) {
  if (player.toRemove == true)
    return;

  var speed = player.speed;
  var angle = (360 - player.angle) / 180 * Math.PI - Math.PI; // Convert the angle from degrees 
  player.x -= ((speed * Math.sin(angle)) + player.velX * 3);
  player.y += ((speed * Math.cos(angle)) + player.velY * 3);

  player.x = Math.min(this.config.areaSize - this.getRadius(player), Math.max(this.getRadius(player), player.x));
  player.y = Math.min(this.config.areaSize - this.getRadius(player), Math.max(this.getRadius(player), player.y));

  player.velX *= this.config.speedVelDecay;
  player.velY *= this.config.speedVelDecay;

  if (player.type == "feed")
    return;

  var chunkTop = Math.floor((player.x - this.getRadius(player)) / this.config.chunkSize);
  var chunkLeft = Math.floor((player.y - this.getRadius(player)) / this.config.chunkSize);
  var chunkBottom = Math.floor((player.x + this.getRadius(player)) / this.config.chunkSize);
  var chunkRight = Math.floor((player.y + this.getRadius(player)) / this.config.chunkSize);

  for (var x = chunkTop; x <= chunkBottom; x++)
    for (var y = chunkLeft; y <= chunkRight; y++) {
      for (var i = this.chunkStart(x, y); i < this.chunkEnd(x, y); i++) {
        if (this.getRadius(player) > this.getDist(player.x - this.food[i].x, player.y - this.food[i].y)) {
          player.size += this.config.foodSize;
          this.removeFood(i);
          i--;
        }
      }
    }

  for (var i = 0; i < this.playersLength; i++) {
    var Player = this.players[i];
    if (player == Player || !this.touching(player, Player))
      continue;

    if (player.size > Player.size * this.config.bonusToEat) {
      player.sizeVel += Player.size * (1 - this.config.sizeVelDecay);
      this.removePlayer(Player);
    } else if (Player.size > player.size * this.config.bonusToEat) {
      Player.sizeVel += player.size * (1 - this.config.sizeVelDecay);
      this.removePlayer(player);

      return;
    }
  }
}

GameServer.prototype.decayPlayer = function(player) {
  player.size = player.size * (1 - this.config.scoreDecay);
}

GameServer.prototype.updatePlayerSize = function(player) {
  player.size += player.sizeVel;
  player.sizeVel *= this.config.sizeVelDecay;
}

GameServer.prototype.updateMaxSpeed = function(player) {
  player.maxSpeed = 2.5 / this.getRadius(player) * 17;
}

GameServer.prototype.getTime = function() {
  var date = new Date();
  return date.getTime();
}

GameServer.prototype.leap = function(id) { // Boost the player when he press SPACE
  var index = this.playerIds[id];
  if (index == undefined)
    return;

  player = this.players[index];
  if (player.lastLeap + player.size * 3 > this.getTime())
    return;
  player.lastLeap = this.getTime();
  var angle = (360 - player.angle) / 180 * Math.PI - Math.PI;

  player.velX = this.getRadius(player) / 5 * Math.sin(angle);
  player.velY = this.getRadius(player) / 5 * Math.cos(angle);
}

GameServer.prototype.isDisconnected = function(player) {
  return player.isDisconnected;
}

GameServer.prototype.mainLoop = function() {
  // Update clients
  this.playerHandler.updateClients()

  for (var i = 0; i < this.playersLength; i++) {
    var player = this.players[i];

    this.movePlayer(player); // Move player
    this.updatePlayerSize(player); // Update his size
    this.decayPlayer(player); // As time went player's size will decrease
    this.updateMaxSpeed(player); // Update player's max speed

    if (player.toRemove == true || // Handle eaten players 
      player.size < this.config.startSize * 1.5 && this.isDisconnected(player)) { // Handle disconnections

      if (player.type != "feed") {
        // Emit an 'died' massage (for the modal to apear);
        var id = player.id;
        var j = 0;
        while (this.clients[j].id != id)
          j++
          this.clients[j].socket.emit('died', true);

        this.clients.splice(j, 1);
      }

      // Remove the player
      this.removeId(player);
      this.players.splice(i, 1);
      this.playersLength--;

      for (var j = i; j < this.playersLength; j++) {
        this.playerIds[this.players[j].id]--;
      }
      i--;
    } else if (player.type == "feed" && (player.last + this.config.feedRemoveTime < this.getTime() || player.toRemove == true)) {
    // Handle timed out food
      this.removeId(player);
      this.players.splice(i, 1);
      this.playersLength--;

      for (var j = i; j < this.playersLength; j++) {
        this.playerIds[this.players[j].id]--;
      }
      i--;
    }
  }

  // Sort players by size
  for (var i = 1; i < this.playersLength; i++) {
    if (this.players[i].size > this.players[i - 1].size) {
      var aux = this.players[i];
      this.players[i] = this.players[i - 1];
      this.players[i - 1] = aux;

      this.playerIds[this.players[i].id] = i;
      this.playerIds[this.players[i - 1].id] = i - 1;
    }
  }

  // Refill eaten food
  while (this.foodLength < this.config.minFood) {
    this.addFood();
  }

  this.tick++;
}
