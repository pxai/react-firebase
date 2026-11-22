import { TILE, PLAYFIELD } from './layout';

// A solid bar that slides back and forth along one axis.
//
// Built on Matter, like the rest of the game. (The old Platform class in
// platform.js is Arcade-based and references textures that are never loaded,
// so it could not be reused.) The body is static and moved by a tween: Phaser's
// Matter transform setters push the tween's x/y straight into the body, so the
// collision shape travels with the sprite. Rotator drives its spin the same way.
//
// Placement matches the editor: the stored x,y is the bar's TOP-LEFT corner, so
// it lands exactly where the ghost cursor was, even though a tileSprite is
// centre-origin.
//
// Orientation and travel direction are independent: the rising platform is a
// vertical bar that travels vertically, the sliding one a flat bar that travels
// horizontally.
const DEFAULT_TILES = 3;
const TRAVEL_TILES = 3;
const DURATION = 2600;

export default class MovingPlatform {
    // `vertical` orients the BAR (a tall column of sprites, one tile wide);
    // `axis` is the direction it travels. The rising platform is both vertical
    // and travels on y; the sliding one is a flat bar travelling on x.
    constructor (scene, x, y, { axis = 'x', tiles = DEFAULT_TILES, vertical = false, travel = TRAVEL_TILES * TILE, duration = DURATION } = {}) {
        this.scene = scene;
        this.axis = axis === 'y' ? 'y' : 'x';
        this.vertical = !!vertical;
        this.label = this.axis === 'y' ? 'platform_v' : 'platform_h';

        const run = Math.max(1, tiles) * TILE;
        const width = this.vertical ? TILE : run;
        const height = this.vertical ? run : TILE;

        const platform = scene.add.tileSprite(x + (width / 2), y + (height / 2), width, height, "rotator");
        platform.label = this.label;

        scene.matter.add.gameObject(platform, {
            restitution: 0,  // no bounciness of its own; the ball keeps its own
            frictionAir: 0,
            friction: 0.2
        }).setStatic(true);

        this.platform = platform;

        const from = platform[this.axis];
        const to = this.travelTarget(from, travel, width, height);

        // Nowhere to go (placed hard against both ends): leave it as a static
        // bar rather than adding a tween that does nothing.
        if (to === from) return;

        scene.tweens.add({
            targets: platform,
            duration,
            [this.axis]: { from, to },
            repeat: -1,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });
    }

    // Keep the bar inside the walls: slide forward if there is room, otherwise
    // back the other way, otherwise not at all.
    travelTarget (from, travel, width, height) {
        // Half the bar's extent along the axis it travels on.
        const half = this.axis === 'y' ? height / 2 : width / 2;
        const min = (this.axis === 'y' ? PLAYFIELD.top : PLAYFIELD.left) + half;
        const max = (this.axis === 'y' ? PLAYFIELD.bottom : PLAYFIELD.right) - half;

        const forward = Math.min(from + travel, max);
        if (forward > from) return forward;

        const backward = Math.max(from - travel, min);
        if (backward < from) return backward;

        return from;
    }
}
