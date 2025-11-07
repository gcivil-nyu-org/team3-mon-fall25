import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ErrorBlock from './ErrorBlock';

describe('ErrorBlock', () => {
  it('renders default message and does not show retry when no callback', () => {
    render(<ErrorBlock />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('renders message and calls retry callback when provided', () => {
    const onRetry = vi.fn();
    render(<ErrorBlock message="Something went wrong" onRetry={onRetry} />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
