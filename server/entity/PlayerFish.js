var Fish = require("./Fish");

function PlayerFish(socket, name, gameServer){
  Fish.apply(this, Array.prototype.slice.call(arguments));
  
  this.name = name;
	this.type = "player";
	this.lastLeap = 0;
	this.id = this.randomString(5);
	this.visibleFood = [];
	this.foodTick = 0;
	
	this.gameServer = gameServer;
	this.socket = socket;
	
	this.x = this.randomCoord();
	this.y = this.randomCoord();
	
	this.size = this.gameServer.config.startSize;
}

module.exports = PlayerFish;
PlayerFish.prototype = new Fish(this.gameServer);

PlayerFish.prototype.randomCoord = function() {
  return Math.random() * this.gameServer.config.areaSize;
}

PlayerFish.prototype.maxFishSpeed = function(){
  return 2.5 / this.getRadius() * Math.sqrt(this.gameServer.config.startSize);
}

PlayerFish.prototype.updateMouse = function(angle, speed){
  this.angle = angle;
	this.speed = Math.min(this.maxFishSpeed(), Math.max(0, speed));
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
	var updatePackage = {fish: [], food: {new: [], remove: []}, lederboard: []};

	// Add leaderboard
	for (var i = 0; i < this.gameServer.config.topLength && i < this.gameServer.fishLength; i ++)
		if ( this.gameServer.fish[i].isPlayer() )
			updatePackage.lederboard.push(this.gameServer.fish[i].name);

	// Add fish
	for (var i = 0; i < this.gameServer.fishLength; i ++){
		var Fish = this.gameServer.fish[i];

		if (this == Fish)
			updatePackage.myIndex = updatePackage.fish.length;

		if (this.isVisible(Fish)) 
			updatePackage.fish.push({
				x: Fish.x,
				y: Fish.y,
				angle: Fish.angle,
				size: Fish.size,
				name: Fish.name
			});
	}

	if (!this.foodTick){
	  // Remove eaten food, and food that gets out of player's range
	  for (var i = this.visibleFood.length - 1; i >= 0; i --){
	    var food = this.visibleFood[i];
	    
		  if (!this.gameServer.isFood(food) || !this.isVisible(food)){
			  updatePackage.food.remove.push(i >> 0);
			  this.visibleFood.splice(i, 1);
		  }
		}

		// Add food that gets in range
		var chunkTop = Math.max(0, Math.floor((this.x - width) / this.gameServer.config.chunkSize));
		var chunkLeft = Math.max(0, Math.floor((this.y - height) / this.gameServer.config.chunkSize));
		var chunkBottom = Math.min(this.gameServer.config.chunks - 1, Math.floor((this.x + width) / this.gameServer.config.chunkSize));
		var chunkRight = Math.min(this.gameServer.config.chunks - 1, Math.floor((this.y + height) / this.gameServer.config.chunkSize));

		for (var x = chunkTop; x <= chunkBottom; x ++)
			for (var y = chunkLeft; y <= chunkRight; y ++) {
				var chunkEnd = this.gameServer.chunkEnd(x, y)
				for (var i = this.gameServer.chunkStart(x, y); i < chunkEnd; i ++){
				  var food = this.gameServer.food[i];
				  
					if (this.isVisible(food) && this.visibleFood.indexOf(this.gameServer.food[i]) == -1) {
						updatePackage.food.new.push({x: food.x, y: food.y, color: food.color, angle: food.angle});
						this.visibleFood.push(food);
					}
				}
			}
	}
	this.foodTick = (this.foodTick + 1) % this.gameServer.config.foodUpdateTicks;

	// return the update package
	this.socket.emit('update', updatePackage);
}

PlayerFish.prototype.leap = function(){ // Boost the player when he press SPACE
	if (this.lastLeap + this.size * 3 > this.gameServer.getTime())
		return;

	this.lastLeap = this.gameServer.getTime();

	var angle = (360 - this.angle) / 180 * Math.PI - Math.PI;
	var dist = Math.sqrt(this.getRadius()) * (1 - this.gameServer.config.speedVelDecay) * this.gameServer.config.leapToRadiusRatio;

  this.velX = dist * Math.sin(angle);
  this.velY = dist * Math.cos(angle);
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
