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
var highScore = 0;

// Init the game
function init() {
  // Get the canvas and context
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext("2d");
  
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  // Update canvas size to fit in the window
  setTimeout(updateCanvasSize, 10);
  // Add the game servers in the servers dropdown
  setTimeout(addServers, 10);
  // Load fish types
  setTimeout(loadFishTypes, 10);
  // Init input handler
  setTimeout(initInputHandler, 10);

  // Make the canvas visible
  setTimeout(showCanvas, 20);

  // Start rendering
  setTimeout(requestAnimationFrame, 20, render);
  // Show the modal
  setTimeout(showModal, 20);
  
  // Connect to the server via socket.io
  setTimeout(connectIo, 30);
}

function showCanvas() {
  document.getElementById('canvasDiv').style.display = "block";
}

// IMAGES
var fishR = [];
var fishL = [];

var myIndex; // Player's fish's index in the array

var serverName; // The server where the player is currently connected

// Function that connects you to a server
// can be used to play with friends
function connect(server) {
  var servers = document.getElementById("servers").options;
  var selectedServer = servers.selectedIndex;

  serverName = servers.item(selectedServer).text;
  
  console.log("Connected to " + serverName);
}

// The function that adds the servers to the dropdown
function addServers() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      var servers = JSON.parse(xhttp.responseText);
      
      for (var i = 0; i < servers.length; i++) {
        var node = document.createElement("OPTION");
        var textnode = document.createTextNode(servers[i]);

        node.appendChild(textnode);

        node.onclick = function() {
          connect(this.innerHTML)
        };
        document.getElementById("servers").appendChild(node);
      }
      
      connect(servers[0]);
    }
  };
  xhttp.open("GET", "/servers");
  xhttp.send();
}

var fishOptions = [];
var viewingFish = 0;
function loadFishTypes() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      types = JSON.parse(xhttp.responseText).fishTypes;
      
      for (var i = 0; i < types.length; i++) {
        var type = types[i];
      
        var fishId = type.id;
        fishR[fishId] = document.createElement("IMG");
        fishR[fishId].src = type.image_right;
        fishL[fishId] = document.createElement("IMG");
        fishL[fishId].src = type.image_left;
        
        var div = document.createElement("DIV");
        div.innerHTML = 
          "<h1>"+type.name+"</h1>\
          <img src="+type.image+" width='240px' height='240px' style='margin-right: 10px;'><br>\
          Start size: "+type.specs.startSize+"<br>\
          Speed: "+type.specs.speed+"<br>\
          Score from one food: "+type.specs.foodSize+"<br>\
          Leap time coefficient: "+type.specs.leapTimeCoefficient+"<br>\
          Score decay per second: "+(Math.floor(type.specs.scoreDecay * 6000000)/1000)+"%<br><br>\
          <button onclick='selectFish(\""+type.id+"\")' style='width: 140px;'><white>Select</white></button>";
        fishOptions.push(div);

        document.getElementById("selectFishModal").appendChild(div);
        div.style.display = "none";
      }
      fishOptions[0].style.display = "block";
    }
  };
  xhttp.open("GET", "/fish.json");
  xhttp.send();
}

function nextFish(){
   fishOptions[viewingFish].style.display = "none";
   viewingFish = (viewingFish + 1) % fishOptions.length;
   fishOptions[viewingFish].style.display = "block";
}

function prevFish(){
   fishOptions[viewingFish].style.display = "none";
   viewingFish = (viewingFish - 1 + fishOptions.length) % fishOptions.length;
   fishOptions[viewingFish].style.display = "block";
}

// The function called when you hit the play button
function play() {
  var name = $('#name').val();

  if (!isAlive) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState == 4 && xhttp.status == 200) {
        food = JSON.parse(LZString.decompressFromEncodedURIComponent(xhttp.responseText));
        socket.emit('play', name, serverName, selectedFish);
      }
    };
    xhttp.open("GET", "/map/" + serverName);
    xhttp.send();
  }

  hideModal();
}

var selectedFish = "solmon";
function selectFish(fishId){
  document.getElementById("selectedFish").src = fishId + ".png";
  selectedFish = fishId;
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

function visibleWidth() {
  return 100 * Math.sqrt(Math.sqrt(fish[myIndex].size));
}

function visibleHeight() {
  return 50 * Math.sqrt(Math.sqrt(fish[myIndex].size));
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
      var len = food.length;
      for (var i = 0; i < len; i ++) {
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
    
    // Draw fish
    for (var i = fish.length - 1; i >= 0; i--) {
      fish[i].imageR.width = fish[i].imageL.width = getRadius(i) * 1.5 * 1.31;
      fish[i].imageR.height = fish[i].imageL.height = getRadius(i) * 1.5 * 1.31;

      if (fish[i].angle >= 180)
        drawRotatedImage(fish[i].imageR, fish[i].x - fish[myIndex].x, fish[i].y - fish[myIndex].y, fish[i].angle);
      else
        drawRotatedImage(fish[i].imageL, fish[i].x - fish[myIndex].x, fish[i].y - fish[myIndex].y, fish[i].angle);

      if (fish[i].name.length) {
        ctx.font = "bold " + 30 * zoom * getRadius(i) / 60 + "px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(fish[i].name, canvas.width / 2 + (fish[i].x - fish[myIndex].x) * zoom, canvas.height / 2 + (fish[i].y - fish[myIndex].y + getRadius(i) * 1.3) * zoom);
      }
    } 
  } catch (e) {}
  
  // Keep rendering
  requestAnimationFrame(render);
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
      
    document.getElementById("leaderboard").style.display = "block";
    document.getElementById("score").style.display = "block";

    fish = [];
  });

  // Data updates
  
  // Leaderboard
  socket.on('leaderboard', function(data) {
    var leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = "<h1>Leaderboard</h1>";
    for (var i = 0; i < data.length; i ++)
      leaderboard.innerHTML += (i + 1) + ". " + data[i] + "<br>";
  });
  
  // Fish
  socket.on('fish', function(data) {
    for (var i = 0; i < data.fish.length; i++) {
      data.fish[i].imageR = fishR[data.fish[i].type];
      data.fish[i].imageL = fishL[data.fish[i].type];
    }
  
    fish = data.fish;
    myIndex = data.myIndex;
    
    highScore = Math.max(Math.floor(fish[myIndex].size), highScore);
    
    document.getElementById("score").innerHTML = "Score: " + Math.floor(fish[myIndex].size) + "<br>" + "Highscore: " + highScore;
  });
  
  // Food got eaten
  socket.on('food-remove', function(data) {
    var i = 0;
    while (i < food.length && (food[i].x != data.x || food[i].y != data.y))
      i ++;
    
    if (i < food.length)
      food.splice(i, 1);
  });
  
  // Food got added
  socket.on('food-add', function(data) {
    food.push(data);
  });
}
