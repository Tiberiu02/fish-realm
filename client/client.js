var canvas; // The Game Canvas
var ctx; // The Game Context

var socket; // The socket

var gridDensity = 40; // The relative distance between each two lines of the grid

var realZoom = 1.75; // The zoom relative to fish's size
var zoom = 1.5; // The real zoom

// For smooth zoom in and zoom out
var zoomVel = 0;
var zoomDecay = 29 / 30;

// Is the player playing ?
var isAlive = false;

// The leaderboard
var leaderboard = [];

// Init the game
function init() {
  // Get the canvas and context
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext("2d");

  // Update canvas size to fit in the window
  setTimeout(updateCanvasSize, 10);
  // Connect to the server via socket.io
  setTimeout(connectIo, 10);
  // Add the game servers in the servers dropdown
  setTimeout(addServers, 10);
  // Init input handler
  setTimeout(initInputHandler, 10);

  // Make the canvas visible
  setTimeout(showCanvas, 20);

  // Start rendering
  setTimeout(render, 20);
  // Show the modal
  setTimeout(showModal, 20);
}

function showCanvas() {
  document.getElementById('canvasDiv').style.display = "block";
}

// IMAGES
// Fish looking right
var fishR = document.createElement("img");
fishR.src = "fish-r.png";
fishR.width = 693;
fishR.height = 910;
// Fish looking left
var fishL = document.createElement("img");
fishL.src = "fish-l.png";
fishL.width = 693;
fishL.height = 910;

var myIndex; // Player's fish's index in the array

var serverName; // The server where the player is currently connected

// Function that connects you to a server
// can be used to play with friends
function connect(server) {
  serverName = server;
  document.getElementById("consv").innerHTML = server;
  
  console.log("Connected to " + server);
}

// The function that adds the servers to the dropdown
function addServers() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      var servers = JSON.parse(xhttp.responseText);
      
      for (var i = 0; i < servers.length; i++) {
        var b = document.createElement("BLUE");
        var node = document.createElement("LI");
        var textnode = document.createTextNode(servers[i]);

        node.appendChild(textnode);
        b.appendChild(node);

        node.onclick = function() {
          connect(this.innerHTML)
        };
        document.getElementById("servers").appendChild(b);
      }
      
      connect(servers[0]);
    }
  };
  xhttp.open("GET", "/servers");
  xhttp.send();
}

// The function called when you hit the play button
function play() {
  var name = $('#name').val();

  if (!name.replace(/\s/g, '').length)
    return;

  if (!isAlive) {
    socket.emit('play', name, serverName);
  }

  hideModal();
}

function getRadius(fishIndex){
	return Math.sqrt(fish[fishIndex].size);
}

function drawRotatedImage(image, x, y, angle) {
  x *= zoom;
  y *= zoom;
  
  angle = (360 - angle) * Math.PI / 180;

  ctx.save();
  ctx.translate(x + canvas.width / 2, y + canvas.height / 2);
  ctx.rotate(angle);
  ctx.drawImage(image, Math.floor(-(image.width / 2) * zoom), Math.floor(-(image.height / 2) * zoom), Math.floor(image.width * zoom), Math.floor(image.height * zoom));
  ctx.restore();
}

function updateCanvasSize() { // Is called when the window is resized
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

var gridColor = "#009ccc"; // Gird color
var backgroundColor = "#00aada"; // Background color

// The function that draws the grid
function drawGrid() {
  var opts = {
    distance: gridDensity * zoom,
    lineWidth: 1 * zoom,
    gridColor: gridColor,
    caption: true,
    horizontalLines: true,
    verticalLines: true
  };

  ctx.save();
  ctx.translate(-((fish[myIndex].x % gridDensity) * zoom - (canvas.width / 2 % (gridDensity * zoom)) + gridDensity * zoom), -((fish[myIndex].y % gridDensity) * zoom - (canvas.height / 2 % (gridDensity * zoom)) + gridDensity * zoom));
  new Grid(opts).draw(ctx);
  ctx.restore()
}

function zoomIn() {
  zoomVel += 0.2 * (1 - zoomDecay);
}

function zoomOut() {
  zoomVel -= 0.2 * (1 - zoomDecay);
}

var maxZoom = 2.4;
var minZoom = 1.35;

var foodColor = "#00FF00";
var sizeColor = "#DDDDFF";

function render() {
  try { // A try block in case any error occurs
    // clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // smooth zoom with velocicty
    realZoom *= 1 + zoomVel;
    zoomVel *= zoomDecay;

    realZoom = Math.min(maxZoom, Math.max(minZoom, realZoom));

    zoom = realZoom / Math.sqrt(Math.sqrt(fish[myIndex].size)) * 5;

    // If grid is enabled in settings
    if (document.getElementById('grid').checked)
      // Draw it
      drawGrid();

    // If food color is enabled in settings
    if (document.getElementById('foodColor').checked) {
      // Draw each food with his own color
      for (var i = 0; i < food.length; i++) {
        var x = (food[i].x - fish[myIndex].x) * zoom + canvas.width / 2;
        var y = (food[i].y - fish[myIndex].y) * zoom + canvas.height / 2;
        if (x > canvas.width || y > canvas.height || x < 0 || y < 0)
          continue;

        ctx.beginPath();
        ctx.moveTo(Math.floor(x - Math.sin(food[i].angle) * zoom * 4), Math.floor(y - Math.cos(food[i].angle) * zoom * 4));
        ctx.lineTo(Math.floor(x + Math.sin(food[i].angle) * zoom * 4), Math.floor(y + Math.cos(food[i].angle) * zoom * 4));
        ctx.lineWidth = zoom * 2;
        ctx.closePath();
        ctx.strokeStyle = food[i].color;
        ctx.stroke();
      }
    // If food color is disabled
    } else {
      // Draw all foods with the same color
      ctx.beginPath();
      for (var i = 0; i < food.length; i++) { // Draw food
        var x = (food[i].x - fish[myIndex].x) * zoom + canvas.width / 2;
        var y = (food[i].y - fish[myIndex].y) * zoom + canvas.height / 2;
        if (x > canvas.width || y > canvas.height || x < 0 || y < 0)
          continue;

        ctx.moveTo(Math.floor(x - Math.sin(food[i].angle) * zoom * 4), Math.floor(y - Math.cos(food[i].angle) * zoom * 4));
        ctx.lineTo(Math.floor(x + Math.sin(food[i].angle) * zoom * 4), Math.floor(y + Math.cos(food[i].angle) * zoom * 4));
        ctx.lineWidth = zoom * 2;
      }
      ctx.closePath();
      ctx.strokeStyle = "#0F0";
      ctx.stroke();
    }

    if (leaderboard.length) {
      // Draw fish
      for (var i = fish.length - 1; i >= 0; i--) {
        fish[i].imageR.width = fish[i].imageL.width = getRadius(i) * 1.5;
        fish[i].imageR.height = fish[i].imageL.height = getRadius(i) * 1.5 * 1.31;

        if (fish[i].angle >= 180)
          drawRotatedImage(fish[i].imageR, fish[i].x - fish[myIndex].x, fish[i].y - fish[myIndex].y, fish[i].angle);
        else
          drawRotatedImage(fish[i].imageL, fish[i].x - fish[myIndex].x, fish[i].y - fish[myIndex].y, fish[i].angle);

        ctx.font = "bold " + 30 * zoom * getRadius(i) / 60 + "px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(fish[i].name, canvas.width / 2 + (fish[i].x - fish[myIndex].x) * zoom, canvas.height / 2 + (fish[i].y - fish[myIndex].y + getRadius(i) * 1.7) * zoom);
      }

      // Write 'Leaderboard'
      ctx.font = "bold 25px Arial";
      ctx.textAlign = "left";
      ctx.fillStyle = "#EEEEFF";
      ctx.fillText("Leaderboard", canvas.width - 200, 40);

      // Write the leaderboard
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "left";
      ctx.fillStyle = sizeColor;
      for (i = 0; i < leaderboard.length; i++) {
        ctx.fillText((i + 1) + ". " + leaderboard[i], canvas.width - 190, 80 + 25 * i);
      }

      // Write player's score
      ctx.font = "bold 30px Arial";
      ctx.fillStyle = sizeColor;
      ctx.textAlign = "left";
      ctx.fillText("Score: " + Math.floor(fish[myIndex].size), 10, 30);
    }
  } catch (e) {}
  
  // Keep rendering
  setTimeout(render, 1);
}

function connectIo() {
  // Open the socket
  socket = io();

  socket.on('died', function() {
    isAlive = false;
    showModal();
  });

  // Server's response to 'play'
  socket.on('play', function() {
    isAlive = true;

    food = [];
    fish = [];
  });

  // Data update package
  // Coming 60 times per second
  socket.on('update', function(data) {
    leaderboard = data.lederboard;
    for (var i = 0; i < data.fish.length; i++) {
      data.fish[i].imageR = fishR;
      data.fish[i].imageL = fishL;
    }

    for (var i = 0; i < data.food.remove.length; i++)
      food.splice(data.food.remove[i], 1);

    for (var i = 0; i < data.food.new.length; i++)
      food.push(data.food.new[i]);

    fish = data.fish;
    myIndex = data.myIndex;
  });
}
