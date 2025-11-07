import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('updates price range and triggers onChange', () => {
    const onChange = vi.fn();
    const { getByRole } = render(<Filters initial={{}} onChange={onChange} />);

    const slider = getByRole('slider');
    // change slider value
    fireEvent.change(slider, { target: { value: '1500' } });
    expect(onChange).toHaveBeenCalled();
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
