export default class Bootloader extends Phaser.Scene {
    constructor () {
        super({ key: "bootloader" });
    }

    preload () {
        this.createBars();
        this.load.on(
            "progress",
            function (value) {
                this.progressBar.clear();
                this.progressBar.fillStyle(0x000000, 1);
                this.progressBar.fillRect(
                    this.cameras.main.width / 4,
                    this.cameras.main.height / 2 - 16,
                    (this.cameras.main.width / 2) * value,
                    16
                );
            },
            this
        );
        this.load.on("complete", () => {
            const params = new URLSearchParams(window.location.search);
            const scene = params.get("builder") == "" ? "game_builder" : "game";

            this.scene.start(scene, {number: 0});
        },this);

        this.load.image("fireball", "assets/images/fireball.png");
        this.load.audio("splash", "assets/sounds/splash.mp3");
        this.load.audio("start", "assets/sounds/start.mp3");
        this.load.audio("fire", "assets/sounds/fire.mp3");
        this.load.audio("wall", "assets/sounds/wall.mp3");
        this.load.audio("hit", "assets/sounds/hit.mp3");
        this.load.audio("bell", "assets/sounds/bell.mp3");

        this.load.spritesheet("bell", "assets/images/bell.png", { frameWidth: 32, frameHeight: 32 });
        this.load.image("pello", "assets/images/pello_ok.png");
        this.load.image("rotator", "assets/images/rotator.png");
        this.load.bitmapFont("pixelFont", "assets/fonts/mario.png", "assets/fonts/mario.xml");
        this.load.bitmapFont("title", "assets/fonts/title.png", "assets/fonts/title.xml");
        this.load.image("map", "assets/maps/map.png");
        this.load.spritesheet("bat", "assets/images/bat.png", { frameWidth: 32, frameHeight: 32 });
        this.load.image("play", "assets/images/play.png");
        this.load.image("save", "assets/images/save.png");

        Array(8).fill(0).forEach((_,i) => {
            this.load.tilemapTiledJSON(`scene${i}`,`assets/maps/scene${i}.json`)
        });

        Array(4).fill(0).forEach((_,i) => {
            this.load.image(`brick${i}`,`assets/images/brick${i}.png`)
        });

        Array(4).fill(0).forEach((_,i) => {
            this.load.image(`spike${i}`,`assets/images/spike${i}.png`)
        });

        this.registry.set("tries", 0);
    }

    create () {
      }

    createBars () {
        this.loadBar = this.add.graphics();
        this.loadBar.fillStyle(0xffffff, 1);
        this.loadBar.fillRect(
            this.cameras.main.width / 4 - 2,
            this.cameras.main.height / 2 - 18,
            this.cameras.main.width / 2 + 4,
            20
        );
        this.progressBar = this.add.graphics();
    }
}
