import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavBar from '../NavBar';
import { onAuthStateChanged } from 'firebase/auth'; // This will be from the mock

// Mock the entire firebase/auth module
jest.mock('firebase/auth', () => {
  const originalModule = jest.requireActual('firebase/auth');
  return {
    ...originalModule,
    onAuthStateChanged: jest.fn(),
    // We also need to mock getAuth if it's directly used by NavBar or its children for initial state
    // For this NavBar, onAuthStateChanged is the primary mechanism for auth state.
    // However, to be safe and cover potential direct checks of currentUser on initial render:
    getAuth: jest.fn(() => ({
      currentUser: null, // Default to no user
    })),
  };
});

// Mock the local firebase setup module from ../firebase
jest.mock('../firebase', () => {
  const actualFirebase = jest.requireActual('firebase/app'); // if you need actual app
  const actualAuth = jest.requireActual('firebase/auth'); // if you need actual auth functions
  
  // Return a mock auth object that onAuthStateChanged can use
  // This mock needs to be compatible with what onAuthStateChanged expects
  const mockAuthInstance = {
    // Mock any properties or methods on auth that your component might use directly
    // For onAuthStateChanged, it's usually passed as the first argument.
    // The important part is that the onAuthStateChanged mock below can work.
  };

  return {
    // Provide a mock 'auth' object. This is what NavBar imports.
    auth: mockAuthInstance,
    // If your app uses other firebase services like firestore, mock them here too
    // firestore: jest.fn(),
  };
});

// Mock child components to isolate NavBar logic
jest.mock('../GoogleLogin', () => () => <div>GoogleLogin Mock</div>);
jest.mock('../AuthStatus', () => () => <div>AuthStatus Mock</div>);
jest.mock('../Logout', () => () => <div>Logout Mock</div>);

describe('NavBar', () => {
  let mockAuthUnsubscribe;

  beforeEach(() => {
    // Clear mock calls from previous tests
    onAuthStateChanged.mockClear();
    // Default mock implementation for onAuthStateChanged
    // It simulates the initial call in useEffect and provides a mock unsubscribe function
    mockAuthUnsubscribe = jest.fn();
    onAuthStateChanged.mockImplementation((auth, callback) => {
      // Simulate initial state (no user logged in)
      // The actual callback invocation to change state will be done in tests
      callback(null);
      return mockAuthUnsubscribe; // Return the mock unsubscribe function
    });
  });

  // Helper function to simulate auth state changes
  const simulateAuthStateChange = (user) => {
    // The first argument to onAuthStateChanged is the auth object (ignored in mock)
    // The second argument is the callback function
    // We need to find the latest call to onAuthStateChanged and invoke its callback
    const lastCall = onAuthStateChanged.mock.calls.length - 1;
    if (onAuthStateChanged.mock.calls[lastCall]) {
      const callback = onAuthStateChanged.mock.calls[lastCall][1];
      callback(user);
    }
  };

  test('renders TXOKAS.com link', () => {
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );
    expect(screen.getByText('TXOKAS.com')).toBeInTheDocument();
    expect(screen.getByText('TXOKAS.com').closest('a')).toHaveAttribute('href', '/');
  });

  describe('when user is not logged in', () => {
    test('renders GoogleLogin component and does not render Build link or AuthStatus/Logout', () => {
      render(
        <MemoryRouter>
          <NavBar />
        </MemoryRouter>
      );
      
      // Ensure onAuthStateChanged has been called and initial state (null user) is set
      // No need to call simulateAuthStateChange(null) if beforeEach handles it.

      expect(screen.getByText('GoogleLogin Mock')).toBeInTheDocument();
      expect(screen.queryByText('Build')).not.toBeInTheDocument();
      expect(screen.queryByText('AuthStatus Mock')).not.toBeInTheDocument();
      expect(screen.queryByText('Logout Mock')).not.toBeInTheDocument();
    });
  });

  describe('when user is logged in', () => {
    test('renders Build link, AuthStatus, and Logout components, and does not render GoogleLogin', () => {
      render(
        <MemoryRouter>
          <NavBar />
        </MemoryRouter>
      );

      // Simulate user logging in
      act(() => {
        simulateAuthStateChange({ uid: 'test-user', email: 'test@example.com' });
      });

      expect(screen.getByText('Build')).toBeInTheDocument();
      expect(screen.getByText('Build').closest('a')).toHaveAttribute('href', '/build');
      expect(screen.getByText('AuthStatus Mock')).toBeInTheDocument();
      expect(screen.getByText('Logout Mock')).toBeInTheDocument();
      expect(screen.queryByText('GoogleLogin Mock')).not.toBeInTheDocument();
    });
  });

  test('calls unsubscribe on unmount', () => {
    const { unmount } = render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );
    unmount();
    expect(mockAuthUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
