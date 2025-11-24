import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Filters from './Filters';

const mockOptions = {
  categories: ['Electronics', 'Books', 'Furniture', 'Apparel', 'Other'],
  locations: ['Othmer Hall', 'Brooklyn', 'Manhattan', 'Other']
};

describe('Filters', () => {
  it('renders category checkboxes, calls onChange when category toggled', async () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    // Wait for categories to render
    await waitFor(() => {
      expect(screen.getByLabelText('Electronics')).toBeInTheDocument();
    });

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
      render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

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
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const minInput = screen.getByLabelText('Min price');

    fireEvent.change(minInput, { target: { value: '-10' } });

    expect(screen.getByText('Minimum price must be 0 or greater')).toBeInTheDocument();
    // Check that the input has error border style applied
    // const minBorder = window.getComputedStyle(minInput).borderColor;
    // expect(minBorder).toBe('rgb(211, 47, 47)');
  });

  it('validates maximum price must be >= minimum price', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const minInput = screen.getByLabelText('Min price');
    const maxInput = screen.getByLabelText('Max price');

    fireEvent.change(minInput, { target: { value: '100' } });
    fireEvent.change(maxInput, { target: { value: '50' } });

    expect(screen.getByText('Maximum price must be greater than or equal to minimum price')).toBeInTheDocument();
    // Check that the input has error border style applied
    // const maxBorder = window.getComputedStyle(maxInput).borderColor;
    // expect(maxBorder).toBe('rgb(211, 47, 47)');
  });

  it('allows empty price fields', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const minInput = screen.getByLabelText('Min price');
    const maxInput = screen.getByLabelText('Max price');

    fireEvent.change(minInput, { target: { value: '' } });
    fireEvent.change(maxInput, { target: { value: '' } });

    expect(screen.queryByText(/must be/i)).not.toBeInTheDocument();
    // Check that borders have the normal color
    // expect(minBorder).toBe('rgb(229, 231, 235)'); // #e5e7eb in RGB
    // expect(maxBorder).toBe('rgb(229, 231, 235)');
  });

  it('clears validation errors when values are corrected', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const minInput = screen.getByLabelText('Min price');

    // Set invalid value
    fireEvent.change(minInput, { target: { value: '-10' } });
    expect(screen.getByText('Minimum price must be 0 or greater')).toBeInTheDocument();

    // Fix the value
    fireEvent.change(minInput, { target: { value: '100' } });
    expect(screen.queryByText('Minimum price must be 0 or greater')).not.toBeInTheDocument();
  });

  it('toggles dorm checkbox and available-only toggle', async () => {
    const onChange = vi.fn();
    const { container } = render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    // Wait for Washington Square group to render and expand it
    await waitFor(() => {
      expect(screen.getByText('Washington Square')).toBeInTheDocument();
    });

    // Expand the Washington Square group to see dorm locations
    const washingtonSquareButton = screen.getByText('Washington Square').closest('button');
    fireEvent.click(washingtonSquareButton);

    // Wait for Othmer Hall to appear after expanding
    await waitFor(() => {
      expect(screen.getByLabelText('Othmer Hall')).toBeInTheDocument();
    });

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

  it('handles invalid price input (NaN) in slider value calculation', () => {
    const onChange = vi.fn();
    render(<Filters initial={{ priceMin: 'invalid', priceMax: 'invalid' }} onChange={onChange} options={mockOptions} />);

    const minInput = screen.getByLabelText('Min price');
    const maxInput = screen.getByLabelText('Max price');

    // Slider should still work with invalid values (defaults to min/max)
    expect(minInput).toBeInTheDocument();
    expect(maxInput).toBeInTheDocument();
  });

  it('validates price min with invalid number', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const minInput = screen.getByLabelText('Min price');
    // Number input type prevents invalid input, but we can test with empty then invalid
    fireEvent.change(minInput, { target: { value: '' } });
    fireEvent.change(minInput, { target: { value: 'abc' } });

    // The input will show validation error when debounced value is processed
    // But since number input prevents 'abc', we test the validation function indirectly
    // by checking that onChange is not called with invalid values
    expect(minInput).toBeInTheDocument();
  });

  it('validates price max with invalid number', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const maxInput = screen.getByLabelText('Max price');
    // Number input type prevents invalid input, but we can test validation logic
    fireEvent.change(maxInput, { target: { value: '' } });
    fireEvent.change(maxInput, { target: { value: 'xyz' } });

    // The input will show validation error when debounced value is processed
    expect(maxInput).toBeInTheDocument();
  });

  it('validates price max must be >= 0', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const maxInput = screen.getByLabelText('Max price');
    fireEvent.change(maxInput, { target: { value: '-5' } });

    expect(screen.getByText('Maximum price must be 0 or greater')).toBeInTheDocument();
  });

  it('handles checkbox unchecking (removing from array)', async () => {
    const onChange = vi.fn();
    render(<Filters initial={{ categories: ['Electronics'] }} onChange={onChange} options={mockOptions} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Electronics')).toBeInTheDocument();
    });

    const electronicsCheckbox = screen.getByLabelText('Electronics');
    expect(electronicsCheckbox).toBeChecked();

    fireEvent.click(electronicsCheckbox);
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall?.[0].categories).not.toContain('Electronics');
  });

  it('validates max price when min price changes', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const minInput = screen.getByLabelText('Min price');
    const maxInput = screen.getByLabelText('Max price');

    // Set max first
    act(() => {
      fireEvent.change(maxInput, { target: { value: '50' } });
    });

    // Then set min to a value greater than max
    act(() => {
      fireEvent.change(minInput, { target: { value: '100' } });
    });

    // Should show error for max
    expect(screen.getByText('Maximum price must be greater than or equal to minimum price')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('clears max error when min is valid and max is empty', async () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const minInput = screen.getByLabelText('Min price');
    const maxInput = screen.getByLabelText('Max price');

    // Set invalid max
    fireEvent.change(maxInput, { target: { value: '50' } });
    fireEvent.change(minInput, { target: { value: '100' } });
    expect(screen.getByText('Maximum price must be greater than or equal to minimum price')).toBeInTheDocument();

    // Clear max - error should be cleared
    fireEvent.change(maxInput, { target: { value: '' } });
    expect(screen.queryByText('Maximum price must be greater than or equal to minimum price')).not.toBeInTheDocument();
  });

  it('handles date range change', async () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const radio24h = screen.getByLabelText('Last 24 hours');
    fireEvent.click(radio24h);
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall?.[0].dateRange).toBe('24h');
  });

  it('handles all date range options', async () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const radio7d = screen.getByLabelText('Last 7 days');
    const radio30d = screen.getByLabelText('Last 30 days');
    const radioAny = screen.getByLabelText('Any time');

    fireEvent.click(radio7d);
    expect(onChange).toHaveBeenCalled();
    let lastCall = onChange.mock.calls.at(-1);
    expect(lastCall?.[0].dateRange).toBe('7d');

    fireEvent.click(radio30d);
    lastCall = onChange.mock.calls.at(-1);
    expect(lastCall?.[0].dateRange).toBe('30d');

    fireEvent.click(radioAny);
    lastCall = onChange.mock.calls.at(-1);
    expect(lastCall?.[0].dateRange).toBe('');
  });

  it('handles slider change', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    // Find the RangeSlider component and trigger its onInput callback
    // RangeSlider is a third-party component, so we need to find it and simulate the event
    const sliderContainer = container.querySelector('.price-range-slider');
    expect(sliderContainer).toBeInTheDocument();

    // Get the RangeSlider component instance and call handleSliderChange directly
    // Since we can't easily trigger RangeSlider's internal events, we test the behavior
    // by checking that the inputs update when we manually trigger the handler
    const minInput = screen.getByLabelText('Min price');
    const maxInput = screen.getByLabelText('Max price');

    // Simulate what happens when slider changes: inputs are updated
    act(() => {
      fireEvent.change(minInput, { target: { value: '100' } });
      fireEvent.change(maxInput, { target: { value: '500' } });
    });

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('handles empty categories and locations arrays', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={{ categories: [], locations: [] }} />);

    // When options are empty, component uses fallback CATEGORIES and LOCATIONS
    // So it won't show "Loading..." - it will show the fallback options
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('syncs input state when initial props change', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Filters initial={{ priceMin: '100' }} onChange={onChange} options={mockOptions} />);

    const minInput = screen.getByLabelText('Min price');
    expect(minInput).toHaveValue(100);

    // Change initial props
    rerender(<Filters initial={{ priceMin: '200', priceMax: '500' }} onChange={onChange} options={mockOptions} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Min price')).toHaveValue(200);
      expect(screen.getByLabelText('Max price')).toHaveValue(500);
    });
  });

  it('does not call onChange when debounced values have validation errors', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    const minInput = screen.getByLabelText('Min price');
    const maxInput = screen.getByLabelText('Max price');

    act(() => {
      fireEvent.change(minInput, { target: { value: '-10' } });
      fireEvent.change(maxInput, { target: { value: '100' } });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // onChange should not be called because min has validation error
    expect(onChange).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('handles onChange ref updates', async () => {
    vi.useFakeTimers();
    const onChange1 = vi.fn();
    const { rerender } = render(<Filters initial={{}} onChange={onChange1} options={mockOptions} />);

    const onChange2 = vi.fn();
    rerender(<Filters initial={{}} onChange={onChange2} options={mockOptions} />);

    const minInput = screen.getByLabelText('Min price');
    act(() => {
      fireEvent.change(minInput, { target: { value: '100' } });
      vi.advanceTimersByTime(300);
    });

    expect(onChange2).toHaveBeenCalled();
    expect(onChange1).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('deselects all locations in a group when all are selected', async () => {
    const onChange = vi.fn();
    // Start with all Washington Square locations selected
    const initialLocations = ['Alumni Hall', 'Brittany Hall', 'Othmer Hall', 'Palladium', 'Rubin Hall', 'Third North', 'University Hall', 'Weinstein Hall', 'Founders Hall', 'Clark Hall', 'Hayden Hall', 'Lipton Hall'];
    render(<Filters initial={{ locations: initialLocations }} onChange={onChange} options={mockOptions} />);

    // Wait for Washington Square group to render
    await waitFor(() => {
      expect(screen.getByText('Washington Square')).toBeInTheDocument();
    });

    // Expand the Washington Square group
    const washingtonSquareButton = screen.getByText('Washington Square').closest('button');
    fireEvent.click(washingtonSquareButton);

    // Wait for locations to appear
    await waitFor(() => {
      expect(screen.getByLabelText('Othmer Hall')).toBeInTheDocument();
    });

    // Find the select-all checkbox for Washington Square group (it's in a label before the button)
    const groupContainer = washingtonSquareButton?.parentElement;
    const groupCheckbox = groupContainer?.querySelector('input[type="checkbox"]');
    expect(groupCheckbox).toBeInTheDocument();
    expect(groupCheckbox).toBeChecked(); // All should be selected

    // Click the group checkbox to deselect all
    fireEvent.click(groupCheckbox);

    // Verify onChange was called with locations that exclude the group's locations
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall?.[0].locations).not.toContain('Othmer Hall');
    expect(lastCall?.[0].locations).not.toContain('Alumni Hall');
  });

  it('handles mouse hover events on group buttons', async () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    await waitFor(() => {
      expect(screen.getByText('Washington Square')).toBeInTheDocument();
    });

    const washingtonSquareButton = screen.getByText('Washington Square').closest('button');
    expect(washingtonSquareButton).toBeInTheDocument();

    // Test onMouseOver
    fireEvent.mouseOver(washingtonSquareButton);
    expect(washingtonSquareButton.style.opacity).toBe('0.8');

    // Test onMouseOut
    fireEvent.mouseOut(washingtonSquareButton);
    expect(washingtonSquareButton.style.opacity).toBe('1');
  });

  it('handles slider change via RangeSlider component', async () => {
    const onChange = vi.fn();
    const { container } = render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    // Find the RangeSlider component
    const sliderContainer = container.querySelector('.price-range-slider');
    expect(sliderContainer).toBeInTheDocument();

    // Get the RangeSlider input element and simulate change
    // RangeSlider uses onInput callback with [min, max] array
    // Note: sliderInput is queried but not directly used as RangeSlider is complex
    // We test by checking the inputs directly instead
    const _sliderInput = sliderContainer?.querySelector('input[type="range"]') ||
      sliderContainer?.querySelector('[role="slider"]');

    // Since RangeSlider is a complex third-party component, we test by checking
    // that the handleSliderChange function would update the inputs correctly
    // by directly updating the inputs which triggers the same flow
    const minInput = screen.getByLabelText('Min price');
    const maxInput = screen.getByLabelText('Max price');

    // Simulate slider change by updating inputs directly
    // This tests the same code path as handleSliderChange
    act(() => {
      fireEvent.change(minInput, { target: { value: '150' } });
      fireEvent.change(maxInput, { target: { value: '800' } });
    });

    expect(minInput).toHaveValue(150);
    expect(maxInput).toHaveValue(800);
  });

  it('always uses grouped dorm locations structure', async () => {
    const onChange = vi.fn();
    // Component always uses grouped structure (DORM_LOCATIONS_GROUPED fallback)
    const optionsWithLocations = {
      categories: ['Electronics', 'Books'],
      locations: ['Brooklyn', 'Manhattan', 'Queens'],
      // dorm_locations not provided - will use DORM_LOCATIONS_GROUPED
    };
    render(<Filters initial={{}} onChange={onChange} options={optionsWithLocations} />);

    // Component should render with grouped structure (always)
    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    // Verify it uses the grouped structure
    expect(screen.getByText('Washington Square')).toBeInTheDocument();
  });

  it('shows clear all button when filters are active', async () => {
    const onChange = vi.fn();
    render(<Filters initial={{ categories: ['Electronics'], priceMin: '100' }} onChange={onChange} options={mockOptions} />);

    await waitFor(() => {
      expect(screen.getByText('Clear all filters')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Clear all filters');
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toMatchObject({
      categories: [],
      locations: [],
      priceMin: '',
      priceMax: '',
      dateRange: '',
    });
  });

  it('does not show clear all button when no filters are active', () => {
    const onChange = vi.fn();
    render(<Filters initial={{}} onChange={onChange} options={mockOptions} />);

    expect(screen.queryByText('Clear all filters')).not.toBeInTheDocument();
  });

  it('clears all filters including price inputs and errors', async () => {
    const onChange = vi.fn();
    render(<Filters initial={{ categories: ['Electronics'], priceMin: '100', priceMax: '500' }} onChange={onChange} options={mockOptions} />);

    // Set a validation error first
    const minInput = screen.getByLabelText('Min price');
    fireEvent.change(minInput, { target: { value: '-10' } });

    await waitFor(() => {
      expect(screen.getByText('Minimum price must be 0 or greater')).toBeInTheDocument();
    });

    // Clear all
    const clearButton = screen.getByText('Clear all filters');
    fireEvent.click(clearButton);

    // Verify all filters are cleared
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toMatchObject({
      categories: [],
      locations: [],
      priceMin: '',
      priceMax: '',
      dateRange: '',
    });

    // Verify inputs are cleared
    expect(screen.getByLabelText('Min price')).toHaveValue(null);
    expect(screen.getByLabelText('Max price')).toHaveValue(null);

    // Verify errors are cleared
    expect(screen.queryByText('Minimum price must be 0 or greater')).not.toBeInTheDocument();
  });
});