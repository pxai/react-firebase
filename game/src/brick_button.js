class BrickButton extends Phaser.GameObjects.Sprite {
    constructor (scene, x, y, brick) {
        super(scene, x, y, brick.name);
        this.scene = scene;
        this.name = brick.name;
        this.brick = brick;

        this.scene.add.existing(this)

        this.description = this.scene.add.bitmapText(this.x, this.y - 128, "pixelFont", this.brick.description, 30).setDropShadow(0, 4, 0x222222, 0.9).setOrigin(0.5).setScrollFactor(0)
        this.description.visible = false;

        this.setListeners();
     }

     setListeners () {
          this.setInteractive();
        this.on("pointerdown", (pointer) => {
            if (this.scene.selectedBrick !== this.brick.name) {
              this.scene.chooseBrick(this.brick.name)
              this.setTint(0x00ff00)
              this.scene.buildTime = 0;
            } else {
              this.clearTint();
            }
        });

          this.on("pointerover", () => {
            this.description.visible = true;
            if (this.scene.selectedBrick !== this.brick.name) {
              this.setTint(0x3E6875);
            }

            if (this.scene.currentBlockSprite) this.scene.currentBlockSprite.visible = false;
          });

          this.on("pointerout", () => {
            this.description.visible = false;
            if (this.scene.selectedBrick !== this.brick.name) {
              this.clearTint();
            }
            if (this.scene.currentBlockSprite) this.scene.currentBlockSprite.visible = true;
          });
     }
  }

  export default BrickButton;