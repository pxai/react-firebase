import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../HomePage';

// HomePage no longer subscribes to auth or mounts AddStageForm. It had been
// rendering that form with no stage to save, so submitting it stored a stage
// with mapData: undefined. The form now lives on the save page, which has a
// stage, and MyStageList handles its own auth.
jest.mock('../firebase', () => ({ auth: {}, db: {} }));
jest.mock('../Game', () => (props) => (
  <div data-testid="game" data-mode={props.mode || 'play-fixed'} />
));
jest.mock('../MyStageList', () => () => <div>MyStagesList Mock</div>);

const renderPage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );

describe('HomePage', () => {
  test('renders the game and the stage list', () => {
    renderPage();

    expect(screen.getByTestId('game')).toBeInTheDocument();
    expect(screen.getByText('MyStagesList Mock')).toBeInTheDocument();
  });

  test('shows the fixed training stages, not the editor', () => {
    renderPage();

    expect(screen.getByTestId('game')).toHaveAttribute('data-mode', 'play-fixed');
  });

  test('links to the latest stages by other players', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /play latest stages/i }))
      .toHaveAttribute('href', '/stages');
  });

  test('links to the editor', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /build your own/i }))
      .toHaveAttribute('href', '/build');
  });

  test('does not offer a save form with no stage to save', () => {
    renderPage();

    expect(screen.queryByRole('button', { name: /save stage/i })).not.toBeInTheDocument();
  });
});
