import React from 'react';
import { render, screen } from '@testing-library/react';
import StagePreview, { stageElements } from '../StagePreview';
import { MAP_OFFSET_X } from '../../game/src/layout.js';

// StagePreview reads the game's own modules, so these also check that the
// preview agrees with what the game would build from the same stage.
describe('stageElements', () => {
  const stage = JSON.stringify([
    { x: 32, y: 64, name: 'brick0' },
    { x: 96, y: 96, name: 'rotator:5' },
    { x: 160, y: 32, name: 'platform_v:3' },
    { x: 200, y: 200, name: 'bell' },
  ]);

  test('keeps map coordinates, so the preview is independent of the gutters', () => {
    const [brick] = stageElements(stage);

    expect(brick.x).toBe(32);
    expect(brick.y).toBe(64);
    // Not the canvas position the game would use.
    expect(brick.x).not.toBe(MAP_OFFSET_X + 32);
  });

  test('sizes a horizontal run along its width', () => {
    const rotator = stageElements(stage)[1];

    expect(rotator.width).toBe(5 * 32);
    expect(rotator.height).toBe(32);
  });

  test('sizes a vertical run along its height', () => {
    const platform = stageElements(stage)[2];

    expect(platform.width).toBe(32);
    expect(platform.height).toBe(3 * 32);
  });

  test('gives every element a sprite to draw', () => {
    for (const element of stageElements(stage)) {
      expect(element.sprite).not.toBeNull();
      expect(element.sprite.frames).toBeGreaterThanOrEqual(1);
    }
  });

  test('draws the platforms from the rotator tile they are built from', () => {
    const [, rotator, platform] = stageElements(stage);

    expect(platform.sprite.file).toBe('rotator.png');
    expect(rotator.sprite.file).toBe('rotator.png');
  });

  test('is empty for a stage that cannot be read', () => {
    for (const input of [null, undefined, '', 'not json', '[]']) {
      expect(stageElements(input)).toEqual([]);
    }
  });
});

describe('StagePreview', () => {
  test('says so when there is nothing placed', () => {
    render(<StagePreview mapData={null} />);

    expect(screen.getByText(/nothing placed yet/i)).toBeInTheDocument();
  });

  test('draws one node per element, positioned as a percentage of the map', () => {
    const { container } = render(
      <StagePreview mapData={'[{"x":400,"y":0,"name":"bell"}]'} />
    );

    const elements = container.querySelectorAll('.element');
    expect(elements).toHaveLength(1);
    // 400 of 800 across.
    expect(elements[0].style.left).toBe('50%');
    expect(elements[0].style.top).toBe('0%');
  });

  test('shows the caption when given one', () => {
    render(<StagePreview mapData={'[{"x":0,"y":0,"name":"bell"}]'} caption="1 element" />);

    expect(screen.getByText('1 element')).toBeInTheDocument();
  });
});
