var GameServer = require('./GameServer');
var Commands = require('./modules/CommandList');

var express = require('express');
var compress = require('compression');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var LZString = require('lz-string');

var app = new express();

var http = require('http').Server(app);

var io = require('socket.io')(http);

app.use(compress());
app.use(express.static('public'));

app.get('/', function(req, res) {
  res.sendFile('/index.html', {
    'root': '' + __dirname + '/../client'
  });
})

app.get('/servers', function(req, res) {
  res.end(JSON.stringify(serversNames));
})

app.get('/map/:server', function(req, res) {
  var server = req.params.server;
  if (gameServer[server] == undefined) {
    res.end("");
    return;
  }

  var map = [];
  for (i = 0; i < gameServer[server].foodLength; i ++)
    map.push({x: gameServer[server].food[i].x, y: gameServer[server].food[i].y, angle: gameServer[server].food[i].angle, color: gameServer[server].food[i].color});
  res.end(LZString.compressToEncodedURIComponent(JSON.stringify(map)));
})

app.get('/fish.json', function(req, res) {
  var filePath = path.join(__dirname, "..", "fish.json");
  res.sendFile(filePath);
})

app.get('/:file', function(req, res) {
  var file = req.params.file;
  var filePath = path.join(__dirname, "..", "client", file);

  if (fs.existsSync(filePath))
    res.sendFile(filePath);
  else
    res.end("Can't locate '/" + file + "'");
})

var server = http.listen(80, function() {
  console.log("Game is running at " + chalk.green("http://localhost"));
})

io.on('connection', function(socket) {
  var player;
  var server;

  socket.on('play', function(name, serverName, fishType) {
    if (gameServer[serverName] != undefined) {
      server = serverName;
      player = gameServer[server].newPlayer(name, socket, fishType);

      socket.emit('play');
    }
  });

  socket.on('feed', function() {
    if (player != undefined)
      player.feed();
  });

  socket.on('leap', function() {
    if (player != undefined)
      player.leap();
  });

  socket.on('mouse', function(angle, speed) {
    if (player != undefined)
      player.updateMouse(angle, speed);
  });

  socket.on('disconnect', function() {
    if (player != undefined)
        player.isDisconnected = true;
  });
});

var gameServer = [];
var serversNames = [];

setTimeout(function() {
  gameServer["GAME1"] = new GameServer();
  gameServer["GAME1"].start("GAME1");

  serversNames.push("GAME1");
}, 100);


var readline = require('readline');
var in_ = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

setTimeout(prompt, 100);

// Console functions

function prompt() {
  in_.question(">", function(str) {
    parseCommands(str);
    prompt();
  });
}

function parseCommands(str) {
  // Don't process ENTER
  if (str === '')
    return;

  // Splits the string
  var split = str.split(" ");

  // Process the first string value
  var first = split[0].toLowerCase();

  // Get command function
  var execute = Commands.list[first];
  if (typeof execute != 'undefined') {
    execute(gameServer, split, serversNames);
  } else {
    console.log(chalk.blue("[Console]") + " Invalid Command!");
  }
}
