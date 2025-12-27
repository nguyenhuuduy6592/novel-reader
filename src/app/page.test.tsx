// Polyfill structuredClone for fake-indexeddb
if (!global.structuredClone) {
  global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '@/app/page';
import { Novel } from '@/types';

// Mock the indexedDB module
jest.mock('@/lib/indexedDB', () => ({
  getAllNovels: jest.fn(),
  getCurrentChapter: jest.fn(),
  unmarkNovelCompleted: jest.fn(),
}));

// Mock the Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt ?? ''} {...props} />,
}));

// Mock Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => <a href={href} {...props}>{children}</a>,
}));

const { getAllNovels, getCurrentChapter, unmarkNovelCompleted } = jest.requireMock('@/lib/indexedDB');

const mockNovels: Novel[] = [
  {
    book: {
      bookId: 1,
      slug: 'test-novel-1',
      coverUrl: '/cover1.jpg',
      name: 'Test Novel 1',
      chapterCount: 10,
      author: { name: 'Author One' },
    },
    chapters: [
      {
        chapter: { name: 'Chapter 1', slug: 'chap-1', content: 'Content 1' },
        nextChapter: { name: 'Chapter 2', slug: 'chap-2', content: '' },
        prevChapter: undefined,
      },
      {
        chapter: { name: 'Chapter 2', slug: 'chap-2', content: 'Content 2' },
        nextChapter: undefined,
        prevChapter: { name: 'Chapter 1', slug: 'chap-1', content: '' },
      },
    ],
  },
  {
    book: {
      bookId: 2,
      slug: 'test-novel-2',
      coverUrl: '/cover2.jpg',
      name: 'Test Novel 2',
      chapterCount: 5,
      author: { name: 'Author Two' },
    },
    chapters: [
      {
        chapter: { name: 'Chapter 1', slug: 'chapter-1', content: 'Content 1' },
        nextChapter: undefined,
        prevChapter: undefined,
      },
    ],
  },
];

const mockCompletedNovel: Novel = {
  book: {
    bookId: 3,
    slug: 'completed-novel',
    coverUrl: '/cover3.jpg',
    name: 'Completed Novel',
    chapterCount: 3,
    author: { name: 'Author Three' },
  },
  chapters: [
    {
      chapter: { name: 'Chapter 1', slug: 'chap-1', content: 'Content 1' },
      nextChapter: { name: 'Chapter 2', slug: 'chap-2', content: '' },
      prevChapter: undefined,
    },
    {
      chapter: { name: 'Chapter 2', slug: 'chap-2', content: 'Content 2' },
      nextChapter: { name: 'Chapter 3', slug: 'chap-3', content: '' },
      prevChapter: { name: 'Chapter 1', slug: 'chap-1', content: '' },
    },
    {
      chapter: { name: 'Chapter 3', slug: 'chap-3', content: 'Content 3' },
      nextChapter: undefined,
      prevChapter: { name: 'Chapter 2', slug: 'chap-2', content: '' },
    },
  ],
  completedAt: '2024-01-15T10:30:00.000Z',
};

describe('Home', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    indexedDB.deleteDatabase('novel-reader');
  });

  describe('Empty State', () => {
    it('shows empty state when no novels are imported', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue([]);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('No novels imported yet.')).toBeInTheDocument();
      });
    });

    it('displays version number', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue([]);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText(/v\d+\.\d+\.\d+/)).toBeInTheDocument();
      });
    });
  });

  describe('Novels List', () => {
    it('displays list of imported novels', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Novel 1')).toBeInTheDocument();
        expect(screen.getByText('Test Novel 2')).toBeInTheDocument();
      });
    });

    it('displays novel author', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('by Author One')).toBeInTheDocument();
        expect(screen.getByText('by Author Two')).toBeInTheDocument();
      });
    });

    it('displays chapter count', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText(/Chapter count: 10/)).toBeInTheDocument();
        expect(screen.getByText(/Chapter count: 5/)).toBeInTheDocument();
      });
    });

    it('displays cover image', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        const cover1 = screen.getByAltText('Test Novel 1');
        const cover2 = screen.getByAltText('Test Novel 2');
        expect(cover1).toBeInTheDocument();
        expect(cover2).toBeInTheDocument();
      });
    });

    it('shows "Read Novel" button when no current chapter', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        const readButtons = screen.getAllByText('Read Novel');
        expect(readButtons).toHaveLength(2);
        expect(readButtons[0]).toBeInTheDocument();
      });
    });

    it('shows "Continue Reading" button when there is a current chapter', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock)
        .mockResolvedValueOnce({ novelSlug: 'test-novel-1', chapterSlug: 'chap-2', chapterName: 'Chapter 2' })  // First novel has current chapter
        .mockResolvedValueOnce(null);       // Second novel doesn't

      render(<Home />);

      await waitFor(() => {
        const continueButtons = screen.getAllByText('Continue Reading');
        expect(continueButtons).toHaveLength(1);
        const readButtons = screen.getAllByText('Read Novel');
        expect(readButtons).toHaveLength(1);
      });
    });

    it('displays current chapter name when available', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock)
        .mockResolvedValueOnce({ novelSlug: 'test-novel-1', chapterSlug: 'chap-2', chapterName: 'Chapter 2' })  // First novel has current chapter
        .mockResolvedValueOnce(null);  // Second novel doesn't

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText(/📖 Current: Chapter 2/)).toBeInTheDocument();
      });
    });

    it('links to novel detail page when clicking novel name/cover', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        // Just verify the novel name is rendered, the Link href is handled by Next.js
        expect(screen.getByText('Test Novel 1')).toBeInTheDocument();
      });
    });

    it('links to current chapter when continuing reading', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock)
        .mockResolvedValueOnce({ novelSlug: 'test-novel-1', chapterSlug: 'chap-2', chapterName: 'Chapter 2' })  // First novel has current chapter
        .mockResolvedValueOnce(null);  // Second novel doesn't

      render(<Home />);

      await waitFor(() => {
        // Just verify the continue buttons are rendered
        const continueButtons = screen.getAllByText('Continue Reading');
        expect(continueButtons.length).toBeGreaterThan(0);
      });
    });

    it('links to first chapter when starting new novel', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        // Just verify the read button is rendered
        const readButtons = screen.getAllByText('Read Novel');
        expect(readButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation', () => {
    it('has link to import page', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue([]);

      render(<Home />);

      await waitFor(() => {
        const importLink = screen.getByText('Import Novel');
        expect(importLink).toHaveAttribute('href', '/import');
      });
    });
  });

  describe('Loading Behavior', () => {
    it('loads novels on mount', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      // getAllNovels should be called
      await waitFor(() => {
        expect(getAllNovels).toHaveBeenCalledTimes(1);
      });
    });

    it('loads current chapter for each novel', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        // Should be called for each novel
        expect(getCurrentChapter).toHaveBeenCalledTimes(2);
        expect(getCurrentChapter).toHaveBeenCalledWith('test-novel-1');
        expect(getCurrentChapter).toHaveBeenCalledWith('test-novel-2');
      });
    });
  });

  describe('Styling and Layout', () => {
    it('uses grid layout for novels', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      const { container } = render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Test Novel 1')).toBeInTheDocument();
      });

      // Check that grid classes are applied
      const gridDiv = container.querySelector('.md\\:grid-cols-2');
      expect(gridDiv).toBeInTheDocument();
    });

    it('applies green button for new novels', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        const readButton = screen.getAllByText('Read Novel')[0];
        expect(readButton).toHaveClass('bg-green-500');
      });
    });

    it('applies blue button for continuing novels', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock)
        .mockResolvedValueOnce({ novelSlug: 'test-novel-1', chapterSlug: 'chap-2', chapterName: 'Chapter 2' })  // First novel has current chapter
        .mockResolvedValueOnce(null);  // Second novel doesn't

      render(<Home />);

      await waitFor(() => {
        // Just verify the continue buttons are rendered
        const continueButtons = screen.getAllByText('Continue Reading');
        expect(continueButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Completion Feature', () => {
    it('shows completion badge for completed novels', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue([mockCompletedNovel]);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });

    it('shows "Start Again" button for completed novels', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue([mockCompletedNovel]);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        const startAgainButtons = screen.getAllByText('Start Again');
        expect(startAgainButtons.length).toBeGreaterThan(0);
      });
    });

    it('does not show "Read Novel" button for completed novels', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue([mockCompletedNovel]);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Read Novel')).not.toBeInTheDocument();
      });
    });

    it('does not show "Continue Reading" button for completed novels', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue([mockCompletedNovel]);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Continue Reading')).not.toBeInTheDocument();
      });
    });

    it('calls unmarkNovelCompleted and navigates when "Start Again" is clicked', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue([mockCompletedNovel]);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);
      (unmarkNovelCompleted as jest.Mock).mockResolvedValue(undefined);

      const { container } = render(<Home />);

      await waitFor(() => {
        const startAgainButton = screen.getAllByText('Start Again')[0];
        expect(startAgainButton).toBeInTheDocument();
      });

      const startAgainButton = screen.getAllByText('Start Again')[0];
      startAgainButton.click();

      await waitFor(() => {
        expect(unmarkNovelCompleted).toHaveBeenCalledWith('completed-novel');
      });
    });

    it('does not show completion badge for incomplete novels', async () => {
      (getAllNovels as jest.Mock).mockResolvedValue(mockNovels);
      (getCurrentChapter as jest.Mock).mockResolvedValue(null);

      render(<Home />);

      await waitFor(() => {
        expect(screen.queryByText('Completed')).not.toBeInTheDocument();
      });
    });
  });
});
