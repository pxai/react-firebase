import Phaser from "phaser";
import Bootloader from "./bootloader";
import Outro from "./outro";
import Splash from "./splash";
import GameBuilder from "./game_builder";
import Transition from "./transition";
import Game from "./game";
import PhaserMatterCollisionPlugin from "phaser-matter-collision-plugin";
import { MatterGravityFixPlugin } from './matter_gravity_fix';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './layout';

const gameContainer = document.getElementById("container");
// Fixed canvas size, scaled to fit whatever it is embedded in. It is wider
// than the 800x800 map: the extra width is the two UI gutters either side of
// the walls, which hold the editor's buttons. See layout.js.
//
// This used to size the canvas to window.innerWidth on narrow screens, which
// left the 800px-wide map (and now the button columns) overflowing it. Letting
// Phaser.Scale.FIT do the scaling keeps the whole playfield and both button
// columns on screen at any size.
const width = CANVAS_WIDTH;
const height = CANVAS_HEIGHT;
const debugMode = gameContainer.dataset.debug === "true";

const config = {
    width,
    height,
    // Phaser's default is black, which showed as a hard edge against the
    // site's dark background. This is the site's --ink.
    backgroundColor: '#0e1b21',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    autoRound: false,
    parent: "container",
    physics: {
        default: "matter",
        matter: {
            debug: false
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

// Phaser.Scale.FIT rescales the canvas on resize by itself, so there is no
// resize handler here. The old one destroyed and recreated the whole game on
// every resize event, which threw away a stage in progress in the editor (and
// did not actually resize anything: it spread `config` after width/height, so
// the original values won).
new Phaser.Game(config);

