// A palette button in the editor's left column. One per placeable element,
// plus the eraser. Selecting one makes it the brick the pointer will place.
const TOOLTIP_GAP = 26;

class BrickButton extends Phaser.GameObjects.Sprite {
    constructor (scene, x, y, brick, { tooltipSide = "right", tooltipSize = 20 } = {}) {
        // A palette entry may draw with a different texture than it stores
        // (e.g. the platforms reuse the rotator tile). The icon itself always
        // stays at its natural size, however wide the placed element is.
        super(scene, x, y, brick.texture || brick.name);
        this.scene = scene;
        this.name = brick.name;
        this.brick = brick;

        this.scene.add.existing(this)

        // The buttons live in a narrow gutter, so the label goes beside the
        // button rather than above it, where it would fall off the canvas.
        const toLeft = tooltipSide === "left";
        this.description = this.scene.add
          .bitmapText(
            this.x + (toLeft ? -TOOLTIP_GAP : TOOLTIP_GAP),
            this.y,
            "pixelFont",
            this.brick.description,
            tooltipSize
          )
          .setDropShadow(0, 4, 0x222222, 0.9)
          .setOrigin(toLeft ? 1 : 0, 0.5)
          .setScrollFactor(0)
          .setDepth(100);
        this.description.visible = false;

        this.setListeners();
     }

     get isSelected () {
       return this.scene.selectedBrick === this.brick.name;
     }

     // Sized elements show their current length, since the only other cue is
     // the ghost cursor's width.
     refreshLabel () {
       this.description.setText(this.scene.describe(this.brick));
     }

     setListeners () {
        this.setInteractive();

        this.on("pointerdown", () => {
            if (!this.isSelected) {
              this.scene.chooseBrick(this.brick.name)
              this.setTint(0x00ff00)
              this.scene.buildTime = 0;
              this.refreshLabel();
              return;
            }

            // Clicking a sized element again makes it longer (and wraps round
            // at the maximum). Everything else deselects.
            if (this.brick.sized) {
              this.scene.growBrick(this.brick.name);
              this.setTint(0x00ff00);
              this.refreshLabel();
            } else {
              this.scene.unselectBrick();
            }
        });

        this.on("pointerover", () => {
          this.description.visible = true;
          if (!this.isSelected) this.setTint(0x3E6875);
        });

        this.on("pointerout", () => {
          this.description.visible = false;
          if (!this.isSelected) this.clearTint();
        });
     }
  }

  export default BrickButton;
