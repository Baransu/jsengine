var SpriteRenderer = (function() {

  var SpriteRenderer = function SpriteRenderer(args) {

    this.sprite = args.sprite; // || TODO: add placeholder graphics
    this.layer = args.layer || 0;
    this._sprite = new Image();
    this.size = new Vec2();

    // @ifdef EDITOR
    this.type = "sprite";
    this._editorName = "SpriteRenderer"
    // @endif
  };

  SpriteRenderer.prototype = {

    render: function render(self, camera) {

      var layer = camera.layer;

      layer.ctx.save();

      if(this._sprite) {
        if(this._sprite.src != this.sprite && AMBLE.loader.isDone()) {
          this._sprite = AMBLE.loader.getAsset(this.sprite);
          if(!this._sprite) return;
        }

        var width = this.size.x = this._sprite.width;
        var height = this.size.y = this._sprite.height;
        var x = self.transform.position.x - camera.view.x;
        var y = self.transform.position.y - camera.view.y;

        layer.ctx.translate(x, y);

        // TODO: add if
        layer.ctx.scale(self.transform.scale.x, self.transform.scale.y);

        // TODO: add if
        layer.ctx.rotate(-self.transform.rotation * Mathf.TO_RADIANS);

        if(this._sprite.src) {
          layer.ctx.drawImage(this._sprite, -width/2, -height/2);

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
        }

      } else {
        // TODO: change to correct instance
        this._sprite = AMBLE.loader.getAsset(this.sprite);
      }

      layer.ctx.restore();
    }
  };

  return SpriteRenderer;

}());
