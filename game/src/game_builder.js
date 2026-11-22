import Ball from './ball';
import Exit from './exit';
import Bat from './bat';
import Rotator from './rotator';
import Platform from "./platform";
import BrickButton from "./brick_button";
import { createPlacedElement } from "./custom_brick";
import SpriteButton from "./sprite_button";
import Spike from "./spike";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LEFT_COLUMN_X,
  RIGHT_COLUMN_X,
  MAP_OFFSET_X,
  MAP_OFFSET_Y,
  isInsidePlayfield,
  snapToGrid,
  TILE,
  PLAYFIELD
} from "./layout";
import { serializeStage, writeStage, DRAFT_KEY } from "./stage_io";
import {
  PALETTE,
  paletteByName,
  resolvePlacedName,
  placeholderFor,
  isSized,
  nextSize,
  widthForSize,
  MIN_SPRITES,
  ERASER,
  CLEAR_ALL,
  ONLY_ONCE
} from "./elements";

// Vertical spacing between buttons in each UI column.
const PALETTE_SPACING = 48;
const ACTION_SPACING = 64;
// How long the "clear the stage" confirmation stays armed, in ms.
const CLEAR_CONFIRM_MS = 4000;
export default class GameBuilder extends Phaser.Scene {
    constructor () {
        super({ key: "game_builder" });
        this.player = null;
        this.score = 0;
        this.scoreText = null;
    }

    get key () {
      return this.scene.systems.settings.key
    }

    init (data) {
      this.name = data.name;
      this.number = data.number;
      this.customBricks = data.customBricks || [];
  }

    preload () {
    }

    resume(data) {
      console.log("Resuming game_builder with data:", data);
      if (data) {
        this.customBricks = data.customBricks || [];
        this.number = data.number || 'template';
        // Refresh the scene state if needed
      }
    }

    create () {
      this.width = this.sys.game.config.width;
      this.height = this.sys.game.config.height;
      this.center_width = this.width / 2;
      this.center_height = this.height / 2;
      this.cameras.main.setBackgroundColor(0x62a2bf)
      console.log("This number: ", this.number)
      this.createMap();

      this.cameras.main.setBounds(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      this.addPointer();
      this.loadAudios();
      this.addPanel();
      this.addActionButtons();
      this.restorePlacedBricks();
      //this.playMusic();
      this.firstPlaced = false;
      if (this.number === 0) this.showTutorial();
      this.buildPhaseText = this.add.bitmapText(this.center_width, 100, "title", "BUILD PHASE", 50).setDropShadow(0, 4, 0x222222, 0.9).setOrigin(0.5).setScrollFactor(0)
      this.tweens.add({
        targets: this.buildPhaseText,
        alpha: {from: 0.4, to: 1},
        repeat: 10,
        onComplete: () => {
          this.buildPhaseText.destroy();
        }
      })

      this.events.on("wake", () => {
        const customBricks = this.data.get("customBricks");
        console.log("Waking up game_builder with customBricks:", customBricks);
        this.scene.restart({ customBricks, number: 'template' });
      });
    }

    addPointer() {
      this.buildTime = 0;
      this.hiddenPointer = false;
      this.pointer = this.input.activePointer;
      this.input.mouse.disableContextMenu();
    }

    addBall(x, y) {
      this.ball = new Ball(this, x, y);
    }

    showTutorial () {
      if (this.number > 0) return;
      if (!this.firstPlaced) {
        this.tutorial1 = this.add.bitmapText(this.center_width, this.center_height - 50, "title", "Select brick type", 30).setDropShadow(0, 4, 0x222222, 0.9).setOrigin(0.5).setScrollFactor(0)
        this.tutorial2 = this.add.bitmapText(this.center_width, this.center_height, "title", "and place it", 30).setDropShadow(0, 4, 0x222222, 0.9).setOrigin(0.5).setScrollFactor(0)
        this.tutorial3 = this.add.bitmapText(this.center_width, this.center_height + 50, "title", "", 30).setDropShadow(0, 4, 0x222222, 0.9).setOrigin(0.5).setScrollFactor(0)
      } else {
        this.tutorial1.setText("Click again to delete.")
        this.tutorial2.setText("Keep building...")
        this.tutorial3.setText("When ready, press play!")
      }

      this.tweens.add({
        targets: [this.tutorial1, this.tutorial2, this.tutorial3],
        alpha: {from: 1, to: 0},
        delay: 2000,
        duration: 500,
      })

    }

    // Shown over the playfield. The tutorial text only exists on stage 0, so
    // this owns its own text object rather than reusing it.
    showMessage (message) {
      if (!this.message) {
        this.message = this.add
          .bitmapText(this.center_width, this.center_height, "title", "", 30)
          .setDropShadow(0, 4, 0x222222, 0.9)
          .setOrigin(0.5)
          .setCenterAlign()
          .setScrollFactor(0)
          .setDepth(200);
      }

      this.tweens.killTweensOf(this.message);
      this.message.setAlpha(1);
      this.message.setText(message);

      this.tweens.add({
        targets: [this.message],
        alpha: {from: 1, to: 0},
        delay: 2000,
        duration: 500,
      })
    }

    // Palette: a vertical column in the left gutter, outside the map walls.
    // The eraser sits at the bottom of it as just another selectable tool.
    addPanel () {
      this.selectedBrick = null;
      this.onABuiltBlock = false;
      this.brickTypes = PALETTE;

      this.brickButtons = {};
      this.brickDefs = paletteByName;
      this.bricks = []
      // Current length, in sprites, of each sized element. Clicking its
      // palette button again cycles this.
      this.brickSizes = Object.fromEntries(
        PALETTE.filter((brick) => brick.sized).map((brick) => [brick.name, MIN_SPRITES])
      );

      // One extra slot below the palette for "clear the whole stage".
      const total = this.brickTypes.length + 1;
      const top = (CANVAS_HEIGHT - ((total - 1) * PALETTE_SPACING)) / 2;

      this.brickTypes.forEach( (brick, i) => {
        this.brickButtons[brick.name] = new BrickButton(
          this,
          LEFT_COLUMN_X,
          top + (i * PALETTE_SPACING),
          { ...brick, description: this.describe(brick) },
          { tooltipSide: "right" }
        ).setOrigin(0.5).setScrollFactor(0)
      });

      this.clearArmed = false;
      this.clearAllButton = new SpriteButton(
        this,
        LEFT_COLUMN_X,
        top + (this.brickTypes.length * PALETTE_SPACING),
        CLEAR_ALL,
        "Clear stage",
        this.confirmClearStage.bind(this),
        { tooltipSide: "right" }
      ).setOrigin(0.5).setScrollFactor(0);
    }

    // Clearing the stage throws away everything the player built, so it takes
    // two deliberate clicks on this button. The arming lapses on its own, so a
    // stray click cannot leave it primed indefinitely.
    confirmClearStage () {
      if (this.clearArmed) {
        this.disarmClear();
        this.clearStage();
        return;
      }

      if (!this.bricks.length) {
        this.showMessage("Nothing to clear");
        return;
      }

      this.clearArmed = true;
      this.clearAllButton.setLockedTint(0xff0000);
      this.showMessage("Clear the whole stage?\nClick the bins again to confirm");

      this.clearTimer = this.time.delayedCall(CLEAR_CONFIRM_MS, () => {
        if (this.clearArmed) {
          this.disarmClear();
          this.showMessage("Clear cancelled");
        }
      });
    }

    disarmClear () {
      this.clearArmed = false;
      this.clearAllButton?.setLockedTint(null);
      this.clearTimer?.remove();
      this.clearTimer = null;
    }

    clearStage () {
      // Empty the lists first, then destroy: CustomBrick.remove() filters these
      // same arrays, so destroying while iterating them would skip elements.
      const placed = this.bricks.slice();
      this.bricks = [];
      this.customBricks = [];

      placed.forEach((brick) => {
        if (!brick.isDestroyed) brick.destroy();
      });

      if (this.ball) {
        this.ball.destroy();
        this.ball = null;
      }

      this.onABuiltBlock = false;
      this.buildTime = 0;
      this.showMessage("Stage cleared");
    }

    // Save / play / exit: a column in the right gutter, outside the walls.
    addActionButtons () {
      const actions = [
        { name: "save", description: "Save stage", action: this.saveScene.bind(this) },
        { name: "play", description: "Play stage", action: this.startScene.bind(this) },
        { name: "back", description: "Exit editor", action: this.exitScene.bind(this) },
      ];

      const top = (CANVAS_HEIGHT - ((actions.length - 1) * ACTION_SPACING)) / 2;

      this.actionButtons = actions.map((action, i) => new SpriteButton(
        this,
        RIGHT_COLUMN_X,
        top + (i * ACTION_SPACING),
        action.name,
        action.description,
        action.action,
        { tooltipSide: "left" }
      ).setOrigin(0.5).setScrollFactor(0));
    }

    // Returning from a play test restarts this scene with the stage's elements
    // in customBricks, which nothing used to draw. The editor therefore came
    // back empty, and because saving only looks at this.bricks, pressing save
    // after a play test wrote out an empty map (and validation claimed the ball
    // and bell were missing). Redraw them as editable bricks instead, so
    // this.bricks is the one source of truth for what the stage contains.
    restorePlacedBricks () {
      if (!this.customBricks || !this.customBricks.length) return;

      this.customBricks.forEach(({ x, y, name }) => {
        this.bricks.push(createPlacedElement(this, x, y, name, placeholderFor(name)));
        if (name === "fireball") this.addBall(x, y);
      });

      this.customBricks = [];
    }

    get isErasing () {
      return this.selectedBrick === ERASER;
    }

    sizeOf (name) {
      return this.brickSizes?.[name] || MIN_SPRITES;
    }

    // Tooltip text: sized elements append their current length.
    describe (brick) {
      return brick.sized ? `${brick.description} (${this.sizeOf(brick.name)})` : brick.description;
    }

    // Footprint of the current selection, so the ghost and the placement clamp
    // account for both long bars and tall ones.
    get selectedSize () {
      const def = this.brickDefs?.[this.selectedBrick];
      if (!def) return { width: TILE, height: TILE };

      if (def.sized) {
        const run = widthForSize(this.sizeOf(this.selectedBrick));
        return def.vertical
          ? { width: TILE, height: run }
          : { width: run, height: TILE };
      }

      return { width: def.width || TILE, height: TILE };
    }

    // Clicking an already-selected sized element lengthens it.
    growBrick (name) {
      if (!isSized(name)) return;
      this.brickSizes[name] = nextSize(this.sizeOf(name));
      this.chooseBrick(name);
    }

    chooseBrick (brickName) {
      const previous = this.brickButtons[this.selectedBrick];
      if (previous) previous.clearTint();
      if (this.currentBlockSprite) this.currentBlockSprite.destroy();

      const def = this.brickDefs[brickName] || { name: brickName };
      this.selectedBrick = brickName;

      const texture = def.texture || def.name;
      const { width, height } = def.sized
        ? this.selectedSize
        : { width: def.width || 0, height: 0 };

      // A tileSprite repeats the texture, so a run of 3 shows three sprites
      // rather than one stretched to 96px — matching what gets built, and
      // stacking them for a vertical bar.
      this.currentBlockSprite = ((width > TILE || height > TILE)
        ? this.add.tileSprite(LEFT_COLUMN_X, CANVAS_HEIGHT / 2, width || TILE, height || TILE, texture)
        : this.add.sprite(LEFT_COLUMN_X, CANVAS_HEIGHT / 2, texture))
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(50);

      this.currentBlockSprite.visible = false;
    }

    unselectBrick () {
      const previous = this.brickButtons[this.selectedBrick];
      if (previous) previous.clearTint();
      if (this.currentBlockSprite) {
        this.currentBlockSprite.destroy();
        this.currentBlockSprite = null;
      }
      this.selectedBrick = null;
    }

    createMap() {
          this.map = this.make.tilemap({ key: `scene${this.number}` });
          const tileset = this.map.addTilesetImage("map", null, 32, 32, 0, 0); // 1px margin, 2px spacing
          // Offset so the UI gutters sit outside the walls. Matter bodies follow
          // the layer position, so the collisions move with it.
          this.groundLayer = this.map.createLayer(`scene${this.number}`, tileset, MAP_OFFSET_X, MAP_OFFSET_Y);
          this.damage = this.map.createLayer("damage", tileset, MAP_OFFSET_X, MAP_OFFSET_Y);

          this.groundLayer.setCollisionByExclusion([-1]);
          this.damage.setCollisionByExclusion([-1]);

          //this.damageLayer.setCollisionByExclusion([-1]);
          // this.platform.setCollisionByProperty({ collides: true });
          this.matter.world.convertTilemapLayer(this.groundLayer);
          this.matter.world.convertTilemapLayer(this.damage);
          this.rotatorGroup = this.matter.world.nextGroup();
          this.batGroup = this.matter.world.nextGroup();


          this.map.getObjectLayer("objects").objects.forEach(crateObject => {
            const { width, height, name } = crateObject;
            // Tiled coordinates are relative to the map; the map is drawn offset.
            const x = crateObject.x + MAP_OFFSET_X;
            const y = crateObject.y + MAP_OFFSET_Y;

            if (name === "bat") {
              new Bat(this, x, y)
            }

            if (name === "exit") {
              this.exit = new Exit(this, x, y);
            }

            if (name.startsWith("rotator")) {
              const [_, size] = name.split(":");
              this.exit = new Rotator(this, x, y, size);
            }
            // Tiled origin for its coordinate system is (0, 1), but we want coordinates relative to an
            // origin of (0.5, 0.5)
           // new Block(this, x + width / 2, y - height / 2)
            //new Platform(this, x + Phaser.Math.Between(-128, 128), y)
            // this.matter.add.image(x + width / 2, y - height / 2, "block").setBody({ shape: "rectangle", density: 0.001 });
          });
      }

    turnFoe (foe, platform) {
      foe.turn();
    }


    hitFloor() {

    }

  loadAudios () {
    this.audios = {
      "fire": this.sound.add("fire"),
      "hit": this.sound.add("hit"),
      "wall": this.sound.add("wall"),
      "bell": this.sound.add("bell"),
    };
  }

  playAudio(key) {
    this.audios[key].play();
  }

  playMusic (theme="game") {
    this.theme = this.sound.add(theme);
    this.theme.stop();
    this.theme.play({
      mute: false,
      volume: 1,
      rate: 1,
      detune: 0,
      seek: 0,
      loop: true,
      delay: 0
    })
  }

  playAudioRandomly(key) {
    const volume = Phaser.Math.Between(0.8, 1);
    const rate = Phaser.Math.Between(0.8, 1);
    this.audios[key].play({volume, rate});
  }

  update(time, delta) {
    this.buildTime += delta;

    // Only the inside of the walls is buildable; the gutters hold the buttons.
    const onPlayfield = !!this.pointer && isInsidePlayfield(this.pointer.worldX, this.pointer.worldY);

    if (this.currentBlockSprite) {
      if (onPlayfield) this.updatePointer();
      // Hide the ghost over the UI columns, and over a block that a click
      // would delete rather than build on.
      this.currentBlockSprite.visible = onPlayfield && !this.onABuiltBlock;
    }

    if (this.pointer?.isDown && onPlayfield && !this.pointer.rightButtonDown()) {
      this.buildBlock(this.currentBlockSprite);
    }

    if (this.spaceBar?.isDown) {
      this.startScene();
    }
  }

  updatePointer () {
    const {worldX, worldY}  = this.pointer;
    const {x, y} = snapToGrid(worldX, worldY);
    // A long or tall element placed near a wall would stick through it, so
    // clamp here rather than at placement: the ghost then shows exactly where
    // the element will land.
    const { width, height } = this.selectedSize;
    this.currentBlockSprite.x = Math.min(x, PLAYFIELD.right - width);
    this.currentBlockSprite.y = Math.min(y, PLAYFIELD.bottom - height);
  }

  buildBlock(sprite) {
    if (!sprite || this.isErasing) return 0;
    if (this.buildTime < 500 || this.onABuiltBlock) return 0;
    if (this.canBuild(this.selectedBrick)) {
      this.firstPlaced = true;
      //this.playAudio("build"); // TODO
      //this.buildSmoke(32, sprite.y); // TODO

      this.updatePointer();
      const placedName = resolvePlacedName(this.selectedBrick, undefined, this.sizeOf(this.selectedBrick));
      console.log("Added brick: ", placedName)
      if (this.selectedBrick === "fireball") {
        const{x, y} = this.currentBlockSprite
        this.addBall(x, y)
      }
      this.bricks.push(createPlacedElement(
        this,
        this.currentBlockSprite.x,
        this.currentBlockSprite.y,
        placedName,
        // Whatever the stage stores is what the editor draws back, so the
        // placeholder and a reloaded stage always agree.
        placeholderFor(placedName)
      ))
      this.buildTime = 0;

    }

    console.log("Current bricks: ", this.bricks, this.exportedMap)
  }

  // The storage format for a stage: map coordinates, not canvas coordinates,
  // so a stage saved today still loads if the UI gutters are ever resized.
  get exportedMap () {
    return serializeStage(this.bricks);
  }

  canBuild(brickType) {
    if (!brickType || brickType === ERASER) return false;
    return !(ONLY_ONCE.includes(brickType) && this.bricks.map(brick => brick.name).includes(brickType))
  }

  isValidScene() {
    return ONLY_ONCE.every( special => this.bricks.map(brick => brick.name).includes(special))
  }

  saveScene () {
    if (!this.isValidScene()) {
      this.showMessage("Add at least the ball and the bell")
      return;
    }

    if (!writeStage(DRAFT_KEY, this.bricks)) {
      this.showMessage("Could not save: browser storage is unavailable")
      return;
    }

    this.showMessage("Map saved successfully!");
    if (window.parent && window.parent !== window) {
      window.parent.location.href = '/save';
    }
  }

  // Leave the editor: back to the site when embedded, to the splash screen
  // when the game is being run on its own.
  exitScene () {
    this.sound.stopAll();
    if (this.theme) this.theme.stop();

    if (window.parent && window.parent !== window) {
      window.parent.location.href = '/';
    } else {
      this.scene.start("splash");
    }
  }

  buildSmoke (offsetY = 10, offsetX) {
    Array(Phaser.Math.Between(8, 14)).fill(0).forEach(i => {
        const varX = Phaser.Math.Between(-20, 20);
        //new JumpSmoke(this, this.x + (offsetX + varX), this.y + offsetY)
    })
  }

  finishScene () {
    if (this.theme) this.theme.stop();
    this.scene.start("transition", { name: "STAGE", number: this.number + 1});
  }

  startScene () {
    // Same requirement as saving: without the ball there is nothing to play
    // with, and without the bell the stage cannot be completed.
    if (!this.isValidScene()) {
      this.showMessage("Add at least the ball and the bell")
      return;
    }

    let customBricks = this.bricks.concat(this.customBricks).filter(brick => brick !== null)

    this.time.delayedCall(1000, () => {
      this.sound.stopAll();
      if (this.theme) this.theme.stop();
      this.scene.pause("game_builder")
      this.scene.start("game", { name: "STAGE", number: this.number, customBricks});
    },
      null,
      this
    );
  }

  restartScene () {
    this.time.delayedCall(1000, () => {
        if (this.theme) this.theme.stop();
        this.scene.start("transition", { name: "STAGE", number: this.number});
      },
      null,
      this
    );
  }

  showPointer(time) {
    const {worldX, worldY}  = this.pointer;
    const point = new Phaser.Geom.Point(worldX, worldY);
    const distance = Phaser.Math.Distance.BetweenPoints(this.player, point);

    this.input.manager.canvas.style.cursor =  'crosshair';
  }
}
