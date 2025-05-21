import Ball from './ball';
import Exit from './exit';
import Bat from './bat';
import Rotator from './rotator';
import Platform from "./platform";
import BrickButton from "./brick_button";
import CustomBrick from "./custom_brick";
import SpriteButton from "./sprite_button";
import Spike from "./spike";


export default class GameBuilder extends Phaser.Scene {
    constructor () {
        super({ key: "game_builder" });
        this.player = null;
        this.score = 0;
        this.scoreText = null;
    }

    init (data) {
      this.name = data.name;
      this.number = data.number;
      this.customBricks = data.customBricks || [];
      this.registry.set("coins", +this.registry.get("last_budget") - +this.registry.get("last_spent") + +this.registry.get("legit_coins"))
  }

    preload () {
    }

    create () {
      this.width = this.sys.game.config.width;
      this.height = this.sys.game.config.height;
      this.center_width = this.width / 2;
      this.center_height = this.height / 2;
      this.cameras.main.setBackgroundColor(0x62a2bf)
      console.log("This number: ", this.number)
      this.createMap();

      this.cameras.main.setBounds(0, 0, 20920 * 2, 20080 * 2);
      //this.physics.world.setBounds(0, 0, 20920 * 2, 20080 * 2);
      this.addBall();

      this.addPointer();
      this.loadAudios();
      this.addPanel();
      this.addStartButton();
      //this.playMusic();
      this.firstPlaced = false;
      if (this.number === 0) this.showTutorial();
      this.buildPhaseText = this.add.bitmapText(this.center_width, 100, "title", "BUILD PHASE", 50).setDropShadow(0, 4, 0x222222, 0.9).setOrigin(0.5).setScrollFactor(0)
      this.tweens.add({
        targets: this.buildPhaseText,
        alpha: {from: 0.4, to: 1},
        repeat: 10,
        repeat: -1,
        onComplete: () => {
          this.buildPhaseText.destroy();
        }
      })
    }

    addPointer() {
      this.buildTime = 0;
      this.hiddenPointer = false;
      this.pointer = this.input.activePointer;
      this.input.mouse.disableContextMenu();
    }

    addBall(x, y) {
      console.log("Add ball!")
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
        duration: 9000
      })

    }

    addPanel () {
      this.selectedBrick = null;
      this.onABuiltBlock = false;
      this.brickTypes = [
        { name: "brick2", cost: 5, description: "Micro breakable brick"},
        { name: "brick0", cost: 10, description: "Breakable brick"},
        { name: "brick1", cost: 20, description: "Fixed brick"},
        { name: "platform", cost: 50, description: "Moving platform"},
      ];
      this.brickButtons = {};
      this.bricks = [] //this.customBricks;
      const x = (this.cameras.main.width / 2) - 64;
      const y = (this.cameras.main.height - 50);
      this.brickTypes.forEach( (brick, i) => {
        this.brickButtons[brick.name] = new BrickButton(this, x + (i * 64), y, brick).setOrigin(0.5).setScrollFactor(0)
      });
    }

    addStartButton () {
      const x = (this.cameras.main.width / 2);
      const y = (this.cameras.main.height - 50);
      this.startButton = new SpriteButton(this, x + (5* 54), y, "play", "Start Stage", this.startScene.bind(this));
    }

    chooseBrick (brickName) {
      if (this.brickButtons[this.selectedBrick]) {
        this.currentBlockSprite.destroy();
        this.brickButtons[this.selectedBrick].clearTint();
      }
      this.selectedBrick = brickName;
      this.currentBlockSprite = this.add.sprite(50, 25, brickName).setScale(0.5).setOrigin(0).setScrollFactor(0)
    }

    createMap() {
          this.map = this.make.tilemap({ key: `scene${this.number}` });
          const tileset = this.map.addTilesetImage("map", null, 32, 32, 0, 0); // 1px margin, 2px spacing
          this.groundLayer = this.map.createLayer(`scene${this.number}`, tileset);
          this.damage = this.map.createLayer("damage", tileset);

          this.groundLayer.setCollisionByExclusion([-1]);
          this.damage.setCollisionByExclusion([-1]);

          //this.damageLayer.setCollisionByExclusion([-1]);
          // this.platform.setCollisionByProperty({ collides: true });
          this.matter.world.convertTilemapLayer(this.groundLayer);
          this.matter.world.convertTilemapLayer(this.damage);
          this.rotatorGroup = this.matter.world.nextGroup();
          this.batGroup = this.matter.world.nextGroup();


          this.map.getObjectLayer("objects").objects.forEach(crateObject => {
            const { x, y, width, height, name } = crateObject;

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

    createMap2() {
      this.tileMap = this.make.tilemap({ key: "scene" + this.number , tileWidth: 32, tileHeight: 32 });
      //this.tileSetBg = this.tileMap.addTilesetImage("background");
      //this.tileMap.createLayer('background', this.tileSetBg)

      this.tileSet = this.tileMap.addTilesetImage("softbricks");
      this.platform = this.tileMap.createLayer("scene" + this.number, this.tileSet);
      this.objectsLayer = this.tileMap.getObjectLayer('objects');


      this.platform.setCollisionByExclusion([-1]);

      this.batGroup = this.add.group();
      this.zombieGroup = this.add.group();
      this.foesGroup = this.add.group();
      this.turnGroup = this.add.group();
      this.exitGroup = this.add.group();
      this.platformGroup = this.add.group();
      this.lunchBoxGroup = this.add.group();
      this.spikeGroup = this.add.group();
      this.coins = this.add.group();

      this.objectsLayer.objects.forEach( object => {
        if (object.name === "bat") {
          let bat = new Bat(this, object.x, object.y, object.type);
          this.batGroup.add(bat)
          this.foesGroup.add(bat)
        }

        if (object.name === "zombie") {
          let zombie = new Zombie(this, object.x, object.y, object.type);
          this.zombieGroup.add(zombie);
          this.foesGroup.add(zombie);
        }

        if (object.name.startsWith("spike")) {
          const type = object.name.split(":")[1] || 0;
          let spike = new Spike(this, object.x, object.y, +type);
          this.spikeGroup.add(spike);
          this.foesGroup.add(spike);
        }

        if (object.name === "platform") {
          this.platformGroup.add(new Platform(this, object.x, object.y, object.type))
        }

        if (object.name === "turn") {
          this.turnGroup.add(new Turn(this, object.x, object.y))
        }

        if (object.name === "lunchbox") {
          this.lunchBoxGroup.add(new LunchBox(this, object.x, object.y))
        }

        if (object.name === "text") {
          this.add.bitmapText(object.x, object.y, "title", object.text.text, 30).setDropShadow(2, 4, 0x222222, 0.9).setOrigin(0)
        }

        if (object.name === "coin") {
          this.coins.add(new Coin(this, object.x, object.y))
        }

        if (object.name === "exit") {
          this.exitGroup.add(new Exit(this, object.x, object.y).setOrigin(0.5))
        }
      });

      this.customBricks.forEach( customBrick => {
        this.bricks.push(new CustomBrick(this  , customBrick.x, customBrick.y, customBrick.name))
      })

      this.physics.add.collider(this.batGroup, this.platform, this.turnFoe, ()=>{
        return true;
      }, this);


      this.physics.add.collider(this.zombieGroup, this.turnGroup, this.turnFoe, ()=>{
        return true;
      }, this);

      this.physics.add.collider(this.zombieGroup, this.platform, this.hitFloor, ()=>{
        return true;
      }, this);
    }


    turnFoe (foe, platform) {
      foe.turn();
    }


    hitFloor() {

    }

    addPlayer() {
      this.elements = this.add.group();
      this.spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      const playerPosition = this.objectsLayer.objects.find( object => object.name === "player")
      this.player = new Player(this, playerPosition.x, playerPosition.y, 0);

      this.physics.add.collider(this.player, this.platform, this.hitFloor, ()=>{
        return true;
      }, this);

      this.physics.add.collider(this.player, this.platformGroup, this.hitFloor, ()=>{
        return true;
      }, this);


      this.physics.add.overlap(this.player, this.coins, this.pickCoin, ()=>{
        return true;
      }, this);

      this.physics.add.overlap(this.player, this.lunchBoxGroup, this.pickLunchBox, ()=>{
        return true;
      }, this);

      this.physics.add.overlap(this.player, this.exitGroup, () => {
        this.playAudio("stage");
        this.time.delayedCall(1000, () => this.finishScene(), null, this);
      }, ()=>{
        return true;
      }, this);

      this.blows = this.add.group();

      this.physics.add.overlap(this.blows, this.platform, this.blowPlatform, ()=>{
        return true;
      }, this);

    }

    pickCoin (player, coin) {
      if (!coin.disabled) {
        coin.pick();
        this.playAudio("coin");
        this.updateCoins();
      }
    }

    pickLunchBox (player, lunchBox) {
      if (!lunchBox.disabled) {
        this.playAudio("lunchbox");
        lunchBox.pick();
      }
    }

    hitPlayer(player, foe) {
      if (player.invincible) {
        foe.death();
        this.playAudio("foedeath");
      } else if (!player.dead && this.number > 0) {
        player.die();
        this.playAudio("death");
      }
    }

    blowFoe(blow, foe) {
      this.playAudio("kill");
      this.playAudio("foedeath");
      foe.death();
    }

    foeBlowBrick(brick, foe) {
      foe.turn();
      Array(Phaser.Math.Between(4,6)).fill(0).forEach( i => new Debris(this, brick.x, brick.y))
      brick.destroy();
    }

    blowPlatform (blow, platform) {
      const tile = this.getTile(platform)
      if (this.isBreakable(tile)) {
        this.playAudioRandomly("stone_fail");
        this.playAudioRandomly("stone");
        if (this.player.mjolnir) this.cameras.main.shake(30);
        blow.destroy();
        Array(Phaser.Math.Between(4,6)).fill(0).forEach( i => new Debris(this, tile.pixelX, tile.pixelY))
        this.platform.removeTileAt(tile.x, tile.y);
        this.spawnCoin(tile)

      }
    }

    spawnCoin(tile) {
      if (Phaser.Math.Between(0, 11) > 5) {
        this.time.delayedCall(500, () => { this.coins.add(new Coin(this, tile.pixelX, tile.pixelY))}, null, this);
      }
    }

    blowBrick (blow, brick) {
      if (this.player.mjolnir) this.cameras.main.shake(30);
      this.playAudio("stone_fail");
      this.playAudioRandomly("stone");
      blow.destroy();
      Array(Phaser.Math.Between(4,6)).fill(0).forEach( i => new Debris(this, brick.x, brick.y))
      brick.destroy();
    }

    getTile(platform) {
      const {x, y} = platform;
      return this.platform.getTileAt(x, y);
    }

    isBreakable (tile) {
      return tile?.properties['element'] === "break"
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
      if (this.currentBlockSprite) this.updatePointer();
      this.buildTime += delta;
      if (this.pointer?.isDown) {
        const {worldX, worldY}  = this.pointer;
        const point = new Phaser.Geom.Point(worldX, worldY);

        if (point.y >= this.cameras.main.height - 110) return;
        if (!this.pointer.rightButtonDown()) {
          this.buildBlock(this.currentBlockSprite);
        }
      }

      if (this.spaceBar?.isDown) {
        this.startScene();
      }
    }

    updatePointer () {
      const {worldX, worldY}  = this.pointer;
      const point = new Phaser.Geom.Point(worldX, worldY);
      this.currentBlockSprite.x = Math.round(point.x / 32) * 32;
      this.currentBlockSprite.y = Math.round(point.y / 32) * 32;
    }

    buildBlock(sprite) {
      if (this.buildTime < 500 || this.onABuiltBlock) return 0;
      if (this.canBuild(this.selectedBrick)) {
        this.firstPlaced = true;
        this.showTutorial();
        this.playAudio("build");
        this.buildSmoke(32, sprite.y);
        this.updatePointer();
        this.bricks.push(new CustomBrick(this  , this.currentBlockSprite.x, this.currentBlockSprite.y, this.selectedBrick))
        this.buildTime = 0;
        this.updateCoins(-this.brickButtons[this.selectedBrick].brick.cost);
      }

    }

    canBuild(brickType) {
      if (brickType)
        return this.brickButtons[brickType].brick.cost <= +this.registry.get("coins");
    }

    buildSmoke (offsetY = 10, offsetX) {
      Array(Phaser.Math.Between(8, 14)).fill(0).forEach(i => {
          const varX = Phaser.Math.Between(-20, 20);
          new JumpSmoke(this, this.x + (offsetX + varX), this.y + offsetY)
      })
    }

    finishScene () {
      if (this.theme) this.theme.stop();
      this.scene.start("transition", { name: "STAGE", number: this.number + 1});
    }

    startScene () {
      let customBricks = this.bricks.concat(this.customBricks).filter(brick => brick !== null)
      this.registry.set("last_spent", +this.registry.get("last_budget") - +this.registry.get("coins"))
      this.registry.set("coins", this.registry.get("legit_coins"))

      this.time.delayedCall(1000, () => {
        this.sound.stopAll();
        if (this.theme) this.theme.stop();
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
