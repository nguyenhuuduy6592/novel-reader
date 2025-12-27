import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChapterPage from '@/app/novel/[slug]/chapter/[chapterSlug]/page'
import { getNovel, getChapter, saveCurrentChapter, listChapters, markNovelCompleted, deleteCurrentChapter } from '@/lib/indexedDB'
import { Novel, ChapterInfo } from '@/types'
import * as nextNavigation from 'next/navigation'

jest.mock('@/lib/indexedDB')

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockScrollTo = jest.fn()
const mockPushState = jest.fn()
const mockReplaceState = jest.fn()

global.scrollTo = mockScrollTo
global.window.history.pushState = mockPushState
global.window.history.replaceState = mockReplaceState

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}))

const mockChapters: ChapterInfo[] = [
  {
    chapter: { name: 'Chapter 1', slug: 'chuong-1', content: 'Content 1' },
    prevChapter: undefined,
    nextChapter: { name: 'Chapter 2', slug: 'chuong-2', content: '' },
  },
  {
    chapter: { name: 'Chapter 2', slug: 'chuong-2', content: 'Content 2' },
    prevChapter: { name: 'Chapter 1', slug: 'chuong-1', content: '' },
    nextChapter: { name: 'Chapter 3', slug: 'chuong-3', content: '' },
  },
  {
    chapter: { name: 'Chapter 3', slug: 'chuong-3', content: 'Content 3' },
    prevChapter: { name: 'Chapter 2', slug: 'chuong-2', content: '' },
    nextChapter: undefined,
  },
]

const mockNovel: Novel = {
  book: {
    bookId: 1,
    slug: 'test-novel',
    coverUrl: '/cover.jpg',
    name: 'Test Novel',
    chapterCount: 3,
    author: { name: 'Test Author' },
  },
  chapters: mockChapters,
}

describe('ChapterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getChapter as jest.Mock).mockResolvedValue(mockChapters[1]) // Default to chapter 2
    ;(getNovel as jest.Mock).mockResolvedValue(mockNovel)
    ;(saveCurrentChapter as jest.Mock).mockResolvedValue(undefined)
    ;(listChapters as jest.Mock).mockResolvedValue(mockChapters)
    ;(markNovelCompleted as jest.Mock).mockResolvedValue(undefined)
    ;(deleteCurrentChapter as jest.Mock).mockResolvedValue(undefined)
    mockPush.mockClear()
    mockReplace.mockClear()
    mockScrollTo.mockClear()
    mockPushState.mockClear()
    mockReplaceState.mockClear()
    ;(nextNavigation.useParams as jest.Mock).mockReturnValue({
      slug: 'test-novel',
      chapterSlug: 'chuong-2',
    })
    ;(nextNavigation.useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    })
  })

  it('loads and displays chapter content', async () => {
    render(<ChapterPage />)

    await waitFor(() => {
      expect(screen.getByText('Chapter 2')).toBeInTheDocument()
    })

    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })

  it('does not fetch all chapters on mount', async () => {
    render(<ChapterPage />)

    await waitFor(() => {
      expect(screen.getByText('Chapter 2')).toBeInTheDocument()
    })

    // listChapters should NOT be called on mount
    expect(listChapters).not.toHaveBeenCalled()
  })

  it('shows next chapter button when next chapter exists', async () => {
    render(<ChapterPage />)

    await waitFor(() => {
      expect(screen.getByText('Chapter 2')).toBeInTheDocument()
    })

    expect(screen.getAllByRole('button', { name: /next chapter/i })).toHaveLength(2)
  })

  it('shows previous chapter button when previous chapter exists', async () => {
    render(<ChapterPage />)

    await waitFor(() => {
      expect(screen.getByText('Chapter 2')).toBeInTheDocument()
    })

    expect(screen.getAllByRole('button', { name: /previous chapter/i })).toHaveLength(2)
  })

  it('loads next chapter when clicking next button', async () => {
    const user = userEvent.setup()
    ;(getChapter as jest.Mock)
      .mockResolvedValueOnce(mockChapters[1]) // Initial load
      .mockResolvedValueOnce(mockChapters[2]) // navigateChapter fetches and passes to loadChapter

    render(<ChapterPage />)

    await waitFor(() => {
      expect(screen.getByText('Chapter 2')).toBeInTheDocument()
    })

    const nextButton = screen.getAllByRole('button', { name: /next/i })[1]
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Chapter 3')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('loads previous chapter when clicking previous button', async () => {
    const user = userEvent.setup()
    ;(getChapter as jest.Mock)
      .mockResolvedValueOnce(mockChapters[1]) // Initial load
      .mockResolvedValueOnce(mockChapters[0]) // navigateChapter fetches and passes to loadChapter

    render(<ChapterPage />)

    await waitFor(() => {
      expect(screen.getByText('Chapter 2')).toBeInTheDocument()
    })

    const prevButton = screen.getAllByRole('button', { name: /previous/i })[1]
    await user.click(prevButton)

    await waitFor(() => {
      expect(screen.getByText('Chapter 1')).toBeInTheDocument()
    })

    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('navigates with arrow keys', async () => {
    const user = userEvent.setup()
    ;(getChapter as jest.Mock)
      .mockResolvedValueOnce(mockChapters[1]) // Initial load
      .mockResolvedValueOnce(mockChapters[2]) // navigateChapter fetch

    render(<ChapterPage />)

    await waitFor(() => {
      expect(screen.getByText('Chapter 2')).toBeInTheDocument()
    })

    await user.keyboard('{ArrowRight}')

    await waitFor(() => {
      expect(getChapter).toHaveBeenCalledWith('test-novel', 'chuong-3')
    })
  })

  describe('fallback navigation', () => {
    it('uses chapter number-based navigation when stored next slug is invalid', async () => {
      const user = userEvent.setup()

      // Create a chapter with invalid next slug
      const chapterWithInvalidNext: ChapterInfo = {
        chapter: { name: 'Chapter 2', slug: 'chuong-2', content: 'Content 2' },
        prevChapter: { name: 'Chapter 1', slug: 'chuong-1', content: '' },
        nextChapter: { name: 'Invalid', slug: 'invalid-slug', content: '' },
      }

      ;(getChapter as jest.Mock)
        .mockResolvedValueOnce(chapterWithInvalidNext) // Initial load
        .mockResolvedValueOnce(null) // Invalid slug lookup fails

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Chapter 2')).toBeInTheDocument()
      })

      const nextButton = screen.getAllByRole('button', { name: /next/i })[1]
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Chapter 3')).toBeInTheDocument()
      })

      // Should have tried slug first, then fell back to listChapters
      expect(getChapter).toHaveBeenCalledWith('test-novel', 'invalid-slug')
      expect(listChapters).toHaveBeenCalledWith('test-novel')
    })

    it('uses chapter number-based navigation when stored prev slug is invalid', async () => {
      const user = userEvent.setup()

      // Create a chapter with invalid prev slug
      const chapterWithInvalidPrev: ChapterInfo = {
        chapter: { name: 'Chapter 2', slug: 'chuong-2', content: 'Content 2' },
        prevChapter: { name: 'Invalid', slug: 'invalid-slug', content: '' },
        nextChapter: { name: 'Chapter 3', slug: 'chuong-3', content: '' },
      }

      ;(getChapter as jest.Mock)
        .mockResolvedValueOnce(chapterWithInvalidPrev) // Initial load
        .mockResolvedValueOnce(null) // Invalid slug lookup fails

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Chapter 2')).toBeInTheDocument()
      })

      const prevButton = screen.getAllByRole('button', { name: /previous/i })[1]
      await user.click(prevButton)

      await waitFor(() => {
        expect(screen.getByText('Chapter 1')).toBeInTheDocument()
      })

      expect(getChapter).toHaveBeenCalledWith('test-novel', 'invalid-slug')
      expect(listChapters).toHaveBeenCalledWith('test-novel')
    })

    it('does not show prev button when at first chapter', async () => {
      ;(getChapter as jest.Mock).mockClear().mockResolvedValue(mockChapters[0])

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Chapter 1')).toBeInTheDocument()
      })

      const prevButton = screen.queryByRole('button', { name: /previous chapter/i })
      expect(prevButton).not.toBeInTheDocument()
    })

    it('does not show next button when at last chapter', async () => {
      ;(nextNavigation.useParams as jest.Mock).mockReturnValue({
        slug: 'test-novel',
        chapterSlug: 'chuong-3',
      })

      ;(getChapter as jest.Mock).mockClear().mockResolvedValue(mockChapters[2])

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Chapter 3')).toBeInTheDocument()
      })

      const nextButton = screen.queryByRole('button', { name: /next chapter/i })
      expect(nextButton).not.toBeInTheDocument()
    })
  })

  describe('URL update on navigation', () => {
    it('updates URL using pushState when navigating to next chapter', async () => {
      const user = userEvent.setup()
      ;(getChapter as jest.Mock)
        .mockResolvedValueOnce(mockChapters[1]) // Initial load
        .mockResolvedValueOnce(mockChapters[2]) // navigateChapter fetch

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Chapter 2')).toBeInTheDocument()
      })

      const nextButton = screen.getAllByRole('button', { name: /next/i })[1]
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Chapter 3')).toBeInTheDocument()
      })

      expect(mockPushState).toHaveBeenCalledWith(
        { chapterSlug: 'chuong-3' },
        '',
        '/novel/test-novel/chapter/chuong-3'
      )
    })

    it('updates URL using pushState when navigating to previous chapter', async () => {
      const user = userEvent.setup()
      ;(getChapter as jest.Mock)
        .mockResolvedValueOnce(mockChapters[1]) // Initial load
        .mockResolvedValueOnce(mockChapters[0]) // navigateChapter fetch

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Chapter 2')).toBeInTheDocument()
      })

      const prevButton = screen.getAllByRole('button', { name: /previous/i })[1]
      await user.click(prevButton)

      await waitFor(() => {
        expect(screen.getByText('Chapter 1')).toBeInTheDocument()
      })

      expect(mockPushState).toHaveBeenCalledWith(
        { chapterSlug: 'chuong-1' },
        '',
        '/novel/test-novel/chapter/chuong-1'
      )
    })

    it('updates URL using pushState when using fallback navigation', async () => {
      const user = userEvent.setup()

      const chapterWithInvalidNext: ChapterInfo = {
        chapter: { name: 'Chapter 2', slug: 'chuong-2', content: 'Content 2' },
        prevChapter: { name: 'Chapter 1', slug: 'chuong-1', content: '' },
        nextChapter: { name: 'Invalid', slug: 'invalid-slug', content: '' },
      }

      ;(getChapter as jest.Mock)
        .mockResolvedValueOnce(chapterWithInvalidNext) // Initial load
        .mockResolvedValueOnce(null) // Invalid slug lookup fails

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Chapter 2')).toBeInTheDocument()
      })

      const nextButton = screen.getAllByRole('button', { name: /next/i })[1]
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('Chapter 3')).toBeInTheDocument()
      })

      expect(mockPushState).toHaveBeenCalledWith(
        { chapterSlug: 'chuong-3' },
        '',
        '/novel/test-novel/chapter/chuong-3'
      )
    })
  })

  describe('Completion Feature - "Mark as Completed" button', () => {
    it('shows "Mark as Completed" button on last chapter (no next chapter)', async () => {
      ;(nextNavigation.useParams as jest.Mock).mockReturnValue({
        slug: 'test-novel',
        chapterSlug: 'chuong-3',
      })
      ;(getChapter as jest.Mock).mockResolvedValue(mockChapters[2]) // Last chapter
      ;(getNovel as jest.Mock).mockResolvedValue(mockNovel)

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.getByText('Mark as Completed')).toBeInTheDocument()
      })
    })

    it('does not show "Mark as Completed" button on first chapter', async () => {
      ;(nextNavigation.useParams as jest.Mock).mockReturnValue({
        slug: 'test-novel',
        chapterSlug: 'chuong-1',
      })
      ;(getChapter as jest.Mock).mockResolvedValue(mockChapters[0]) // First chapter
      ;(getNovel as jest.Mock).mockResolvedValue(mockNovel)

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.queryByText('Mark as Completed')).not.toBeInTheDocument()
      })
    })

    it('does not show "Mark as Completed" button on middle chapter', async () => {
      ;(getChapter as jest.Mock).mockResolvedValue(mockChapters[1]) // Middle chapter
      ;(getNovel as jest.Mock).mockResolvedValue(mockNovel)

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.queryByText('Mark as Completed')).not.toBeInTheDocument()
      })
    })

    it('calls markNovelCompleted and deleteCurrentChapter when button is clicked', async () => {
      const user = userEvent.setup()
      ;(nextNavigation.useParams as jest.Mock).mockReturnValue({
        slug: 'test-novel',
        chapterSlug: 'chuong-3',
      })
      ;(getChapter as jest.Mock).mockResolvedValue(mockChapters[2]) // Last chapter
      ;(getNovel as jest.Mock)
        .mockResolvedValueOnce(mockNovel) // Initial load - not completed
        .mockResolvedValueOnce({ ...mockNovel, completedAt: '2024-01-15T10:30:00.000Z' }) // After marking

      render(<ChapterPage />)

      await waitFor(() => {
        const button = screen.getByText('Mark as Completed')
        expect(button).toBeInTheDocument()
        expect(button).not.toBeDisabled()
      })

      const button = screen.getByText('Mark as Completed')
      await user.click(button)

      await waitFor(() => {
        expect(markNovelCompleted).toHaveBeenCalledWith('test-novel')
        expect(deleteCurrentChapter).toHaveBeenCalledWith('test-novel')
      })
    })

    it('shows "Completed" state when novel is already completed', async () => {
      ;(nextNavigation.useParams as jest.Mock).mockReturnValue({
        slug: 'test-novel',
        chapterSlug: 'chuong-3',
      })
      ;(getChapter as jest.Mock).mockResolvedValue(mockChapters[2]) // Last chapter
      ;(getNovel as jest.Mock).mockResolvedValue({
        ...mockNovel,
        completedAt: '2024-01-15T10:30:00.000Z',
      })

      render(<ChapterPage />)

      await waitFor(() => {
        const button = screen.getByText('Completed')
        expect(button).toBeInTheDocument()
        expect(button).toBeDisabled()
      })
    })

    it('does not show "Mark as Completed" text when already completed', async () => {
      ;(nextNavigation.useParams as jest.Mock).mockReturnValue({
        slug: 'test-novel',
        chapterSlug: 'chuong-3',
      })
      ;(getChapter as jest.Mock).mockResolvedValue(mockChapters[2]) // Last chapter
      ;(getNovel as jest.Mock).mockResolvedValue({
        ...mockNovel,
        completedAt: '2024-01-15T10:30:00.000Z',
      })

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.queryByText('Mark as Completed')).not.toBeInTheDocument()
        expect(screen.getByText('Completed')).toBeInTheDocument()
      })
    })

    it('does not show "Next Chapter" button on last chapter (shows Mark as Completed instead)', async () => {
      ;(nextNavigation.useParams as jest.Mock).mockReturnValue({
        slug: 'test-novel',
        chapterSlug: 'chuong-3',
      })
      ;(getChapter as jest.Mock).mockResolvedValue(mockChapters[2]) // Last chapter
      ;(getNovel as jest.Mock).mockResolvedValue(mockNovel)

      render(<ChapterPage />)

      await waitFor(() => {
        expect(screen.queryByText('Next Chapter')).not.toBeInTheDocument()
        expect(screen.getByText('Mark as Completed')).toBeInTheDocument()
      })
    })

    it('button has green styling', async () => {
      ;(nextNavigation.useParams as jest.Mock).mockReturnValue({
        slug: 'test-novel',
        chapterSlug: 'chuong-3',
      })
      ;(getChapter as jest.Mock).mockResolvedValue(mockChapters[2]) // Last chapter
      ;(getNovel as jest.Mock).mockResolvedValue(mockNovel)

      render(<ChapterPage />)

      await waitFor(() => {
        const button = screen.getByText('Mark as Completed')
        expect(button).toHaveClass('bg-green-500')
      })
    })
  })
})
