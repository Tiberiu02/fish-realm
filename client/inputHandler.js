// Get the distance between two points
function getDist(deltaX, deltaY) {
  // Pythagoras's theorem
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

// Mouse handler
function updateMouse(event) {
  var deltaX = event.clientX - canvas.width / 2;
  var deltaY = event.clientY - canvas.height / 2;
  var angle = Math.atan2(deltaX, deltaY) / Math.PI * 180 + 180;

  var speed = Math.sqrt(Math.sqrt(Math.max(0, getDist(deltaX, deltaY) - 20)));

  socket.emit('mouse', angle, speed);
}

// Mouse wheel event
var content = document.getElementById("canvas");
if (content.addEventListener) {
  content.addEventListener("mousewheel", MouseWheelHandler, false); // IE9, Chrome, Safari, Opera
  content.addEventListener("DOMMouseScroll", MouseWheelHandler, false); // Firefox
} else
  content.attachEvent("onmousewheel", MouseWheelHandler); // IE 6/7/8

// Mouse wheel hander
function MouseWheelHandler(e) {
  var e = window.event || e;
  var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
  if (delta == 1)
    zoomIn();
  else
    zoomOut();
}

// Key press handler
var leapKey = ' ';
var feedKey = 'W';

function initInputHandler(){
  $(document).keyup(function(e) {
    if (e.keyCode == 27) {
      if (document.getElementById('myModal').style.display == "block")
        play();
      else
        showModal();
    } else if (String.fromCharCode(e.keyCode) == leapKey || String.fromCharCode(e.charCode) == leapKey)
      socket.emit('leap');
    else if (String.fromCharCode(e.keyCode) == feedKey || String.fromCharCode(e.charCode) == feedKey)
      socket.emit('feed');
  });
}
