var chalk = require("chalk");

function PlayerHandler(gameServer){
	this.gameServer = gameServer;
}

module.exports = PlayerHandler;

PlayerHandler.prototype.updateMouse = function(id, angle, speed){
	var index = this.gameServer.playerIds[id];
	if (index == undefined)
		return;

	var player = this.gameServer.players[index];

    player.angle = angle;
	player.speed = Math.min(player.maxSpeed, Math.max(0, speed));
}

PlayerHandler.prototype.randomString = function(length){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i = 0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

// Client's data updater
PlayerHandler.prototype.updateClient = function(id){
	var index = this.gameServer.playerIds[id];
	if (index == undefined)
		return "invalidid";

	var player = this.gameServer.players[index];

	// Player's range
	var width = this.gameServer.config.visibleWidth * Math.sqrt(this.gameServer.getRadius(player));
	var height = this.gameServer.config.visibleHeight * Math.sqrt(this.gameServer.getRadius(player));

	// Create the update package
	var updatePackage = {e: [], f: {n: [], r: []}, t: []};

	// Add leaderboad
	for (var i = 0; i < this.gameServer.config.topLength && i < this.gameServer.playersLength; i ++)
		if (this.gameServer.players[i].type != "feed")
			updatePackage.t.push(this.gameServer.players[i].name);

	// Add players
	for (var i = 0; i < this.gameServer.playersLength; i ++){
		var Player = this.gameServer.players[i];

		if (player == Player)
			updatePackage.myIndex = updatePackage.e.length;

		if (Math.abs(Player.x - player.x) < width + this.gameServer.getRadius(Player) && Math.abs(Player.y - player.y) < height + this.gameServer.getRadius(Player)) {
			updatePackage.e.push({
				x: Math.floor(Player.x * 10) / 10,
				y: Math.floor(Player.y * 10) / 10,
				angle: Player.angle,
				size: Math.floor(Player.size),
				name: this.gameServer.players[i].name
			});
		}
	}
	// Remove eaten food, and food that gets out of player's range
	for (var i = player.visibleFood.length - 1; i >= 0; i --)
		if (Math.abs(player.visibleFood[i].x - player.x) > width || Math.abs(player.visibleFood[i].y - player.y) > height 
		  || !this.gameServer.isFood(player.visibleFood[i])){
			updatePackage.f.r.push(i >> 0);
			player.visibleFood.splice(i, 1);
		}

	if (player.foodTick == this.gameServer.config.foodUpdateTicks){
		player.foodTick = 0;

		// Add food that gets in range
		var chunkTop = Math.floor((player.x - width) / this.gameServer.config.chunkSize);
		var chunkLeft = Math.floor((player.y - height) / this.gameServer.config.chunkSize);
		var chunkBottom = Math.floor((player.x + width) / this.gameServer.config.chunkSize);
		var chunkRight = Math.floor((player.y + height) / this.gameServer.config.chunkSize);

		for (var x = chunkTop; x <= chunkBottom; x ++)
			for (var y = chunkLeft; y <= chunkRight; y ++) {
				var chunkEnd = this.gameServer.chunkEnd(x, y)
				for (var i = this.gameServer.chunkStart(x, y); i < chunkEnd; i ++){
					if (Math.abs(this.gameServer.food[i].x - player.x) < width && Math.abs(this.gameServer.food[i].y - player.y) < height 
					  && player.visibleFood.indexOf(this.gameServer.food[i]) == -1) {
						updatePackage.f.n.push(this.gameServer.food[i]);
						player.visibleFood.push(this.gameServer.food[i]);
					}
				}
			}
	}

	player.foodTick ++;

	// return the update package
	return updatePackage;
}

PlayerHandler.prototype.updateClients = function(){
	for (var i = 0; i < this.gameServer.clients.length; i ++) {
		var client = this.gameServer.clients[i];

		var socket = client.socket;
		var id = client.id;
		
		socket.emit('update', this.updateClient(id));
	}
}

PlayerHandler.prototype.newPlayer = function(name, ip, socket){
	if (this.gameServer.playersLength >= this.gameServer.config.maxPlayers)
		return;

	var id = this.randomString(this.gameServer.config.idLength);

	this.gameServer.clients.push({socket: socket, id: id});
	
	this.gameServer.players.push({
		angle: 0,
		speed: 0.30,
		maxSpeed: 0.75,
		scale: 1.31,
		size: 1,
		x: this.gameServer.randomCoord(),
		y: this.gameServer.randomCoord(),
		velX: 0,
		velY: 0,
		sizeVel: this.gameServer.config.startSize * (1 - this.gameServer.config.sizeVelDecay),
		loadAll: true,
		damageRatio: 1 / 3,
		boost: 2.5,
		type: "fish",
		lastLeap: 0,
		id: id,
		last: this.gameServer.getTime(),
		ip: ip,
		name: name,
		visibleFood: [],
		foodTick: this.gameServer.config.foodUpdateTicks
	});
	
	this.gameServer.playerIds[id] = this.gameServer.playersLength;
	this.gameServer.playersLength ++;

	return id;
}

PlayerHandler.prototype.leap = function(id){ // Boost the player when he press SPACE
	var index = this.gameServer.playerIds[id];
	if (index == undefined)
		return;

	var player = this.gameServer.players[index];
	if (player.lastLeap + player.size * 3 > this.gameServer.getTime())
		return;

	player.lastLeap = this.gameServer.getTime();

	var angle = (360 - player.angle) / 180 * Math.PI - Math.PI;
	var dist = Math.sqrt(this.gameServer.getRadius(player)) * (1 - this.gameServer.config.speedVelDecay) * this.gameServer.config.leapToRadiusRatio;

    player.velX = dist * Math.sin(angle);
    player.velY = dist * Math.cos(angle);
}

PlayerHandler.prototype.feed = function(id){ // Boost the player when he press SPACE
	var index = this.gameServer.playerIds[id];
	if (index == undefined)
		return;

	var player = this.gameServer.players[index];

	if (player.size + player.sizeVel / (1 - this.gameServer.config.sizeVelDecay) < this.gameServer.config.minSizeFeed)
		return;

	var angle = (360 - player.angle) / 180 * Math.PI - Math.PI;

	var id = this.randomString(this.gameServer.config.idLength);
	this.gameServer.playerIds[id] = this.gameServer.playersLength;

	this.gameServer.players.push({
		angle: player.angle,
		speed: 0,
		maxSpeed: 0,
		scale: 1.31,
		size: this.gameServer.config.feedSize,
		x: player.x - Math.sin(angle) * this.gameServer.getRadius(player) * 1.2,
		y: player.y + Math.cos(angle) * this.gameServer.getRadius(player) * 1.2,
		velX: Math.sin(angle) * this.gameServer.config.feedSpeed,
		velY: Math.cos(angle) * this.gameServer.config.feedSpeed,
		sizeVel: 0,
		damageRatio: 1 / 3,
		boost: 2.5,
		type: "feed",
		lastLeap: 0,
		id: id,
		isDisconnected: false,
		ip: "feed",
		name: "",
		visibleFood: []
	})

	player.sizeVel -= this.gameServer.config.feedSize * (1 - this.gameServer.config.sizeVelDecay);
	this.gameServer.playersLength ++;
}

PlayerHandler.prototype.getStatus = function(){
	return {players: this.gameServer.playersLength, maxPlayers: this.gameServer.maxPlayers};
}
