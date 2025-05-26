import React from 'react';
import { render, screen } from '@testing-library/react';
import AboutPage from '../AboutPage';

describe('AboutPage', () => {
  test('renders page heading', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { name: /About Page/i })).toBeInTheDocument();
  });

  test('renders project information text', () => {
    render(<AboutPage />);
    expect(screen.getByText(/Txokas.com a game by Pello & Josu/i)).toBeInTheDocument();
  });
});
