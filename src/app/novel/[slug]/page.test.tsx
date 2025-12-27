import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NovelPage from './page'

// Mock indexedDB functions
jest.mock('@/lib/indexedDB', () => ({
  getNovel: jest.fn(),
  getCurrentChapter: jest.fn(),
  listChapters: jest.fn(),
  removeNovel: jest.fn(),
  exportNovel: jest.fn(),
  unmarkNovelCompleted: jest.fn(),
}))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useParams: jest.fn(() => ({ slug: 'test-novel' })),
  useRouter: jest.fn(() => ({ push: mockPush })),
}))

// Mock NavButton to simplify testing
jest.mock('@/components/NavButton', () => ({
  NavButton: ({ label, onClick, children }: any) => (
    <button onClick={onClick} data-testid={`nav-button-${label}`}>
      {children}
    </button>
  ),
}))

// Mock ConfirmDialog
jest.mock('@/components/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, onConfirm }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="confirm-dialog">
        <button onClick={onConfirm} data-testid="confirm-delete">
          Confirm
        </button>
      </div>
    )
  },
}))

// Mock PageLayout
jest.mock('@/components/PageLayout', () => {
  return function PageLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="page-layout">{children}</div>
  }
})

import { getNovel, getCurrentChapter, listChapters, removeNovel, exportNovel, unmarkNovelCompleted } from '@/lib/indexedDB'

describe('NovelPage', () => {
  const mockNovel = {
    book: {
      bookId: 1,
      slug: 'test-novel',
      coverUrl: '/cover.jpg',
      name: 'Test Novel',
      chapterCount: 2,
      author: { name: 'Test Author' },
    },
  }

  const mockChapters = [
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
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getNovel as jest.Mock).mockResolvedValue(mockNovel)
    ;(getCurrentChapter as jest.Mock).mockResolvedValue({ novelSlug: 'test-novel', chapterSlug: 'chap-1', chapterName: 'Chapter 1' })
    ;(listChapters as jest.Mock).mockResolvedValue(mockChapters)
    ;(removeNovel as jest.Mock).mockResolvedValue(undefined)
    ;(exportNovel as jest.Mock).mockResolvedValue({
      ...mockNovel,
      chapters: mockChapters,
    })
    ;(unmarkNovelCompleted as jest.Mock).mockResolvedValue(undefined)
  })

  it('renders novel details', async () => {
    render(<NovelPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Novel')).toBeInTheDocument()
      expect(screen.getByText('by Test Author')).toBeInTheDocument()
      expect(screen.getByText('2 chapters')).toBeInTheDocument()
    })
  })

  it('shows current chapter badge', async () => {
    render(<NovelPage />)

    await waitFor(() => {
      expect(screen.getByText(/Current:/)).toBeInTheDocument()
    })
  })

  it('shows export button', async () => {
    render(<NovelPage />)

    await waitFor(() => {
      expect(screen.getByTestId('nav-button-Export')).toBeInTheDocument()
    })
  })

  it('exports novel when export button is clicked', async () => {
    const user = userEvent.setup()
    global.URL.createObjectURL = jest.fn(() => 'blob:url')
    global.URL.revokeObjectURL = jest.fn()

    render(<NovelPage />)

    await waitFor(() => {
      expect(screen.getByTestId('nav-button-Export')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('nav-button-Export'))

    await waitFor(() => {
      expect(exportNovel).toHaveBeenCalledWith('test-novel')
    })
  })

  it('shows delete button and confirmation dialog', async () => {
    const user = userEvent.setup()

    render(<NovelPage />)

    await waitFor(() => {
      expect(screen.getByTestId('nav-button-Remove')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('nav-button-Remove'))

    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
    })
  })

  it('removes novel when confirmed', async () => {
    const user = userEvent.setup()

    render(<NovelPage />)

    await waitFor(() => {
      expect(screen.getByTestId('nav-button-Remove')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('nav-button-Remove'))
    await user.click(screen.getByTestId('confirm-delete'))

    await waitFor(() => {
      expect(removeNovel).toHaveBeenCalledWith('test-novel')
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows loading state while loading', () => {
    ;(getNovel as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(<NovelPage />)

    expect(screen.getByText('Loading novel...')).toBeInTheDocument()
  })

  it('shows error state when novel not found', async () => {
    ;(getNovel as jest.Mock).mockResolvedValue(null)

    render(<NovelPage />)

    await waitFor(() => {
      expect(screen.getByText('Novel not found.')).toBeInTheDocument()
    })
  })

  describe('Completion Feature - "Unmark Completed" button', () => {
    it('shows completion badge when novel is completed', async () => {
      const completedNovel = {
        ...mockNovel,
        completedAt: '2024-01-15T10:30:00.000Z',
      }
      ;(getNovel as jest.Mock).mockResolvedValue(completedNovel)

      render(<NovelPage />)

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument()
      })
    })

    it('shows "Unmark Completed" button when novel is completed', async () => {
      const completedNovel = {
        ...mockNovel,
        completedAt: '2024-01-15T10:30:00.000Z',
      }
      ;(getNovel as jest.Mock).mockResolvedValue(completedNovel)

      render(<NovelPage />)

      await waitFor(() => {
        expect(screen.getByTestId('nav-button-Unmark Completed')).toBeInTheDocument()
      })
    })

    it('does not show "Unmark Completed" button when novel is not completed', async () => {
      render(<NovelPage />)

      await waitFor(() => {
        expect(screen.queryByTestId('nav-button-Unmark Completed')).not.toBeInTheDocument()
      })
    })

    it('does not show current chapter badge when novel is completed', async () => {
      const completedNovel = {
        ...mockNovel,
        completedAt: '2024-01-15T10:30:00.000Z',
      }
      ;(getNovel as jest.Mock).mockResolvedValue(completedNovel)

      render(<NovelPage />)

      await waitFor(() => {
        expect(screen.queryByText(/Current:/)).not.toBeInTheDocument()
      })
    })

    it('calls unmarkNovelCompleted and updates novel when button is clicked', async () => {
      const user = userEvent.setup()
      const completedNovel = {
        ...mockNovel,
        completedAt: '2024-01-15T10:30:00.000Z',
      }
      ;(getNovel as jest.Mock)
        .mockResolvedValueOnce(completedNovel) // Initial load - completed
        .mockResolvedValueOnce(mockNovel) // After unmarking - not completed
      ;(unmarkNovelCompleted as jest.Mock).mockResolvedValue(undefined)

      render(<NovelPage />)

      await waitFor(() => {
        expect(screen.getByTestId('nav-button-Unmark Completed')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('nav-button-Unmark Completed'))

      await waitFor(() => {
        expect(unmarkNovelCompleted).toHaveBeenCalledWith('test-novel')
        expect(getNovel).toHaveBeenCalledWith('test-novel') // Called to refresh novel data
      })
    })

    it('shows current chapter badge again after unmarking completed', async () => {
      const user = userEvent.setup()
      const completedNovel = {
        ...mockNovel,
        completedAt: '2024-01-15T10:30:00.000Z',
      }
      ;(getNovel as jest.Mock)
        .mockResolvedValueOnce(completedNovel) // Initial load - completed
        .mockResolvedValueOnce(mockNovel) // After unmarking - not completed
      ;(unmarkNovelCompleted as jest.Mock).mockResolvedValue(undefined)

      render(<NovelPage />)

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('nav-button-Unmark Completed'))

      await waitFor(() => {
        // After unmarking, getNovel is called again and the component re-renders
        expect(getNovel).toHaveBeenCalledTimes(2)
      })
    })
  })
})
