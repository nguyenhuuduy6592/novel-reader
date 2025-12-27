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
  NavButton: ({ label, onClick, children }: { label?: string; onClick?: () => void; children?: React.ReactNode }) => (
    <button onClick={onClick} data-testid={`nav-button-${label}`}>
      {children}
    </button>
  ),
}))

// Mock ConfirmDialog
jest.mock('@/components/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, onConfirm }: { isOpen?: boolean; onConfirm?: () => void }) => {
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

// Mock useAiSettings hook
jest.mock('@/hooks/useAiSettings', () => ({
  useAiSettings: () => ({
    aiSettings: {
      provider: 'openrouter',
      providers: {
        openrouter: { apiKey: 'test-api-key', model: 'test-model' },
      },
      summaryLength: 'short',
      autoGenerate: false,
    },
  }),
}))

// Mock icons
jest.mock('@/lib/icons', () => ({
  HomeIcon: () => <span data-testid="home-icon">Home</span>,
  TrashIcon: () => <span>Trash</span>,
  DownloadIcon: () => <span>Download</span>,
  SparklesIcon: () => <span>✨</span>,
  RefreshIcon: () => <span>Refresh</span>,
  CheckIcon: () => <span>Check</span>,
}))

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

  describe('Batch Size Dropdown - Generate Summaries', () => {
    beforeEach(() => {
      // Mock AI settings with API key
      ;(getNovel as jest.Mock).mockResolvedValue(mockNovel)
      ;(listChapters as jest.Mock).mockResolvedValue(mockChapters)
    })

    it('shows generate summaries button with default batch size of 10', async () => {
      render(<NovelPage />)

      await waitFor(() => {
        expect(screen.getByText(/Generate Summaries \(10\)/)).toBeInTheDocument()
      })
    })

    it('opens dropdown menu when generate summaries button is clicked', async () => {
      const user = userEvent.setup()
      render(<NovelPage />)

      await waitFor(() => {
        expect(screen.getByText(/Generate Summaries \(10\)/)).toBeInTheDocument()
      })

      const button = screen.getByText(/Generate Summaries \(10\)/).closest('summary')
      await user.click(button!)

      await waitFor(() => {
        expect(screen.getByText('Select batch size:')).toBeInTheDocument()
        expect(screen.getByText('10 chapters')).toBeInTheDocument()
        expect(screen.getByText('100 chapters')).toBeInTheDocument()
        expect(screen.getByText('1,000 chapters')).toBeInTheDocument()
        expect(screen.getByText('All chapters')).toBeInTheDocument()
        expect(screen.getByText('Generate')).toBeInTheDocument()
      })
    })

    it('updates button label when batch size is changed to 100', async () => {
      const user = userEvent.setup()
      render(<NovelPage />)

      await waitFor(() => {
        expect(screen.getByText(/Generate Summaries \(10\)/)).toBeInTheDocument()
      })

      // Open dropdown
      const button = screen.getByText(/Generate Summaries \(10\)/).closest('summary')
      await user.click(button!)

      // Click 100 chapters option
      await user.click(screen.getByText('100 chapters'))

      await waitFor(() => {
        expect(screen.getByText(/Generate Summaries \(100\)/)).toBeInTheDocument()
      })
    })

    it('updates button label when batch size is changed to 1000', async () => {
      const user = userEvent.setup()
      render(<NovelPage />)

      await waitFor(() => {
        expect(screen.getByText(/Generate Summaries \(10\)/)).toBeInTheDocument()
      })

      const button = screen.getByText(/Generate Summaries \(10\)/).closest('summary')
      await user.click(button!)

      await user.click(screen.getByText('1,000 chapters'))

      await waitFor(() => {
        expect(screen.getByText(/Generate Summaries \(1000\)/)).toBeInTheDocument()
      })
    })

    it('updates button label when batch size is changed to All', async () => {
      const user = userEvent.setup()
      render(<NovelPage />)

      await waitFor(() => {
        expect(screen.getByText(/Generate Summaries \(10\)/)).toBeInTheDocument()
      })

      const button = screen.getByText(/Generate Summaries \(10\)/).closest('summary')
      await user.click(button!)

      await user.click(screen.getByText('All chapters'))

      await waitFor(() => {
        expect(screen.getByText(/Generate Summaries \(All\)/)).toBeInTheDocument()
      })
    })

    it('does not show generate summaries button when no API key is set', async () => {
      // Override the mock to return no API key
      jest.doMock('@/hooks/useAiSettings', () => ({
        useAiSettings: () => ({
          aiSettings: {
            provider: 'openrouter',
            providers: {
              openrouter: { apiKey: '', model: 'test-model' },
            },
            summaryLength: 'short',
            autoGenerate: false,
          },
        }),
      }))

      // Re-render with new mock
      const { rerender } = render(<NovelPage />)

      await waitFor(() => {
        expect(screen.queryByText(/Generate Summaries/)).not.toBeInTheDocument()
      })

      // Restore original mock
      jest.dontMock('@/hooks/useAiSettings')
    })
  })
})
