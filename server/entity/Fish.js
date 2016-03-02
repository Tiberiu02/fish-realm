function Fish(gameServer){
  this.angle = 0;
	this.speed = 0;
	
	this.size = 0;
	this.sizeVel = 0;
	
	this.x = 0;
	this.y = 0;
	this.velX = 0;
	this.velY = 0;
	
	this.name = "";
	this.gameServer = gameServer;
}

module.exports = Fish;

Fish.prototype.getRadius = function(){
  return Math.sqrt(this.size);
}

Fish.prototype.remove = function(){
  this.toRemove = true;
}

Fish.prototype.updateSize = function() {
  this.size += this.sizeVel;
  this.sizeVel *= this.gameServer.config.sizeVelDecay;
}

Fish.prototype.move = function() {
  var config = this.gameServer.config;

  if (this.isDead())
    return;

  var speed = this.speed;
  var angle = (360 - this.angle) / 180 * Math.PI - Math.PI; // Convert the angle from degrees 
  this.x -= ((speed * Math.sin(angle)) + this.velX * 3);
  this.y += ((speed * Math.cos(angle)) + this.velY * 3);

  this.x = Math.min(config.areaSize - this.getRadius(), Math.max(this.getRadius(), this.x));
  this.y = Math.min(config.areaSize - this.getRadius(), Math.max(this.getRadius(), this.y));

  this.velX *= config.speedVelDecay;
  this.velY *= config.speedVelDecay;

  if ( !this.isPlayer() )
    return;

  var chunkTop = Math.floor((this.x - this.getRadius()) / config.chunkSize);
  var chunkLeft = Math.floor((this.y - this.getRadius()) / config.chunkSize);
  var chunkBottom = Math.floor((this.x + this.getRadius()) / config.chunkSize);
  var chunkRight = Math.floor((this.y + this.getRadius()) / config.chunkSize);

  for (var x = chunkTop; x <= chunkBottom; x++)
    for (var y = chunkLeft; y <= chunkRight; y++) {
      for (var i = this.gameServer.chunkStart(x, y); i < this.gameServer.chunkEnd(x, y); i++) {
        var food = this.gameServer.food[i];
        
        if (this.canEat(food)) 
          this.consume(food);
      }
    }

  for (var i = 0; i < this.gameServer.fishLength; i++) {
    var Player = this.gameServer.fish[i];
    
    if (this.canEat(Player))
      this.consume(Player);
  }
}

Fish.prototype.remove = function() {
  this.toRemove = true;
}

Fish.prototype.isDead = function() {
  return (this.toRemove == false);
}

Fish.prototype.decay = function() {
  this.size = this.size * (1 - this.gameServer.config.scoreDecay);
}

Fish.prototype.getDist = function(entity) {
  var deltaX = entity.x - this.x;
  var deltaY = entity.y - this.y;
  return Math.sqrt( deltaX * deltaX + deltaY * deltaY );
}

Fish.prototype.canEat = function(entity) {
  return ( this.size > entity.size * this.gameServer.config.bonusToEat && this.getRadius() > this.getDist(entity) );
}

Fish.prototype.consume = function(entity) {
  this.sizeVel += entity.size * (1 - this.gameServer.config.sizeVelDecay);
  entity.remove();
}

Fish.prototype.isPlayer = function() {
  return false;
}
