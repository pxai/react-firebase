export default class Ball {
    constructor (scene, x, y) {
        this.x = x;
        this.y = y;
        this.scene = scene;
        this.limitX = x;
        this.limitY = y;
        this.body1 = this.scene.matter.add.circle(x, this.limitY, 32, { isStatic: true });

        this.fireball = this.scene.matter.add.sprite(x, y + 100, "fireball")//this.scene.matter.add.circle(150, 250, 16);
        this.fireball.setBounce(1)
        this.fireball.setScale(2)
        this.spring = this.scene.matter.add.spring(this.body1, this.fireball, 40, 0.01);
        this.springSprite = scene.add.sprite((this.body1.x + this.fireball.x) / 2, (this.body1.y + this.fireball.y) / 2, "rotator");

       this.scene.matter.add.mouseSpring();

       this.readyToFire = false;
       this.firing = false;
       this.dead = false;
       this.scene.events.on("update", this.update, this);
       this.showSpring = false;
       this.scene.time.delayedCall(100, () => {this.showSpring = true}, null, this)
        this.init();
        this.setDrag()
    }

    setDrag() {
        this.scene.input.mouse.disableContextMenu();


        this.fireball.setInteractive();
        this.scene.input.setDraggable(this.fireball);

        this.dragging = false;

        this.fire = false;

        this.fireball.on('pointerdown', function (pointer) {
            //console.log("Pointer down")
        }, this);

        this.scene.input.on('pointermove', function (pointer) {
            //console.log("Pointer move")
        }, this);

        this.scene.input.on('pointerup', function (pointer) {
            //console.log("Pointer up")
        }, this);

        this.fireball.on('pointerout', function () {
            //console.log("Pointer out")
        }, this);

        this.scene.input.on('dragstart', function (pointer, gameObject) {
            //console.log("Drag start")
        });

        this.scene.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            this.dragging = true;
            //console.log("Drag")

        }.bind(this));

        this.scene.input.on('dragend', function (pointer, gameObject) {
            this.dragging = false;
            this.fire = true
            console.log("Drag end: FIRE!!")
        }.bind(this));
    }

    init () {
        console.log("Ball init")
    }

    update () {
        if (this.dead || this.scene?.gameOver) return;
        if (this.scene.pointer.isDown) {
            if (this.scene.pointer.leftButtonDown() && this.isDragging) {
                this.readyToFire = true;
            }
        } else if (this.fire) {
            this.fire = false;
            this.readyToFire = false;
            console.log("Filre! : ", this.fireball?.position, this.fireball)
            //this.fireball.setScale(1)
            this.firing = true;
            this.scene.playAudio("fire")
            this.scene.matter.world.remove(this.body1)
            if (this.graphics) this.graphics.destroy()
            this.scene.time.delayedCall(100, () => {this.scene.matter.world.remove(this.spring)}, null, this)
            this.scene.time.delayedCall(3000, () => {this.scene.restartScene()}, null, this)
        }

        this.renderDebug()
    }

    renderDebug() {
        if (!this.showSpring) return;
        if (!this.graphics) {
          this.graphics = this.scene.add.graphics();
        }

        this.graphics.clear();
        if (this.springLength() > 220) {
            this.dead = true;
            this.showSpring = false;
            this.scene.restartScene();
            return;
        }
        this.scene.matter.world.renderConstraint(this.spring, this.graphics, 0xffffff, 4, 4, 4, 4, 1);
      }

      springLength () {
        if (this.fireball?.ready) {
            //console.log("Spring length: ", Phaser.Math.Distance.Between(this.fireball.x, this.fireball.y, this.limitX, this.limitY))
            return Phaser.Math.Distance.Between(this.fireball.x, this.fireball.y, this.limitX, this.limitY);
        }
    }
    death () {
        this.fireball.visible = false;
        this.dead = true;
    }
}

