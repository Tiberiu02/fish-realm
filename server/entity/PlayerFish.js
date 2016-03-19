var fs = require("fs");
var path = require('path');

var Fish = require("./Fish");

function PlayerFish(socket, name, gameServer, fishType){
  Fish.apply(this, Array.prototype.slice.call(arguments));
  
  this.name = name;
	this.type = "player";
	this.lastLeap = 0;
	this.id = this.randomString(5);
	
	this.fishType = fishType;
	
	this.gameServer = gameServer;
	this.socket = socket;
	
	this.x = this.randomCoord();
	this.y = this.randomCoord();
	
	this.leaderboardUpdateTick = 1;
	
  var fishTypes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "fish.json"), 'utf-8')).fishTypes;
	var i = 0;
	while (i < fishTypes.length && fishTypes[i].id != fishType)
	  i ++;
	  
  this.specs = (i == fishTypes.length) ? fishTypes[0].specs : fishTypes[i].specs;
	
	this.size = this.specs.startSize;
}

module.exports = PlayerFish;
PlayerFish.prototype = new Fish(this.gameServer);

PlayerFish.prototype.randomCoord = function() {
  return Math.random() * this.gameServer.config.areaSize;
}

PlayerFish.prototype.maxSpeed = function(){
  return this.specs.speed / (this.getRadius() * Math.sqrt(this.getRadius()));
}

PlayerFish.prototype.updateMouse = function(angle, speed){
  this.angle = angle;
	this.speed = Math.min(this.maxSpeed(), Math.max(0, speed));
}

PlayerFish.prototype.randomString = function(length){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i = 0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

PlayerFish.prototype.getVisibleWidth = function(){
  return this.gameServer.config.visibleWidth * Math.sqrt(this.getRadius());
}

PlayerFish.prototype.getVisibleHeight = function(){
  return this.gameServer.config.visibleHeight * Math.sqrt(this.getRadius());
}

PlayerFish.prototype.isVisible = function(entity){
  return Math.abs(entity.x - this.x) < this.getVisibleWidth() + entity.getRadius() && 
         Math.abs(entity.y - this.y) < this.getVisibleHeight() + entity.getRadius();
}

// Client's data updater
PlayerFish.prototype.update = function(){
  // Player's range
	var width = this.getVisibleWidth();
	var height = this.getVisibleHeight();

	// Create the update package
	var fish = [];
	var myIndex;

	// Add fish
	for (var i = 0; i < this.gameServer.fishLength; i ++){
		var Fish = this.gameServer.fish[i];

		if (this == Fish)
			myIndex = fish.length;

		if (this.isVisible(Fish)) 
			fish.push({
				x: Fish.x,
				y: Fish.y,
				angle: Fish.angle,
				size: Fish.size,
				name: Fish.name,
				type: Fish.fishType == undefined ? 'solmon' : Fish.fishType
			});
	}
	
	this.socket.emit('fish', {fish: fish, myIndex: myIndex});
	
	this.leaderboardUpdateTick --;
	
	if ( !this.leaderboardUpdateTick )
	  return;
	  
  this.leaderboardUpdateTick = this.gameServer.config.leaderboardUpdateTicks;
	
	var leaderboard = [];

	// Add leaderboard
	for (var i = 0; i < this.gameServer.config.leaderboardLength && i < this.gameServer.fishLength; i ++)
		if ( this.gameServer.fish[i].isPlayer() ) {
		  var name = this.gameServer.fish[i].name;
		  
		  if (!name.replace(/\s/g, '').length)
			  leaderboard.push(this.gameServer.config.defaultName);
			else
			  leaderboard.push(name);
		}

	this.socket.emit('leaderboard', leaderboard);
}

PlayerFish.prototype.leap = function(){ // Boost the player when he press SPACE
	if (this.lastLeap + this.size * this.specs.leapTimeCoefficient > this.gameServer.getTime())
		return;

	this.lastLeap = this.gameServer.getTime();

	var angle = (360 - this.angle) / 180 * Math.PI - Math.PI;
	var dist = Math.sqrt(this.getRadius()) * (1 - this.gameServer.config.speedVelDecay) * this.gameServer.config.leapToRadiusRatio;

  this.velX += dist * Math.sin(angle);
  this.velY += dist * Math.cos(angle);
}

PlayerFish.prototype.feed = function(id){ // Boost the player when he press SPACE
  if (this.size + this.sizeVel / (1 - this.gameServer.config.sizeVelDecay) < this.gameServer.config.minSizeFeed)
		return;

	var angle = (360 - this.angle) / 180 * Math.PI - Math.PI;

	var feed = new Fish(this.gameServer);
	
	feed.angle = this.angle;
	feed.size = this.gameServer.config.feedSize;
	feed.x = this.x - Math.sin(angle) * this.getRadius() * 1.2;
	feed.y = this.y + Math.cos(angle) * this.getRadius() * 1.2;
	feed.velX = Math.sin(angle) * this.gameServer.config.feedSpeed;
  feed.velY = Math.cos(angle) * this.gameServer.config.feedSpeed;
	feed.type = "feed";

	this.gameServer.fish.push(feed);

	this.sizeVel -= this.gameServer.config.feedSize * (1 - this.gameServer.config.sizeVelDecay);
	this.gameServer.fishLength ++;
}

PlayerFish.prototype.decay = function() {
  this.size = this.size * (1 - this.gameServer.config.scoreDecay);
}

PlayerFish.prototype.isPlayer = function() {
  return true;
}
