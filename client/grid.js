//enterprisbug.github.com/grid.js#v1.1
(function(window, document, undefined) {
  function mergeWithDefaultValues(obj) {
    for (var i = 1; i < arguments.length; i++) {
      var def = arguments[i];
      for (var n in def) {
        if (obj[n] === undefined) {
          obj[n] = def[n];
        }
      }
    }
    return obj;
  }

  var defaults = {
    distance: 50,
    lineWidth: 1,
    gridColor: "#000000",
    caption: true,
    font: "10px Verdana",
    verticalLines: true,
    horizontalLines: true
  };

  /** The constructor */
  var Grid = function Grid(o) {
    if (!this.draw) return new Grid(o);
    this.opts = mergeWithDefaultValues(o || {}, Grid.defaults, defaults);
  };

  Grid.defaults = {};
  mergeWithDefaultValues(Grid.prototype, {
    draw: function(target) {
      var self = this;
      var o = self.opts;

      if (target) {
        target.lineWidth = o.lineWidth;
        target.strokeStyle = o.gridColor;
        target.font = o.font;

        if (target.canvas.width > target.canvas.height) {
          until = target.canvas.width + gridDensity * zoom;
        } else {
          until = target.canvas.height + gridDensity * zoom;
        }

        // vertical lines
        for (var y = -(gridDensity * zoom); y <= until; y += o.distance) {
          if (o.horizontalLines) {
            target.beginPath();
            if (o.lineWidth == 1.0) {
              target.moveTo(-(gridDensity * zoom), y + 0.5);
              target.lineTo(target.canvas.width + gridDensity * zoom * 2, y + 0.5);
            } else {
              target.moveTo(-(gridDensity * zoom), y);
              target.lineTo(target.canvas.width + gridDensity * zoom * 2, y);
            }
            target.closePath();
            target.stroke();
          }
          if (o.caption && o.verticalLines) {
            target.fillText(y, y, 10);
          }
        }

        // horizontal lines
        for (var x = -(gridDensity * zoom); x <= until; x += o.distance) {
          if (o.verticalLines) {
            target.beginPath();
            if (o.lineWidth == 1.0) {
              target.moveTo(x + 0.5, -(gridDensity * zoom));
              target.lineTo(x + 0.5, target.canvas.height + gridDensity * zoom * 2);
            } else {
              target.moveTo(x, -(gridDensity * zoom));
              target.lineTo(x, target.canvas.height + gridDensity * zoom * 2);
            }
            target.closePath();
            target.stroke();
          }
          if (o.caption && o.horizontalLines) {
            target.fillText(x, 0, x);
          }
        }

      }
    }
  });

  window.Grid = Grid;

})(window, document);
