import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ListingCard from './ListingCard';

describe('ListingCard', () => {
    const mockProps = {
        id: 1,
        title: 'Test Laptop',
        price: '500.00',
        status: 'Active',
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onMarkSold: vi.fn(),
        onViewDetails: vi.fn(),
    };

    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders listing title correctly', () => {
            render(<ListingCard {...mockProps} />);
            expect(screen.getByText('Test Laptop')).toBeInTheDocument();
        });

        it('renders listing price correctly', () => {
            render(<ListingCard {...mockProps} />);
            expect(screen.getByText('500.00')).toBeInTheDocument();
        });

        it('renders listing status correctly', () => {
            render(<ListingCard {...mockProps} />);
            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        it('renders all action buttons', () => {
            render(<ListingCard {...mockProps} />);

            expect(screen.getByRole('button', { name: /mark as sold/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        });

        it('applies correct CSS class to status based on status value', () => {
            const { rerender } = render(<ListingCard {...mockProps} status="Active" />);
            expect(screen.getByText('Active')).toHaveClass('status', 'active');

            rerender(<ListingCard {...mockProps} status="Sold" />);
            expect(screen.getByText('Sold')).toHaveClass('status', 'sold');
        });
    });

    describe('User Interactions', () => {
        it('calls onViewDetails when card is clicked', async () => {
            const user = userEvent.setup();
            render(<ListingCard {...mockProps} />);

            const card = screen.getByText('Test Laptop').closest('.listing-card');
            await user.click(card);

            expect(mockProps.onViewDetails).toHaveBeenCalledTimes(1);
        });

        it('calls onMarkSold when Mark as Sold button is clicked', async () => {
            const user = userEvent.setup();
            render(<ListingCard {...mockProps} />);

            const markSoldButton = screen.getByRole('button', { name: /mark as sold/i });
            await user.click(markSoldButton);

            expect(mockProps.onMarkSold).toHaveBeenCalledTimes(1);
        });

        it('calls onEdit when Edit button is clicked', async () => {
            const user = userEvent.setup();
            render(<ListingCard {...mockProps} />);

            const editButton = screen.getByRole('button', { name: /edit/i });
            await user.click(editButton);

            expect(mockProps.onEdit).toHaveBeenCalledTimes(1);
        });

        it('calls onDelete with correct id when Delete button is clicked', async () => {
            const user = userEvent.setup();
            render(<ListingCard {...mockProps} />);

            const deleteButton = screen.getByRole('button', { name: /delete/i });
            await user.click(deleteButton);

            expect(mockProps.onDelete).toHaveBeenCalledTimes(1);
            expect(mockProps.onDelete).toHaveBeenCalledWith(1);
        });

        it('prevents event propagation when action buttons are clicked', async () => {
            const user = userEvent.setup();
            render(<ListingCard {...mockProps} />);

            // Click each button and verify onViewDetails is NOT called
            const markSoldButton = screen.getByRole('button', { name: /mark as sold/i });
            await user.click(markSoldButton);
            expect(mockProps.onViewDetails).not.toHaveBeenCalled();

            const editButton = screen.getByRole('button', { name: /edit/i });
            await user.click(editButton);
            expect(mockProps.onViewDetails).not.toHaveBeenCalled();

            const deleteButton = screen.getByRole('button', { name: /delete/i });
            await user.click(deleteButton);
            expect(mockProps.onViewDetails).not.toHaveBeenCalled();
        });
    });

    describe('Image Handling', () => {
        it('renders image when imageUrl is provided', () => {
            render(<ListingCard {...mockProps} imageUrl="https://example.com/image.jpg" />);

            const img = screen.getByAltText('Test Laptop');
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
        });

        it('renders placeholder icon when imageUrl is not provided', () => {
            const { container } = render(<ListingCard {...mockProps} imageUrl={null} />);

            // Check that the placeholder icon is rendered (FaBoxOpen)
            const placeholder = container.querySelector('.image-placeholder svg');
            expect(placeholder).toBeInTheDocument();
        });

        it('renders placeholder icon when imageUrl is empty string', () => {
            const { container } = render(<ListingCard {...mockProps} imageUrl="" />);

            const placeholder = container.querySelector('.image-placeholder svg');
            expect(placeholder).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('handles missing or empty title gracefully', () => {
            render(<ListingCard {...mockProps} title="" />);
            // Component should still render without crashing
            expect(screen.getByText('500.00')).toBeInTheDocument();
        });

        it('handles price with different formats', () => {
            const { rerender } = render(<ListingCard {...mockProps} price="1000" />);
            expect(screen.getByText('1000')).toBeInTheDocument();

            rerender(<ListingCard {...mockProps} price="50.99" />);
            expect(screen.getByText('50.99')).toBeInTheDocument();
        });

        it('handles different status values', () => {
            const statuses = ['Active', 'Sold', 'Pending'];

            statuses.forEach(status => {
                const { rerender } = render(<ListingCard {...mockProps} status={status} />);
                expect(screen.getByText(status)).toBeInTheDocument();
                rerender(<></>);
            });
        });
    });
});

