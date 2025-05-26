import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../Footer';

describe('Footer', () => {
  test('renders footer text', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    expect(screen.getByText(/© 2024 Txokas Games/i)).toBeInTheDocument();
  });
});
