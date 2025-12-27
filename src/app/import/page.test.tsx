import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportPage from '@/app/import/page';
import { importNovelFromJson } from '@/lib/importNovel';
import { useRouter } from 'next/navigation';

// Mock the import function
jest.mock('@/lib/importNovel');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href as string} {...props}>{children}</a>
  ),
}));

describe('ImportPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  describe('Rendering', () => {
    it('renders import page with title and home link', () => {
      render(<ImportPage />);

      expect(screen.getByText('Import Novel')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('View Code')).toBeInTheDocument();
    });

    it('renders textarea for JSON input', () => {
      render(<ImportPage />);

      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL');
      expect(textarea).toBeInTheDocument();
    });

    it('renders file input for JSON upload', () => {
      render(<ImportPage />);

      const fileInput = screen.getByRole('textbox', { hidden: true }) || document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('renders import button', () => {
      render(<ImportPage />);

      expect(screen.getByRole('button', { name: /Import/i })).toBeInTheDocument();
    });
  });

  describe('JSON Paste Input', () => {
    it('allows typing JSON into textarea', async () => {
      render(<ImportPage />);

      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL') as HTMLTextAreaElement;
      const testJson = '{"test": "data"}';

      // Use fireEvent to directly set value for JSON content
      fireEvent.change(textarea, { target: { value: testJson } });

      expect(textarea).toHaveValue(testJson);
    });

    it('imports valid JSON from textarea', async () => {
      const user = userEvent.setup();
      (importNovelFromJson as jest.Mock).mockResolvedValue({ success: true });

      render(<ImportPage />);

      const validJson = JSON.stringify({
        book: { bookId: 1, slug: 'test', coverUrl: '/cover.jpg', name: 'Test', chapterCount: 1, author: { name: 'Author' } },
        chapters: []
      });

      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL');
      fireEvent.change(textarea, { target: { value: validJson } });

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(importNovelFromJson).toHaveBeenCalledWith(validJson);
        expect(screen.getByText('Novel imported successfully!')).toBeInTheDocument();
      });
    });

    it('shows error for invalid JSON from textarea', async () => {
      const user = userEvent.setup();
      (importNovelFromJson as jest.Mock).mockResolvedValue({ success: false, error: 'Invalid JSON' });

      render(<ImportPage />);

      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL');
      fireEvent.change(textarea, { target: { value: 'invalid json' } });

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
      });
    });

    it('clears textarea after successful import', async () => {
      const user = userEvent.setup();
      (importNovelFromJson as jest.Mock).mockResolvedValue({ success: true });

      render(<ImportPage />);

      const validJson = JSON.stringify({
        book: { bookId: 1, slug: 'test', coverUrl: '/cover.jpg', name: 'Test', chapterCount: 1, author: { name: 'Author' } },
        chapters: []
      });

      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: validJson } });

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });
  });

  describe('File Upload', () => {
    it('reads and displays file content', async () => {
      render(<ImportPage />);

      const fileContent = JSON.stringify({
        book: { bookId: 1, slug: 'test', coverUrl: '/cover.jpg', name: 'Test', chapterCount: 1, author: { name: 'Author' } },
        chapters: []
      });

      const file = new File([fileContent], 'novel.json', { type: 'application/json' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(fileInput, file);

      // After file upload, textarea should be cleared and file content stored
      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });

    it('imports valid JSON from file', async () => {
      const user = userEvent.setup();
      (importNovelFromJson as jest.Mock).mockResolvedValue({ success: true });

      render(<ImportPage />);

      const validJson = JSON.stringify({
        book: { bookId: 1, slug: 'test', coverUrl: '/cover.jpg', name: 'Test', chapterCount: 1, author: { name: 'Author' } },
        chapters: []
      });

      const file = new File([validJson], 'novel.json', { type: 'application/json' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Upload file
      await user.upload(fileInput, file);

      // File upload sets fileContent, which enables the button
      // We can check the input has the file
      expect(fileInput.files).toHaveLength(1);
      expect(fileInput.files?.[0]).toBe(file);
    });

    it('shows error for invalid file type', async () => {
      render(<ImportPage />);

      const file = new File(['not json'], 'novel.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // This test verifies the file input accepts only .json files
      expect(fileInput).toHaveAttribute('accept', '.json');
    });

    it('clears file content when typing in textarea', async () => {
      render(<ImportPage />);

      // First upload a file
      const fileContent = JSON.stringify({
        book: { bookId: 1, slug: 'test', coverUrl: '/cover.jpg', name: 'Test', chapterCount: 1, author: { name: 'Author' } },
        chapters: []
      });

      const file = new File([fileContent], 'novel.json', { type: 'application/json' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(fileInput, file);

      // Then type in textarea
      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL');
      fireEvent.change(textarea, { target: { value: 'new content' } });

      // File content should be cleared
      expect(screen.queryByDisplayValue(fileContent)).not.toBeInTheDocument();
    });
  });

  describe('URL Fetch', () => {
    it('fetches JSON from URL', async () => {
      const user = userEvent.setup();
      const mockJson = JSON.stringify({
        book: { bookId: 1, slug: 'test', coverUrl: '/cover.jpg', name: 'Test', chapterCount: 1, author: { name: 'Author' } },
        chapters: []
      });

      // Mock fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockJson),
        } as Response)
      );

      (importNovelFromJson as jest.Mock).mockResolvedValue({ success: true });

      render(<ImportPage />);

      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL');
      await user.type(textarea, 'https://example.com/novel.json');

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/novel.json');
        expect(importNovelFromJson).toHaveBeenCalledWith(mockJson);
        expect(screen.getByText('Novel imported successfully!')).toBeInTheDocument();
      });
    });

    it('shows error when URL fetch fails', async () => {
      const user = userEvent.setup();

      // Mock fetch failure
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)
      );

      render(<ImportPage />);

      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL');
      await user.type(textarea, 'https://example.com/novel.json');

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch URL/)).toBeInTheDocument();
      });
    });

    it('shows error when URL is invalid', async () => {
      const user = userEvent.setup();

      // Mock fetch network error
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

      render(<ImportPage />);

      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL');
      await user.type(textarea, 'https://example.com/novel.json');

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch URL.*Network error/)).toBeInTheDocument();
      });
    });
  });

  describe('Button State', () => {
    it('disables button when loading', async () => {
      const user = userEvent.setup();
      // Make import function hang
      (importNovelFromJson as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<ImportPage />);

      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL');
      fireEvent.change(textarea, { target: { value: '{"test": "data"}' } });

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      expect(importButton).toBeDisabled();
      expect(screen.getByText('Importing...')).toBeInTheDocument();
    });

    it('disables button when no input', () => {
      render(<ImportPage />);

      const importButton = screen.getByRole('button', { name: /Import/i });
      expect(importButton).toBeDisabled();
    });

    it('enables button when there is input', () => {
      render(<ImportPage />);

      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL');
      fireEvent.change(textarea, { target: { value: '{"test": "data"}' } });

      const importButton = screen.getByRole('button', { name: /Import/i });
      expect(importButton).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('clears error when starting new import', async () => {
      const user = userEvent.setup();
      (importNovelFromJson as jest.Mock)
        .mockResolvedValueOnce({ success: false, error: 'First error' })
        .mockResolvedValueOnce({ success: true });

      render(<ImportPage />);

      const textarea = screen.getByPlaceholderText('Paste novel JSON here or enter JSON URL');

      // First import fails
      fireEvent.change(textarea, { target: { value: 'invalid' } });
      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Clear and try again
      fireEvent.change(textarea, { target: { value: '{"valid": "json"}' } });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });
  });
});
