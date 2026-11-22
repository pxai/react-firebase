import { readStage, DRAFT_KEY, PLAY_KEY } from "./stage_io";

export default class Bootloader extends Phaser.Scene {
    constructor () {
        super({ key: "bootloader" });
    }

    preload () {
        this.createBars();
        this.createEraserTexture();
        this.createClearAllTexture();
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

            // ?play — play a stage the site put in localStorage for us.
            if (params.has("play")) {
                this.scene.start("game", {
                    number: 'template',
                    customBricks: readStage(PLAY_KEY),
                    standalone: true
                });
                return;
            }

            // ?builder — the editor. With &draft, carry on from the stage in
            // progress instead of starting empty ("back to edit").
            if (params.has("builder")) {
                this.scene.start("game_builder", {
                    number: 'template',
                    customBricks: params.has("draft") ? readStage(DRAFT_KEY) : []
                });
                return;
            }

            // Otherwise the fixed training stages, from the first one.
            this.scene.start("game", { number: 0 });
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
        this.load.image("back", "assets/images/back.png");

        Array(8).fill(0).forEach((_,i) => {
            this.load.tilemapTiledJSON(`scene${i}`,`assets/maps/scene${i}.json`)
        });

        this.load.tilemapTiledJSON(`scenetemplate`,`assets/maps/scenetemplate.json`)

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

    // The editor needs a trash icon and there is no such image in assets/, so
    // draw one once into a 32x32 texture called "trash". Drawn in white so the
    // usual hover tint works on it like it does on the other button sprites.
    createEraserTexture () {
        if (this.textures.exists("trash")) return;

        const icon = this.make.graphics({ x: 0, y: 0, add: false });

        // lid handle
        icon.fillStyle(0xffffff, 1);
        icon.fillRect(13, 2, 6, 3);
        // lid
        icon.fillRect(5, 6, 22, 4);
        // can body
        icon.fillRect(7, 12, 18, 18);
        // slots in the body, punched out in the background colour
        icon.fillStyle(0x3e6875, 1);
        icon.fillRect(11, 15, 2, 12);
        icon.fillRect(15, 15, 2, 12);
        icon.fillRect(19, 15, 2, 12);

        icon.generateTexture("trash", 32, 32);
        icon.destroy();
    }

    // "Clear the whole stage": two bins, to read as more than the single-item
    // eraser next to it. Also drawn rather than loaded, for the same reason.
    createClearAllTexture () {
        if (this.textures.exists("trash_all")) return;

        const icon = this.make.graphics({ x: 0, y: 0, add: false });

        const bin = (offsetX, offsetY) => {
            icon.fillStyle(0xffffff, 1);
            icon.fillRect(offsetX + 8, offsetY + 1, 5, 2);     // lid handle
            icon.fillRect(offsetX + 3, offsetY + 4, 15, 3);    // lid
            icon.fillRect(offsetX + 5, offsetY + 9, 11, 13);   // body
            icon.fillStyle(0x3e6875, 1);
            icon.fillRect(offsetX + 8, offsetY + 11, 2, 9);    // slots
            icon.fillRect(offsetX + 12, offsetY + 11, 2, 9);
        };

        // Back bin first, then the front one overlapping it.
        bin(12, 3);
        icon.fillStyle(0x3e6875, 1);
        icon.fillRect(10, 2, 3, 26);                           // gap between them
        bin(1, 8);

        icon.generateTexture("trash_all", 32, 32);
        icon.destroy();
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
