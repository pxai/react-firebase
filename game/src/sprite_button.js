// An action button (save / play / exit / back). Shows its description beside
// the icon on hover, so it stays readable inside a narrow UI gutter.
const TOOLTIP_GAP = 26;

class SpriteButton extends Phaser.GameObjects.Sprite {
    constructor (scene, x, y, name, description, action, { tooltipSide = "right", tooltipSize = 20 } = {}) {
        super(scene, x, y, name);
        this.scene = scene;
        this.name = name;
        this.description = description;
        this.action = action;

        this.scene.add.existing(this)

        const toLeft = tooltipSide === "left";
        this.descriptionText = this.scene.add
          .bitmapText(
            this.x + (toLeft ? -TOOLTIP_GAP : TOOLTIP_GAP),
            this.y,
            "pixelFont",
            this.description,
            tooltipSize
          )
          .setDropShadow(0, 4, 0x222222, 0.9)
          .setOrigin(toLeft ? 1 : 0, 0.5)
          .setScrollFactor(0)
          .setDepth(100);
        this.descriptionText.visible = false;

        this.setListeners();
     }

     // A tint that survives hovering away, for a button in a state the player
     // needs to keep seeing (the clear-stage button once it is armed).
     setLockedTint (colour = null) {
       this.lockedTint = colour;
       if (colour) this.setTint(colour); else this.clearTint();
     }

     setListeners () {
        this.setInteractive();

        this.on("pointerdown", () => {
            this.action();
        });

        this.on("pointerover", () => {
          this.descriptionText.visible = true;
          if (!this.lockedTint) this.setTint(0x3E6875);
        });

        this.on("pointerout", () => {
          this.descriptionText.visible = false;
          if (this.lockedTint) this.setTint(this.lockedTint); else this.clearTint();
        });
     }
  }

  export default SpriteButton;
