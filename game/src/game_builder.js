import Ball from './ball';
import Exit from './exit';
import Bat from './bat';
import Rotator from './rotator';
import Platform from "./platform";
import BrickButton from "./brick_button";
import CustomBrick from "./custom_brick";
import SpriteButton from "./sprite_button";
import Spike from "./spike";

const ONLY_ONCE = ["bell", "fireball"];
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

    create () {
      this.width = this.sys.game.config.width;
      this.height = this.sys.game.config.height;
      this.center_width = this.width / 2;
      this.center_height = this.height / 2;
      this.cameras.main.setBackgroundColor(0x62a2bf)
      console.log("This number: ", this.number)
      this.createMap();

      this.cameras.main.setBounds(0, 0, 20920 * 2, 20080 * 2);

      this.addPointer();
      this.loadAudios();
      this.addPanel();
      this.addUnselectButton()
      this.addStartButton();
      this.addSaveButton();
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

    showMessage (message) {
      this.tutorial1.setAlpha(1);
      this.tutorial1.setText(message)

      this.tweens.add({
        targets: [this.tutorial1],
        alpha: {from: 1, to: 0},
        delay: 2000,
        duration: 500,
      })
    }

    addPanel () {
      this.selectedBrick = null;
      this.onABuiltBlock = false;
      this.brickTypes = [
        { name: "fireball", description: "Ball"},
        Array(4).fill(0).map((_, i) => ({name: `brick${i}`, description: `Solid brick ${i}`})),
        Array(4).fill(0).map((_, i) => ({name: `spike${i}`, description: `Deadly spike ${i}`})),
        { name: "bell", description: "Bell to ring"},
      ].flat();

      this.brickButtons = {};
      this.bricks = []
      const x = (this.cameras.main.width / 2) - 256;
      const y = (this.cameras.main.height - 50);
      this.brickTypes.forEach( (brick, i) => {
        this.brickButtons[brick.name] = new BrickButton(this, x + (i * 48), y, brick).setOrigin(0.5).setScrollFactor(0)
      });
    }

    addUnselectButton () {
      const x = (this.cameras.main.width / 2);
      const y = (this.cameras.main.height - 50);
      this.startButton = new SpriteButton(this, x - (6* 54), y, "play", "Unselect", this.startScene.bind(this));
    }

    addStartButton () {
      const x = (this.cameras.main.width / 2);
      const y = (this.cameras.main.height - 50);
      this.startButton = new SpriteButton(this, x + (5* 54), y, "play", "Start Stage", this.startScene.bind(this));
    }

    addSaveButton () {
      const x = (this.cameras.main.width / 2);
      const y = (this.cameras.main.height - 50);
      this.startButton = new SpriteButton(this, x + (6* 54), y, "save", "Save Stage", this.saveScene.bind(this));
    }

    chooseBrick (brickName) {
      if (this.brickButtons[this.selectedBrick]) {
        this.currentBlockSprite.destroy();
        this.brickButtons[this.selectedBrick].clearTint();
      }
      this.selectedBrick = brickName;
      this.currentBlockSprite = this.add.sprite(50, 25, brickName).setScale(1).setOrigin(0).setScrollFactor(0)
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
      //this.playAudio("build"); // TODO
      //this.buildSmoke(32, sprite.y); // TODO

      this.updatePointer();
      console.log("Added brick: ", this.selectedBrick)
      if (this.selectedBrick === "fireball") {
        const{x, y} = this.currentBlockSprite
        this.addBall(x, y)
      }
      this.bricks.push(new CustomBrick(this  , this.currentBlockSprite.x, this.currentBlockSprite.y, this.selectedBrick))
      this.buildTime = 0;

    }

    console.log("Current bricks: ", this.bricks, this.exportedMap)
  }

  get exportedMap () {
    return this.bricks.map(brick => ({
        x: brick.x,
        y: brick.y,
        name: brick.name
      })
    );
  }

  canBuild(brickType) {
    return !(ONLY_ONCE.includes(brickType) && this.bricks.map(brick => brick.name).includes(brickType))
  }

  isValidScene() {
    return ONLY_ONCE.every( special => this.bricks.map(brick => brick.name).includes(special))
  }

  saveScene () {
    if (this.isValidScene()) {
      window.localStorage.setItem('currentMap', JSON.stringify(this.exportedMap))
      this.showMessage("Map saved successfully!");
      window.parent.location.href = '/save';
    } else {
      this.showMessage("Add at least the ball and the bell")
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
    let customBricks = this.bricks.concat(this.customBricks).filter(brick => brick !== null)

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
