import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import Filters from './Filters';

describe('Filters', () => {
  it('renders results count and category checkboxes, calls onChange when category toggled', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} />);

    // results count element
    expect(screen.getByText(/results/i)).toBeInTheDocument();

    // category checkbox exists
    const electronics = screen.getByLabelText('Electronics');
    expect(electronics).toBeInTheDocument();

    // toggle category
    fireEvent.click(electronics);
    expect(onChange).toHaveBeenCalled();
  });

  it('updates price range inputs and triggers onChange after debounce', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    try {
      render(<Filters initial={{}} onChange={onChange} />);

      const minInput = screen.getByLabelText('Min price');
      const maxInput = screen.getByLabelText('Max price');

      act(() => {
        fireEvent.change(minInput, { target: { value: '100' } });
        fireEvent.change(maxInput, { target: { value: '1500' } });
      });

      // Advance timers to complete debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Verify onChange was called with the correct values
      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls.at(-1);
      expect(lastCall?.[0]).toMatchObject({ priceMin: '100', priceMax: '1500' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('validates minimum price must be >= 0', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} />);

    const minInput = screen.getByLabelText('Min price');
    
    fireEvent.change(minInput, { target: { value: '-10' } });
    
    expect(screen.getByText('Minimum price must be 0 or greater')).toBeInTheDocument();
    // Check that the input has error border style applied
    expect(minInput.style.border).toContain('#d32f2f');
  });

  it('validates maximum price must be >= minimum price', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} />);

    const minInput = screen.getByLabelText('Min price');
    const maxInput = screen.getByLabelText('Max price');
    
    fireEvent.change(minInput, { target: { value: '100' } });
    fireEvent.change(maxInput, { target: { value: '50' } });
    
    expect(screen.getByText('Maximum price must be greater than or equal to minimum price')).toBeInTheDocument();
    // Check that the input has error border style applied
    expect(maxInput.style.border).toContain('#d32f2f');
  });

  it('allows empty price fields', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} />);

    const minInput = screen.getByLabelText('Min price');
    const maxInput = screen.getByLabelText('Max price');
    
    fireEvent.change(minInput, { target: { value: '' } });
    fireEvent.change(maxInput, { target: { value: '' } });
    
    expect(screen.queryByText(/must be/i)).not.toBeInTheDocument();
    // Check that borders have the normal color
    expect(minInput.style.border).toContain('#e5e7eb');
    expect(maxInput.style.border).toContain('#e5e7eb');
  });

  it('clears validation errors when values are corrected', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} />);

    const minInput = screen.getByLabelText('Min price');
    
    // Set invalid value
    fireEvent.change(minInput, { target: { value: '-10' } });
    expect(screen.getByText('Minimum price must be 0 or greater')).toBeInTheDocument();
    
    // Fix the value
    fireEvent.change(minInput, { target: { value: '100' } });
    expect(screen.queryByText('Minimum price must be 0 or greater')).not.toBeInTheDocument();
  });

  it('toggles dorm checkbox and available-only toggle', () => {
    const onChange = vi.fn();
    const { container } = render(<Filters initial={{}} onChange={onChange} />);

    // dorm checkbox
    const dormCheckbox = screen.getByLabelText('Othmer Hall');
    fireEvent.click(dormCheckbox);
    expect(onChange).toHaveBeenCalled();

    // available-only toggle is the final checkbox in the DOM (categories + dorms + hidden toggle)
    const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
    const toggle = allCheckboxes[allCheckboxes.length - 1];
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalled();
  });
});
