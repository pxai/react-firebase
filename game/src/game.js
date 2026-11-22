import Ball from './ball';
import Exit from './exit';
import Bat from './bat';
import Rotator from './rotator';
import SpriteButton from "./sprite_button";
import MovingPlatform from "./moving_platform";
import {
  TILE,
  LEFT_COLUMN_X,
  MAP_OFFSET_X,
  MAP_OFFSET_Y,
  toTileX,
  toTileY
} from "./layout";
import { parsePlacedName, ROTATOR_UNIT } from "./elements";
import { reportAttempt } from "./telemetry";

export default class Game extends Phaser.Scene {
    constructor () {
        super({ key: "game" });
        this.player = null;
        this.score = 0;
        this.scoreText = null;
    }

    init (data) {
      console.log("Init again! ", data)
      this.name = data.name;
      this.number = data.number;
      // Most callers start this scene without customBricks: the bootloader
      // (/game/ with no ?builder), the splash screen, and restart/finish on a
      // fixed stage. addMap reads .length straight away, so default it rather
      // than crashing with "Cannot read properties of undefined".
      this.customBricks = data.customBricks || [];
      // True when the site booted us straight into a stored stage (/play/:id)
      // rather than the editor handing a stage over. There is then no builder
      // scene to go back to.
      this.standalone = !!data.standalone;
  }

    preload () {
    }

    create () {
      this.width = this.sys.game.config.width;
      this.height = this.sys.game.config.height;
      this.center_width = this.width / 2;
      this.center_height = this.height / 2;
      // One scene instance is one attempt: a failure restarts the scene, so
      // create() runs again and the next attempt starts here.
      this.attemptStartedAt = typeof performance !== 'undefined' ? performance.now() : null;
      this.attemptReported = false;
      this.addPointer();
      this.addMap();
      this.addCollisions()
      this.loadAudios();
      this.showLogo();
      // this.playMusic();
        // REMOVE
      // this.input.keyboard.on("keydown-SPACE", () => this.finishScene(), this);
    }

    addPointer() {
      this.pointer = this.input.activePointer;
      this.input.mouse.disableContextMenu();
    }

    addBall(x, y) {
      this.ball = new Ball(this, x, y);
    }

    addMap() {
      // Any custom stage uses the blank template map. This was `length > 1`,
      // which left this.number undefined for a one-element stage and asked the
      // cache for a tilemap called "sceneundefined".
      if (this.customBricks.length) {
        this.number = 'template';
      } else if (this.number === undefined || this.number === null) {
        this.number = 0;
      }
      this.map = this.make.tilemap({ key: `scene${this.number}` });
      const tileset = this.map.addTilesetImage("map", null, 32, 32, 0, 0); // 1px margin, 2px spacing
      // Same offset as the editor, so a stage plays where it was built.
      this.groundLayer = this.map.createLayer(`scene${this.number}`, tileset, MAP_OFFSET_X, MAP_OFFSET_Y);
      this.damage = this.map.createLayer("damage", tileset, MAP_OFFSET_X, MAP_OFFSET_Y);

      this.groundLayer.setCollisionByExclusion([-1]);
      this.damage.setCollisionByExclusion([-1]);

      this.matter.world.convertTilemapLayer(this.groundLayer);
      this.matter.world.convertTilemapLayer(this.damage);
      this.rotatorGroup = this.matter.world.nextGroup();
      this.batGroup = this.matter.world.nextGroup();

      if (this.number === 'template') {
        this.addObjectsFromCustomBricks();
      } else {
        this.addObjectsFromTiledMap();
      }
  }

  addBackButton () {
    this.startButton = new SpriteButton(
      this, LEFT_COLUMN_X, 48, "back", "Go back", this.goBack.bind(this), { tooltipSide: "right" }
    );
  }

  addObjectsFromCustomBricks() {

    this.customBricks.forEach(createObject => {
      const { x, y, width, height, name } = createObject;

      if (name === "bat") {
        new Bat(this, x, y)
      }

      if (name === "bell") {
        this.exit = new Exit(this, x, y);
      }

      if (name.startsWith("rotator")) {
        // The editor stores a sprite count; Rotator measures its length in
        // 64px units, hence the conversion. It is also centre-origin while the
        // editor stores the top-left corner, so offset it by half its width to
        // land where it was placed.
        const { width } = parsePlacedName(name);
        new Rotator(this, x + (width / 2), y + (TILE / 2), width / ROTATOR_UNIT);
      }

      // Sliding platforms: platform_h slides left/right, platform_v up/down.
      if (name.startsWith("platform_")) {
        const { axis, tiles, vertical } = parsePlacedName(name);
        new MovingPlatform(this, x, y, { axis, tiles, vertical });
      }

      if (name.startsWith("brick")) {
        const spriteIndex = +name.replace("brick", "");
        const tileX = toTileX(x); // Canvas position -> tile coordinates in the layer
        const tileY = toTileY(y);

        const tileset = this.map.tilesets[0];
        const tileIndex = tileset.firstgid + (spriteIndex ); // Use first tile from the tileset

        this.map.putTileAt(tileIndex, tileX, tileY, false, this.groundLayer);
      }

      if (name.startsWith("spike")) {
        const spriteIndex = +name.replace("spike", "") + 4
        const tileX = toTileX(x); // Canvas position -> tile coordinates in the layer
        const tileY = toTileY(y);

        const tileset = this.map.tilesets[0];
        const tileIndex = tileset.firstgid + (spriteIndex ); // Use first tile from the tileset plus the sprite index

        this.map.putTileAt(tileIndex, tileX, tileY, false, this.damage);
      }

      if (name === "fireball") {
        this.addBall(x, y);
      }
    });

    this.groundLayer.setCollisionByExclusion([-1]); // refresh collisions
    this.matter.world.convertTilemapLayer(this.groundLayer);
    this.damage.setCollisionByExclusion([-1]); // refresh collisions
    this.matter.world.convertTilemapLayer(this.damage);
    this.addBackButton()
  }

  addObjectsFromTiledMap() {
    this.map.getObjectLayer("objects").objects.forEach(createObject => {
      const { width, height, name } = createObject;
      // Tiled coordinates are relative to the map; the map is drawn offset.
      const x = createObject.x + MAP_OFFSET_X;
      const y = createObject.y + MAP_OFFSET_Y;

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

      if (name === "player") {
        this.addBall(x, y);
      }
      // Tiled origin for its coordinate system is (0, 1), but we want coordinates relative to an
      // origin of (0.5, 0.5)
      // new Block(this, x + width / 2, y - height / 2)
      //new Platform(this, x + Phaser.Math.Between(-128, 128), y)
      // this.matter.add.image(x + width / 2, y - height / 2, "block").setBody({ shape: "rectangle", density: 0.001 });
    });
  }

    addCollisions () {
      // A custom stage with no fireball placed has no ball, and there is then
      // nothing to attach collisions to. The editor stops you playing such a
      // stage, but do not crash the whole scene if one gets here anyway.
      if (!this.ball) {
        console.warn("No ball in this stage: skipping ball collisions.");
        return;
      }

      this.unsubscribePlayerCollide = this.matterCollision.addOnCollideStart({
        objectA: this.ball.fireball,
        callback: this.onPlayerCollide,
        context: this
      });

      this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach((pair) => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
        });
      });
    }

    onPlayerCollide({ gameObjectA, gameObjectB }) {
      if (!gameObjectB) return;
      if (gameObjectB.label === "bell") { this.playerHitsBell(gameObjectB); return;}
      if (gameObjectB.label === "bat") { this.playerHitsBat(gameObjectB); return;}
      if (gameObjectB.label && gameObjectB.label.startsWith("rotator")) { this.playerHitsRotator(gameObjectB); return;}
      //if (gameObjectB instanceof Platform) this.playerOnPlatform(gameObjectB);
      //if (!(gameObjectB instanceof Phaser.Tilemaps.Tile)) return;

      const tile = gameObjectB;

      // Check the tile property set in Tiled (you could also just check the index if you aren't using
      // Tiled in your game)
      if (tile.properties.isDamage) {
        // Unsubscribe from collision events so that this logic is run only once
        this.unsubscribePlayerCollide();
        //this.player.freeze();
        this.restartScene();
      } else {
        this.playAudio("wall")
      }
    }

    playerHitsBell(bell) {
      if (this.ball.readyToFire || this.ball.dragging) return;
      bell.hit();
      this.playAudio("bell")
      this.ball.dead = true;
      this.finishScene();
    }

    playerHitsRotator(rotator) {
      this.ball.dead = true;
      this.restartScene();
    }

    playerHitsBat(bat) {
      this.ball.dead = true;
      this.restartScene();
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

    update() {

    }

    // Reported once per attempt, and only for a stage the site loaded by id:
    // the fixed training stages have no document to count against.
    recordAttempt (completed) {
      if (!this.standalone || this.attemptReported) return;
      this.attemptReported = true;
      reportAttempt(completed, this.attemptStartedAt);
    }

    restartScene() {
      this.recordAttempt(false)
      this.playAudio("hit")
      this.cameras.main.shake(100);
      this.cameras.main.fade(250, 0, 0, 0);
      this.updateTries()
      this.cameras.main.once("camerafadeoutcomplete", () => {
        if (this.number === 'template') {
          this.scene.start("game", {
            number: 'template',
            customBricks: this.customBricks,
            standalone: this.standalone
          });
          return;
        }
        this.scene.start("game", { number: this.number})
      });
    }

    goBack() {
      this.cameras.main.fade(250, 0, 0, 0);
      this.updateTries()
      this.cameras.main.once("camerafadeoutcomplete", () => {
        // Played straight from the site: there is no sleeping builder to wake,
        // and waking one that never started leaves a dead black canvas. Hand
        // control back to the page instead.
        //
        // This must NOT go to /save. A stage played from the site may belong to
        // anybody, and /save is the editing screen — sending players there
        // offered them an edit form for someone else's stage. The gallery is
        // where they came from.
        if (this.standalone || !this.scene.isSleeping("game_builder")) {
          if (window.parent && window.parent !== window) {
            window.parent.location.href = '/stages';
            return;
          }
        }

        this.scene.stop("game");
        this.scene.wake("game_builder"); // resumes AND triggers 'wake' event
        this.scene.get("game_builder").data.set("customBricks", this.customBricks);
      });
    }

    finishScene () {
      this.recordAttempt(true)
      this.cameras.main.fade(250, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        if (this.number === 'template') {
          this.scene.start("game", {
            number: 'template',
            customBricks: this.customBricks,
            standalone: this.standalone
          });
          return;
        }
        this.number += 1;
        console.log("Number: ", this.number)
        if (this.number === 8)
          this.scene.start("outro");
        else
          this.scene.start("game", { number: this.number});
      });
    }

    updateTries (points = 1) {
        const tries = +this.registry.get("tries") + points;
        this.registry.set("tries", tries);
    }

    showLogo() {
      let line1 = this.add.bitmapText(this.center_width, 100, "title", "TXOKAS", 250).setOrigin(0.5).setAlpha(0.2);
  }
}
