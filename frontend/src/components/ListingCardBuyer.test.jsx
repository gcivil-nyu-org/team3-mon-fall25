import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ListingCardBuyer from './ListingCardBuyer';

describe('ListingCardBuyer', () => {
  it('renders title, price and fires onClick', () => {
    const onClick = vi.fn();
    render(<ListingCardBuyer id={1} title="Test Item" price={12.5} onClick={onClick} />, { wrapper: MemoryRouter });

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
      <ListingCardBuyer id={2} title="Desk" price={50} status="sold" imageUrl={imgUrl} onClick={onClick} />,
      { wrapper: MemoryRouter }
    );
    // There are two "Sold" instances (overlay + badge). Assert at least one exists
    const soldNodes = screen.getAllByText(/sold/i);
    expect(soldNodes.length).toBeGreaterThanOrEqual(1);
    const img = screen.getByAltText('Desk');
    expect(img).toBeInTheDocument();
  });

  it('falls back to placeholder when image errors', () => {
    const onClick = vi.fn();
    const imgUrl = 'http://example.com/missing.png';
    const { container } = render(
      <ListingCardBuyer id={3} title="Lamp" price={20} status="active" imageUrl={imgUrl} onClick={onClick} />,
      { wrapper: MemoryRouter }
    );

    const img = screen.getByAltText('Lamp');
    // simulate image load error
    fireEvent.error(img);

    // image should be hidden by inline style change in onError handler
    expect(img.style.display).toBe('none');

    // placeholder should be visible
    const placeholder = container.querySelector('.buyer-card__placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder.style.display).not.toBe('none');
  });

  // Tests for seller/date/views
  it('renders seller, posted date (absolute or relative), and views when provided', () => {
    render(
      <ListingCardBuyer
        id={4}
        title="Chair"
        price={30}
        status="active"
        imageUrl=""
        location="Clark Hall"
        sellerUsername="alice"
        createdAt="2020-01-01T00:00:00Z"   // > 30 days ago
        viewCount={123}
      />,
      { wrapper: MemoryRouter }
    );

    // Seller
    expect(screen.getByText(/Listed by/i)).toBeInTheDocument();
    expect(screen.getByText(/@alice/)).toBeInTheDocument();

    // Posted：To avoid causing flakiness by timezones, onlt check "Posted"
    expect(screen.getByText(/Posted/i)).toBeInTheDocument();

    // Views
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('clicking seller triggers onSellerClick only (not card onClick)', () => {
    const onSellerClick = vi.fn();
    const onClick = vi.fn();

    render(
      <ListingCardBuyer
        id={5}
        title="Sofa"
        price={200}
        status="active"
        imageUrl=""
        sellerUsername="bob"
        onSellerClick={onSellerClick}
        onClick={onClick}
      />,
      { wrapper: MemoryRouter }
    );

    const sellerNode = screen.getByText(/Listed by @bob/i);
    fireEvent.click(sellerNode);

    expect(onSellerClick).toHaveBeenCalledTimes(1);
    expect(onSellerClick).toHaveBeenCalledWith('bob');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('supports keyboard activation on seller link (Enter)', () => {
  const onSellerClick = vi.fn();

  render(
    <ListingCardBuyer
      id={6}
      title="Table"
      price={80}
      status="active"
      imageUrl=""
      sellerUsername="kevin"
      onSellerClick={onSellerClick}
    />,
    { wrapper: MemoryRouter }
  );

  // Target node: .buyer-card__seller（role="link"）
  const sellerRoleLink = screen.getByRole('link', { name: /@kevin/i });
  fireEvent.keyDown(sellerRoleLink, { key: 'Enter', code: 'Enter', charCode: 13 });

  expect(onSellerClick).toHaveBeenCalledTimes(1);
  expect(onSellerClick).toHaveBeenCalledWith('kevin');
});

});
