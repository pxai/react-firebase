// Reading and writing stages.
//
// A stage is stored in MAP coordinates (0,0 = the map's top-left corner) while
// everything in the running game works in CANVAS coordinates, which include the
// UI gutter offset. This module is the only place that conversion happens, in
// both directions, so a stage saved today still loads if the gutters change.
//
// It is also the handoff between the site and the game: both run on the same
// origin (the game is an iframe), so localStorage is shared. The React side
// imports the key names from here rather than repeating the strings.
import { fromMapX, fromMapY, toMapX, toMapY } from './layout.js';

// The stage the editor is working on, handed to the save page. Historic name,
// kept so drafts already in a browser keep working.
export const DRAFT_KEY = 'currentMap';

// A stored stage the site has asked the game to play.
export const PLAY_KEY = 'txokas:playMap';

// Canvas coordinates -> the stored form.
export const serializeStage = (bricks = []) =>
  bricks
    .filter((brick) => brick && typeof brick.name === 'string')
    .map((brick) => ({ x: toMapX(brick.x), y: toMapY(brick.y), name: brick.name }));

// The stored form -> canvas coordinates.
//
// Tolerant on purpose: this parses data that has been through localStorage and
// Firestore and may have been hand-edited, so anything unusable is dropped
// rather than allowed to reach the scene as a NaN position.
// Accepts a number or a numeric string. Deliberately not Number(): Number(null),
// Number('') and Number(false) are all 0, which would place a bad element at the
// map's edge rather than drop it.
const coordinate = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const parseStage = (raw) => {
  let data = raw;

  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(data)) return [];

  return data.reduce((stage, item) => {
    if (!item || typeof item.name !== 'string' || !item.name) return stage;

    const x = coordinate(item.x);
    const y = coordinate(item.y);
    if (x === null || y === null) return stage;

    stage.push({ x: fromMapX(x), y: fromMapY(y), name: item.name });
    return stage;
  }, []);
};

// localStorage access is wrapped: it throws in private mode and with site data
// blocked, and an unplayable stage is better than a scene that fails to boot.
export const readStage = (key) => {
  try {
    return parseStage(window.localStorage.getItem(key));
  } catch (error) {
    console.warn(`Could not read stage "${key}":`, error);
    return [];
  }
};

export const writeStage = (key, bricks) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(serializeStage(bricks)));
    return true;
  } catch (error) {
    console.warn(`Could not save stage "${key}":`, error);
    return false;
  }
};
