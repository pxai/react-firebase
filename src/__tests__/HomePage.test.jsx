import React from 'react';
import { render, screen, act } from '@testing-library/react';
import HomePage from '../HomePage';
import { onAuthStateChanged } from 'firebase/auth';

// Mock firebase auth and local firebase module
jest.mock('firebase/auth', () => {
  const originalModule = jest.requireActual('firebase/auth');
  return {
    ...originalModule,
    onAuthStateChanged: jest.fn(),
    getAuth: jest.fn(() => ({ currentUser: null })),
  };
});

jest.mock('../firebase', () => ({
  auth: {
    // Mock auth object properties if needed by onAuthStateChanged or component
  },
}));

// Mock child components
jest.mock('../Game', () => () => <div>Game Mock</div>);
jest.mock('../AddStageForm', () => () => <div>AddStageForm Mock</div>);
jest.mock('../MyStageList', () => () => <div>MyStagesList Mock</div>); // Corrected name

describe('HomePage', () => {
  let mockAuthUnsubscribe;

  beforeEach(() => {
    onAuthStateChanged.mockClear();
    mockAuthUnsubscribe = jest.fn();
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null); // Initial state: no user
      return mockAuthUnsubscribe;
    });
  });

  // Helper function to simulate auth state changes
  const simulateAuthStateChange = (user) => {
    const lastCall = onAuthStateChanged.mock.calls.length - 1;
    if (onAuthStateChanged.mock.calls[lastCall]) {
      const callback = onAuthStateChanged.mock.calls[lastCall][1];
      callback(user);
    }
  };

  test('renders Game and MyStagesList components', () => {
    render(<HomePage />);
    expect(screen.getByText('Game Mock')).toBeInTheDocument();
    expect(screen.getByText('MyStagesList Mock')).toBeInTheDocument();
  });

  describe('when user is not logged in', () => {
    test('does not render AddStageForm component', () => {
      render(<HomePage />);
      // User is null by default from beforeEach
      expect(screen.queryByText('AddStageForm Mock')).not.toBeInTheDocument();
    });
  });

  describe('when user is logged in', () => {
    test('renders AddStageForm component', () => {
      render(<HomePage />);
      
      act(() => {
        simulateAuthStateChange({ uid: 'test-user' });
      });
      
      expect(screen.getByText('AddStageForm Mock')).toBeInTheDocument();
    });
  });

  test('calls unsubscribe on unmount', () => {
    const { unmount } = render(<HomePage />);
    unmount();
    expect(mockAuthUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
