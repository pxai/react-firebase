import { TILE } from './layout.js';

// Elements the player has placed in the editor. Clicking one removes it; that
// is what the eraser tool in the palette selects for.
//
// Two shapes, one behaviour:
//  - CustomBrick, a Sprite, for anything one tile wide.
//  - CustomBar, a TileSprite, for the sized elements. A TileSprite REPEATS its
//    texture, so a run of 3 reads as three rotator sprites side by side rather
//    than one sprite stretched to 96px — which is what the real entities do
//    too (both Rotator and MovingPlatform are tileSprites).

const attachEditorBehaviour = (brick) => {
  brick.setOrigin(0);
  brick.scene.add.existing(brick);
  brick.isDestroyed = false;
  brick.setInteractive();

  brick.on("pointerdown", () => {
    brick.scene.onABuiltBlock = true;
    // The ball is a separate object from its brick, so removing the fireball
    // element has to take the ball with it. This used to test the cursor's
    // texture, so the ball survived unless you happened to have the fireball
    // selected while deleting it.
    if (brick.name === "fireball" && brick.scene.ball) {
      brick.scene.ball.destroy();
      brick.scene.ball = null;
    }
    brick.remove();
  });

  brick.on("pointerover", () => {
    brick.setTint(0xff0000);
    brick.scene.onABuiltBlock = true;
  });

  brick.on("pointerout", () => {
    brick.clearTint();
    brick.scene.onABuiltBlock = false;
  });
};

const removeFromScene = (brick) => {
  //brick.scene.playAudioRandomly("stone") // TODO
  brick.scene.onABuiltBlock = false;
  brick.scene.buildTime = 0;
  const { x, y } = brick;
  brick.isDestroyed = true;
  brick.scene.bricks = brick.scene.bricks.filter((other) => other.x !== x || other.y !== y);
  brick.scene.customBricks = brick.scene.customBricks.filter((other) => other.x !== x || other.y !== y);
  brick.destroy();
};

class CustomBrick extends Phaser.GameObjects.Sprite {
    // `name` is what gets stored in the stage; `texture` is what to draw, which
    // is not always the same thing.
    constructor (scene, x, y, name = "brick0", { texture = name } = {}) {
        super(scene, x, y, texture);
        this.scene = scene;
        this.name = name;
        attachEditorBehaviour(this);
     }

    remove () {
        removeFromScene(this);
    }
  }

class CustomBar extends Phaser.GameObjects.TileSprite {
    constructor (scene, x, y, name, { texture = "rotator", width = TILE, height = TILE } = {}) {
        super(scene, x, y, width || TILE, height || TILE, texture);
        this.scene = scene;
        this.name = name;
        attachEditorBehaviour(this);
    }

    remove () {
        removeFromScene(this);
    }
  }

// Pick the right shape for an element. `width` wider than one tile means a run
// of repeated sprites.
export const createPlacedElement = (scene, x, y, name, options = {}) =>
  (options.width > TILE || options.height > TILE
    ? new CustomBar(scene, x, y, name, options)
    : new CustomBrick(scene, x, y, name, options));

export { CustomBar };
export default CustomBrick;
