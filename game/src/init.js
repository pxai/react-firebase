import Phaser from "phaser";
import Bootloader from "./bootloader";
import Outro from "./outro";
import Splash from "./splash";
import GameBuilder from "./game_builder";
import Transition from "./transition";
import Game from "./game";
import PhaserMatterCollisionPlugin from "phaser-matter-collision-plugin";
import { MatterGravityFixPlugin } from './matter_gravity_fix';

const gameContainer = document.getElementById("container");
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 800;
const isMobile = window.innerWidth < 768;
const width = isMobile ? window.innerWidth : DEFAULT_WIDTH;
const height = isMobile ? window.innerHeight : DEFAULT_HEIGHT;
const debugMode = gameContainer.dataset.debug === "true";

const config = {
    width,
    height,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    autoRound: false,
    parent: "container",
    physics: {
        default: "matter",
        matter: {
            debug: true
        }
    },
    initialScene: 'game',
    plugins: {
        scene: [{
            plugin: PhaserMatterCollisionPlugin, // The plugin class
            key: "matterCollision", // Where to store in Scene.Systems, e.g. scene.sys.matterCollision
            mapping: "matterCollision" // Where to store in the Scene, e.g. scene.matterCollision
          }, {
            key: 'MatterGravityFixPlugin',
            plugin: MatterGravityFixPlugin,
            mapping: 'matterGravityFix',
            start: true,
          }]
    },
    scene: [
        Bootloader,
        Splash,
        Transition,
        Game,
        GameBuilder,
        Outro,
    ]
};

let game = new Phaser.Game(config);

const resizeGame = () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    // Destroy current game instance
    game.destroy(true);

    // Recreate the game with new width and height
    game = new Phaser.Game({
        width: newWidth,
        height: newHeight,
        scale: {
            mode: Phaser.Scale.NONE, // Prevent automatic scaling
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        ...config});
};

// Listen for window resize event
window.addEventListener("resize", resizeGame);

