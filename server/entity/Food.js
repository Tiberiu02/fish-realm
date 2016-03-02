function Food(gameServer){
  this.gameServer = gameServer;

  this.x = this.randomCoord();
  this.y = this.randomCoord();
  
  this.chunkX = Math.floor( this.x / this.gameServer.config.chunkSize );
  this.chunkY = Math.floor( this.y / this.gameServer.config.chunkSize );
  
  this.chunkIndex = this.chunkX * this.gameServer.config.chunks + this.chunkY;
  this.chunksLength = this.gameServer.config.chunks * this.gameServer.config.chunks;
  
  this.size = 1;
  
  this.color = this.randomColor();
  this.angle = this.randomAngle();
}

module.exports = Food;

Food.prototype.randomCoord = function() {
  return Math.random() * this.gameServer.config.areaSize;
}

Food.prototype.randomColor = function() {
  var rand = Math.floor(Math.random() * 3);
  if (rand == 0)
    return "#FF" + (Math.random() * 0xFF << 0).toString(16) + "00";
  else if (rand == 1)
    return "#00" + "FF" + (Math.random() * 0xFF << 0).toString(16);
  else
    return "#" + (Math.random() * 0xFF << 0).toString(16) + "00FF";
};

Food.prototype.randomAngle = function() {
  return Math.random() * Math.PI - Math.PI;
}

Food.prototype.remove = function(){
  var i = this.gameServer.chunkStart( this.chunkX, this.chunkY );
  var chunkEnd = this.gameServer.chunkEnd(this.chunkX, this.chunkY);
  while (i < chunkEnd && this.gameServer.food[i] != this)
    i ++;
    
  this.gameServer.food.splice(i, 1);
  this.gameServer.foodLength --;
  
  for (var i = this.chunkIndex + 1; i < this.chunksLength; i ++)
    this.gameServer.chunks[i] --;
}

Food.prototype.getRadius = function(){
  return this.size;
}
