// Shared screen layout for the game and the stage editor.
//
// The stage maps are 25x25 tiles of 32px = 800x800, with a one-tile wall all
// the way around. The editor's buttons must sit OUTSIDE those walls, so the
// canvas is made wider than the map and the map is pushed right by one gutter.
// Both gutters are the same width, which keeps the map centred on the canvas.
//
//   0        GUTTER                     GUTTER + MAP_WIDTH   CANVAS_WIDTH
//   |  left  |########## map ##########|  right  |
//   | gutter |# wall ............ wall #| gutter  |
//   (palette)                            (save / play / exit)

export const TILE = 32;

export const MAP_COLS = 25;
export const MAP_ROWS = 25;
export const MAP_WIDTH = MAP_COLS * TILE;   // 800
export const MAP_HEIGHT = MAP_ROWS * TILE;  // 800

// Width of each UI column. 32px icons plus breathing room.
export const GUTTER = 112;

// Where the tilemap layers are drawn. Everything placed in the world is in
// canvas coordinates, so playfield x values already include this offset.
export const MAP_OFFSET_X = GUTTER;
export const MAP_OFFSET_Y = 0;

export const CANVAS_WIDTH = MAP_WIDTH + (GUTTER * 2);
export const CANVAS_HEIGHT = MAP_HEIGHT;

// Centre line of each UI column.
export const LEFT_COLUMN_X = GUTTER / 2;
export const RIGHT_COLUMN_X = CANVAS_WIDTH - (GUTTER / 2);

// The interior of the map: inside the wall border, where bricks may be placed.
export const PLAYFIELD = {
  left: MAP_OFFSET_X + TILE,
  right: MAP_OFFSET_X + MAP_WIDTH - TILE,
  top: MAP_OFFSET_Y + TILE,
  bottom: MAP_OFFSET_Y + MAP_HEIGHT - TILE
};

// Is this canvas point inside the walls, i.e. a legal place for a brick?
export const isInsidePlayfield = (x, y) =>
  x >= PLAYFIELD.left && x < PLAYFIELD.right &&
  y >= PLAYFIELD.top && y < PLAYFIELD.bottom;

// Snap a canvas coordinate to the tile grid the map is drawn on.
export const snapToGrid = (x, y) => ({
  x: MAP_OFFSET_X + (Math.round((x - MAP_OFFSET_X) / TILE) * TILE),
  y: MAP_OFFSET_Y + (Math.round((y - MAP_OFFSET_Y) / TILE) * TILE)
});

// Canvas coordinate -> tile index within the tilemap layer.
export const toTileX = (x) => Math.floor((x - MAP_OFFSET_X) / TILE);
export const toTileY = (y) => Math.floor((y - MAP_OFFSET_Y) / TILE);

// Saved stages are stored in MAP coordinates (0,0 = the map's top-left corner),
// not canvas coordinates, so that stored stages keep working if GUTTER ever
// changes. Convert on the way out to storage and on the way back in.
export const toMapX = (x) => x - MAP_OFFSET_X;
export const toMapY = (y) => y - MAP_OFFSET_Y;
export const fromMapX = (x) => x + MAP_OFFSET_X;
export const fromMapY = (y) => y + MAP_OFFSET_Y;
