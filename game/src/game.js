import Ball from './ball';
import Exit from './exit';
import Bat from './bat';
import Rotator from './rotator';

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
      this.customBricks = data.customBricks;
  }

    preload () {
    }

    create () {
      this.width = this.sys.game.config.width;
      this.height = this.sys.game.config.height;
      this.center_width = this.width / 2;
      this.center_height = this.height / 2;
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
      if (this.customBricks.length > 1) {
        this.number = 'template';
      }
      this.map = this.make.tilemap({ key: `scene${this.number}` });
      const tileset = this.map.addTilesetImage("map", null, 32, 32, 0, 0); // 1px margin, 2px spacing
      this.groundLayer = this.map.createLayer(`scene${this.number}`, tileset);
      this.damage = this.map.createLayer("damage", tileset);

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
        const [_, size] = name.split(":");
        this.exit = new Rotator(this, x, y, size);
      }

      if (name.startsWith("brick")) {
        const spriteIndex = +name.replace("brick", "");
        const tileX = Math.floor(x / 32); // Convert x position to tile coordinates
        const tileY = Math.floor(y / 32); // Convert y position to tile coordinates

                // Debug logs
        console.log("groundLayer:", this.groundLayer);
        console.log("tileX, tileY:", tileX, tileY);

        const tileset = this.map.tilesets[0];
        const tileIndex = tileset.firstgid; // Use first tile from the tileset
        console.log("Using tile index:", tileIndex);

        this.map.putTileAt(tileIndex, tileX, tileY, false, this.groundLayer);
      }

      if (name.startsWith("spike")) {
        const spriteIndex = +name.replace("spike", "") + 4
        const tileX = Math.floor(x / 32); // Convert x position to tile coordinates
        const tileY = Math.floor(y / 32); // Convert y position to tile coordinates

                // Debug logs
        console.log("damage:", this.damage);
        console.log("tileX, tileY:", tileX, tileY, spriteIndex);

        const tileset = this.map.tilesets[0];
        const tileIndex = tileset.firstgid; // Use first tile from the tileset
        console.log("Using tile index:", tileset,  tileIndex);

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
  }

  addObjectsFromTiledMap() {
    this.map.getObjectLayer("objects").objects.forEach(createObject => {
      const { x, y, width, height, name } = createObject;

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

    restartScene() {
      this.playAudio("hit")
      this.cameras.main.shake(100);
      this.cameras.main.fade(250, 0, 0, 0);
      this.updateTries()
      this.cameras.main.once("camerafadeoutcomplete", () => {
        if (this.number === 'template') {
          this.scene.start("game", { customBricks: this.customBricks });
          return;
        }
        this.scene.start("game", { number: this.number})
      });
    }

    finishScene () {
      this.cameras.main.fade(250, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        if (this.number === 'template') {
          this.scene.start("game", { customBricks: this.customBricks });
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
