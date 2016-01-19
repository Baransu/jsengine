var RectRenderer = (function() {

  var RectRenderer = function RectRenderer(args) {
    this.color = args.color || '#e91e63';
    this.layer = args.layer || 0;
    this.size = args.size || new Vec2(100, 100);

    // @ifdef EDITOR
    this.type = "rect";
    this._editorName = "RectRenderer";
    // @endif
  };

  RectRenderer.prototype = {

    render: function render(self, camera) {

      var layer = camera.layer;

      var width = this.size.x;
      var height = this.size.y;
      var x = self.transform.position.x - camera.view.x;
      var y = self.transform.position.y - camera.view.y;

      layer.ctx.save();

      // move origin to object origin
      layer.ctx.translate(x, y);

      //scale
      layer.ctx.scale(self.transform.scale.x, self.transform.scale.y);

      // rotation in radians
      layer.ctx.rotate(-self.transform.rotation * Mathf.TO_RADIANS);

      // draw
      layer.fillStyle(this.color)
        .fillRect(-width/2, -height/2, width, height);

      // @ifdef EDITOR
      if(self.selected) {

        layer.ctx.save();

        layer.strokeStyle(primaryColor)
          .lineWidth(3)
          .strokeRect(
            -width/2,
            -height/2,
            width,
            height
          );

          layer.ctx.restore();
      }
      // @endif

      layer.ctx.restore();
    }

  };

  return RectRenderer

}());
