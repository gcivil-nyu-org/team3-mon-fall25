import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ListingCardBuyer from './ListingCardBuyer';

describe('ListingCardBuyer', () => {
  it('renders title, price and fires onClick', () => {
    const onClick = vi.fn();
    render(<ListingCardBuyer id={1} title="Test Item" price={12.5} onClick={onClick} />);

    expect(screen.getByText(/Test Item/i)).toBeInTheDocument();
    expect(screen.getByText(/\$12.50/)).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /open test item/i });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows sold badge when status is sold and displays image when provided', () => {
    const onClick = vi.fn();
    const imgUrl = 'http://example.com/img.png';
    render(
      <ListingCardBuyer id={2} title="Desk" price={50} status="sold" imageUrl={imgUrl} onClick={onClick} />
    );
    // There are two "Sold" instances in the markup (overlay + badge). Assert at least one exists
    const soldNodes = screen.getAllByText(/sold/i);
    expect(soldNodes.length).toBeGreaterThanOrEqual(1);
    const img = screen.getByAltText('Desk');
    expect(img).toBeInTheDocument();
  });

  it('falls back to placeholder when image errors', () => {
    const onClick = vi.fn();
    const imgUrl = 'http://example.com/missing.png';
    const { container } = render(
      <ListingCardBuyer id={3} title="Lamp" price={20} status="active" imageUrl={imgUrl} onClick={onClick} />
    );

    const img = screen.getByAltText('Lamp');
    // simulate image load error
    img.dispatchEvent(new Event('error'));

    // image should be hidden by inline style change in onError handler
    expect(img.style.display).toBe('none');

    // placeholder should be visible
    const placeholder = container.querySelector('.buyer-card__placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder.style.display).not.toBe('none');
  });
});
