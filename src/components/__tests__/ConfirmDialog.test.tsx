import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

describe('ConfirmDialog', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when closed', () => {
    it('renders nothing', () => {
      const { container } = render(
        <ConfirmDialog
          isOpen={false}
          title="Test Dialog"
          message="Are you sure?"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('when open', () => {
    it('renders title and message', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Item"
          message="Are you sure you want to delete?"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Delete Item')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete?')).toBeInTheDocument();
    });

    it('renders custom confirm and cancel text', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          confirmText="Yes, delete it"
          cancelText="No, keep it"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Yes, delete it')).toBeInTheDocument();
      expect(screen.getByText('No, keep it')).toBeInTheDocument();
    });

    it('uses default button text when not provided', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button is clicked', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('Confirm'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('calls onCancel when cancel button is clicked', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('renders JSX message content', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message={
            <>
              <p>Line 1</p>
              <p>Line 2</p>
            </>
          }
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
    });
  });

  describe('when processing', () => {
    it('shows processing text and spinner', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          isProcessing={true}
          processingText="Deleting..."
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
      // Check for spinner element with animate-spin class
      const { container } = render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          isProcessing={true}
          processingText="Deleting..."
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('disables both buttons while processing', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          isProcessing={true}
          processingText="Processing..."
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      const confirmButton = screen.getByText('Processing...');

      expect(confirmButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('does not call handlers when buttons are clicked during processing', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          isProcessing={true}
          processingText="Processing..."
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      const confirmButton = screen.getByText('Processing...');

      fireEvent.click(confirmButton);
      fireEvent.click(cancelButton);

      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('uses default processing text when not provided', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          isProcessing={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('variant styles', () => {
    it('applies danger variant styles by default', () => {
      const { container } = render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('bg-red-500');
    });

    it('applies warning variant styles', () => {
      const { container } = render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          variant="warning"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('bg-yellow-500');
    });

    it('applies info variant styles', () => {
      const { container } = render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Message"
          variant="info"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('bg-blue-500');
    });
  });
});
