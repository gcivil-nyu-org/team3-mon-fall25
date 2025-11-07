import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SortSelect from './SortSelect';

describe('SortSelect', () => {
  it('renders options and calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(<SortSelect value="newest" onChange={onChange} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'price_desc' } });
    expect(onChange).toHaveBeenCalledWith('price_desc');
  });
});
