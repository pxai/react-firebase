import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LatestStagesPage from '../LatestStagesPage';
import { getDocs, orderBy, limit } from 'firebase/firestore';

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'stages-collection'),
  query: jest.fn((...args) => args),
  orderBy: jest.fn((field, direction) => ({ orderBy: field, direction })),
  limit: jest.fn((count) => ({ limit: count })),
  getDocs: jest.fn(),
}));

const snapshotOf = (stages) => ({
  docs: stages.map(({ id, ...data }) => ({ id, data: () => data })),
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <LatestStagesPage />
    </MemoryRouter>
  );

describe('LatestStagesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  test('asks for the newest stages first, capped', async () => {
    getDocs.mockResolvedValue(snapshotOf([]));

    renderPage();

    await waitFor(() => expect(getDocs).toHaveBeenCalled());
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(limit).toHaveBeenCalledWith(expect.any(Number));
  });

  test('lists stages with their author and a Play button', async () => {
    getDocs.mockResolvedValue(
      snapshotOf([
        {
          id: 'one',
          name: 'Castle of doom',
          userName: 'Josu',
          mapData: '[{"x":0,"y":0,"name":"bell"},{"x":64,"y":64,"name":"fireball"}]',
        },
      ])
    );

    renderPage();

    expect(await screen.findByText('Castle of doom')).toBeInTheDocument();
    expect(screen.getByText(/by Josu/)).toBeInTheDocument();
    expect(screen.getByText(/2 elements/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
  });

  test('will not offer to play a stage with no layout', async () => {
    getDocs.mockResolvedValue(snapshotOf([{ id: 'two', name: 'Empty', mapData: null }]));

    renderPage();

    expect(await screen.findByRole('button', { name: /no layout/i })).toBeDisabled();
  });

  test('says so when nothing has been shared', async () => {
    getDocs.mockResolvedValue(snapshotOf([]));

    renderPage();

    expect(await screen.findByText(/no stages have been shared yet/i)).toBeInTheDocument();
  });

  test('explains a denied read instead of showing an empty gallery', async () => {
    // What a Firestore rule that forbids reading other people's stages looks
    // like from here.
    const denied = new Error('Missing or insufficient permissions.');
    denied.code = 'permission-denied';
    getDocs.mockRejectedValue(denied);

    renderPage();

    expect(await screen.findByText(/not readable with the current firestore rules/i))
      .toBeInTheDocument();
  });

  test('reports any other failure', async () => {
    getDocs.mockRejectedValue(new Error('offline'));

    renderPage();

    expect(await screen.findByText(/could not load the latest stages/i)).toBeInTheDocument();
  });
});
