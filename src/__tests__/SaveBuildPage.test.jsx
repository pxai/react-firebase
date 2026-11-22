import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SaveBuildPage from '../SaveBuildPage';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';

jest.mock('../firebase', () => ({ auth: {}, db: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'doc-ref'),
  getDoc: jest.fn(),
}));

jest.mock('../AddStageForm', () => () => <div>EDIT FORM</div>);
jest.mock('../MyStageList', () => () => <div>Your stages</div>);
jest.mock('../StagePreview', () => {
  const StagePreview = () => <div>preview</div>;
  return { __esModule: true, default: StagePreview, stageElements: () => [] };
});

const OWNER = 'owner-uid';

const signedInAs = (uid) =>
  onAuthStateChanged.mockImplementation((auth, callback) => {
    callback(uid ? { uid } : null);
    return jest.fn();
  });

const stageOwnedBy = (uid) =>
  getDoc.mockResolvedValue({
    exists: () => true,
    id: 'stage-1',
    data: () => ({ name: 'Castle of doom', userId: uid, mapData: '[]' }),
  });

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/save" element={<SaveBuildPage />} />
        <Route path="/save/:id" element={<SaveBuildPage />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  stageOwnedBy(OWNER);
});

afterEach(() => jest.restoreAllMocks());

describe('editing a stored stage', () => {
  it('lets the author edit their own stage', async () => {
    signedInAs(OWNER);

    renderAt('/save/stage-1');

    expect(await screen.findByText('EDIT FORM')).toBeInTheDocument();
  });

  it('refuses a signed-in player editing someone else\'s stage', async () => {
    signedInAs('someone-else');

    renderAt('/save/stage-1');

    expect(await screen.findByText(/belongs to another player/i)).toBeInTheDocument();
    expect(screen.queryByText('EDIT FORM')).not.toBeInTheDocument();
  });

  it('refuses an anonymous visitor, and does not show them a form', async () => {
    signedInAs(null);

    renderAt('/save/stage-1');

    expect(await screen.findByText(/only the author can edit a stage/i)).toBeInTheDocument();
    expect(screen.queryByText('EDIT FORM')).not.toBeInTheDocument();
  });

  it('offers to play the stage instead of editing it', async () => {
    signedInAs(null);

    renderAt('/save/stage-1');

    expect(await screen.findByRole('link', { name: /play it instead/i }))
      .toHaveAttribute('href', '/play/stage-1');
  });

  it('does not flash a refusal at the author while auth is still resolving', async () => {
    // onAuthStateChanged has not fired yet: the user is unknown, not absent.
    onAuthStateChanged.mockImplementation(() => jest.fn());

    renderAt('/save/stage-1');

    await waitFor(() => expect(getDoc).toHaveBeenCalled());

    expect(screen.queryByText(/only the author can edit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/belongs to another player/i)).not.toBeInTheDocument();
    expect(screen.queryByText('EDIT FORM')).not.toBeInTheDocument();
    expect(screen.getByText(/loading stage/i)).toBeInTheDocument();
  });

  it('reports a stage that no longer exists', async () => {
    signedInAs(OWNER);
    getDoc.mockResolvedValue({ exists: () => false });

    renderAt('/save/stage-1');

    expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument();
  });
});

describe('saving a newly built stage', () => {
  it('shows the form with no ownership check, since there is no owner yet', async () => {
    signedInAs(OWNER);

    renderAt('/save');

    expect(await screen.findByText('EDIT FORM')).toBeInTheDocument();
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('still shows the form to a signed-out visitor, who is told to sign in', async () => {
    signedInAs(null);

    renderAt('/save');

    expect(await screen.findByText(/sign in from the top bar/i)).toBeInTheDocument();
  });
});
