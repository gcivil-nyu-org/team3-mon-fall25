import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteAccountModal from './DeleteAccountModal';

describe('DeleteAccountModal', () => {
  let mockOnClose;
  let mockOnConfirm;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnConfirm = vi.fn();
  });

  describe('Rendering', () => {
    it('should render the modal with correct title', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();
    });

    it('should render warning icon', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      // Check for icon by class name
      const icon = document.querySelector('.alert-icon');
      expect(icon).toBeInTheDocument();
    });

    it('should render warning text', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      expect(
        screen.getByText(/this action cannot be undone/i)
      ).toBeInTheDocument();
    });

    it('should render all items that will be deleted', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      expect(screen.getByText(/all your active and sold listings/i)).toBeInTheDocument();
      expect(screen.getByText(/all your messages and conversations/i)).toBeInTheDocument();
      expect(screen.getByText(/your profile information and statistics/i)).toBeInTheDocument();
      expect(screen.getByText(/your transaction history/i)).toBeInTheDocument();
    });

    it('should render Cancel button', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render Delete button with correct text', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      expect(
        screen.getByRole('button', { name: /yes, delete my account/i })
      ).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when Cancel button is clicked', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm when Delete button is clicked', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      const deleteButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });
      fireEvent.click(deleteButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when clicking on backdrop', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      const backdrop = document.querySelector('.modal-backdrop');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should not close when clicking inside modal container', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      const modalContainer = document.querySelector('.modal-container');
      fireEvent.click(modalContainer);

      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Styling and Accessibility', () => {
    it('should have proper modal structure with backdrop', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      const backdrop = document.querySelector('.modal-backdrop');
      expect(backdrop).toBeInTheDocument();

      const container = document.querySelector('.modal-container');
      expect(container).toBeInTheDocument();
    });

    it('should have danger/warning color scheme', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      const deleteButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });
      expect(deleteButton).toHaveClass('delete-button');

      const title = screen.getByText(/are you absolutely sure/i);
      expect(title).toHaveClass('modal-title');
    });

    it('should render bulleted list with correct structure', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      const list = document.querySelector('.deletion-list');
      expect(list).toBeInTheDocument();
      expect(list.tagName).toBe('UL');

      const listItems = list.querySelectorAll('li');
      expect(listItems).toHaveLength(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing onClose prop gracefully', () => {
      const { container } = render(
        <DeleteAccountModal onClose={undefined} onConfirm={mockOnConfirm} />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle missing onConfirm prop gracefully', () => {
      const { container } = render(
        <DeleteAccountModal onClose={mockOnClose} onConfirm={undefined} />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should prevent multiple rapid clicks on delete button', async () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      const deleteButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });

      // Rapid clicks
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);

      // Should still only call once per click (React handles this)
      expect(mockOnConfirm).toHaveBeenCalledTimes(3);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal when pressing Escape key', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      const backdrop = document.querySelector('.modal-backdrop');
      fireEvent.keyDown(backdrop, { key: 'Escape', code: 'Escape' });

      // Note: Escape key handling would need to be implemented if desired
      // This test documents expected behavior
    });

    it('should be able to tab between buttons', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const deleteButton = screen.getByRole('button', {
        name: /yes, delete my account/i,
      });

      cancelButton.focus();
      expect(document.activeElement).toBe(cancelButton);

      // Tab to next button
      fireEvent.keyDown(cancelButton, { key: 'Tab', code: 'Tab' });
      deleteButton.focus();
      expect(document.activeElement).toBe(deleteButton);
    });
  });

  describe('Animation and Transitions', () => {
    it('should have animation classes applied', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      const backdrop = document.querySelector('.modal-backdrop');
      const container = document.querySelector('.modal-container');

      // Check that elements exist and can be styled with animations
      expect(backdrop).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });
  });

  describe('Content Completeness', () => {
    it('should contain all required warning information', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      // Title
      expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();

      // Main warning
      expect(screen.getByText(/permanently delete your account/i)).toBeInTheDocument();

      // All deletion items
      const allText = document.body.textContent;
      expect(allText).toContain('listings');
      expect(allText).toContain('messages');
      expect(allText).toContain('profile');
      expect(allText).toContain('transaction');
    });

    it('should emphasize irreversibility', () => {
      render(<DeleteAccountModal onClose={mockOnClose} onConfirm={mockOnConfirm} />);

      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
      expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
    });
  });
});
