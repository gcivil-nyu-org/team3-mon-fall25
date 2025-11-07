import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SellerCard from './SellerCard';

const renderWithRouter = (component) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('SellerCard', () => {
  const defaultProps = {
    username: 'abc123',
    displayName: 'John Doe',
    memberSince: '2024-01-15T00:00:00Z',
    activeListingsCount: 5,
    totalSoldCount: 12,
  };

  it('renders seller information correctly', () => {
    renderWithRouter(<SellerCard {...defaultProps} />);

    expect(screen.getByText('Seller Information')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/Member since January 2024/i)).toBeInTheDocument();
  });

  it('displays active listings count', () => {
    renderWithRouter(<SellerCard {...defaultProps} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Active Listings')).toBeInTheDocument();
  });

  it('displays total sold count', () => {
    renderWithRouter(<SellerCard {...defaultProps} />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Items Sold')).toBeInTheDocument();
  });

  it('shows correct avatar initial from display name', () => {
    renderWithRouter(<SellerCard {...defaultProps} />);

    const avatar = document.querySelector('.seller-card__avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar.textContent).toBe('J'); // First letter of John
  });

  it('falls back to username initial when no display name', () => {
    renderWithRouter(
      <SellerCard
        {...defaultProps}
        displayName={null}
      />
    );

    const avatar = document.querySelector('.seller-card__avatar');
    expect(avatar.textContent).toBe('A'); // First letter of abc123
  });

  it('shows question mark when no username or displayName', () => {
    renderWithRouter(
      <SellerCard
        {...defaultProps}
        username={null}
        displayName={null}
      />
    );

    const avatar = document.querySelector('.seller-card__avatar');
    expect(avatar.textContent).toBe('?');
  });

  it('renders View Profile link with correct username', () => {
    renderWithRouter(<SellerCard {...defaultProps} />);

    const link = screen.getByRole('link', { name: /View Profile/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/seller/abc123');
  });

  it('displays fallback values for missing data', () => {
    renderWithRouter(
      <SellerCard
        username="test"
        displayName="Test User"
        memberSince={null}
        activeListingsCount={null}
        totalSoldCount={null}
      />
    );

    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(2); // Two zeros for both counts
    expect(screen.getByText(/Member since Unknown/i)).toBeInTheDocument();
  });

  it('handles zero counts correctly', () => {
    renderWithRouter(
      <SellerCard
        {...defaultProps}
        activeListingsCount={0}
        totalSoldCount={0}
      />
    );

    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(2); // One for active, one for sold
  });

  it('formats member since date correctly', () => {
    renderWithRouter(
      <SellerCard
        {...defaultProps}
        memberSince="2023-06-20T10:30:00Z"
      />
    );

    expect(screen.getByText(/Member since June 2023/i)).toBeInTheDocument();
  });

  it('displays username as fallback when no displayName', () => {
    renderWithRouter(
      <SellerCard
        {...defaultProps}
        displayName={null}
      />
    );

    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('shows Unknown Seller when no username or displayName', () => {
    renderWithRouter(
      <SellerCard
        username={null}
        displayName={null}
        memberSince="2024-01-01T00:00:00Z"
        activeListingsCount={0}
        totalSoldCount={0}
      />
    );

    expect(screen.getByText('Unknown Seller')).toBeInTheDocument();
  });

  it('renders all stat icons', () => {
    const { container } = renderWithRouter(<SellerCard {...defaultProps} />);

    const icons = container.querySelectorAll('.seller-card__icon');
    expect(icons).toHaveLength(2); // Package and CheckCircle icons
  });
});
