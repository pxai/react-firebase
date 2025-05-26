class CustomBrick extends Phaser.GameObjects.Sprite {
    constructor (scene, x, y, name="brick0") {
        super(scene, x, y, name);
        this.scene = scene;
        this.name = name;
        this.setOrigin(0)
        this.scene.add.existing(this);
        this.isDestroyed = false;
        this.setListeners();
     }

     setListeners () {
        this.setInteractive();
      this.on("pointerdown", (pointer) => {
        this.scene.onABuiltBlock = true;
        if (this.scene.currentBlockSprite) {
          this.scene.currentBlockSprite.visible = false;

          if (this.scene.currentBlockSprite.texture.key === "fireball") {
            this.scene.ball.destroy()
            this.scene.ball = null
          }
        }
        this.remove();
      });

      this.on("pointerover", () => {
        this.setTint(0xff0000);
        this.scene.onABuiltBlock = true;
        if (this.scene.currentBlockSprite) this.scene.currentBlockSprite.visible = false;
      });

      this.on("pointerout", () => {
          this.clearTint();
          this.scene.onABuiltBlock = false;
        if (this.scene.currentBlockSprite) this.scene.currentBlockSprite.visible = true;
      });
    }

    remove () {
        //this.scene.playAudioRandomly("stone") // TODO
        this.scene.onABuiltBlock = false;
        this.scene.buildTime = 0;
        const {x, y} = this;
        this.isDestroyed = true;
        this.scene.bricks = this.scene.bricks.filter(brick => brick.x !== x || brick.y !== y)
        this.scene.customBricks = this.scene.customBricks.filter(brick => brick.x !== x || brick.y !== y)
        this.destroy();

    }
  }

  export default CustomBrick;