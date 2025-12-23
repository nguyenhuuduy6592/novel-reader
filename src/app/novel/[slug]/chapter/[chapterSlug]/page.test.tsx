import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChapterPage from '@/app/novel/[slug]/chapter/[chapterSlug]/page'
import { getNovel, saveCurrentChapter } from '@/lib/indexedDB'
import { Novel } from '@/types'
import * as nextNavigation from 'next/navigation'

jest.mock('@/lib/indexedDB')

const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}))

const mockNovel: Novel = {
  book: {
    bookId: 1,
    slug: 'test-novel',
    coverUrl: '/cover.jpg',
    name: 'Test Novel',
    chapterCount: 3,
    author: { name: 'Test Author' },
  },
  chapters: [
    {
      chapter: { name: 'Chapter 1', slug: 'chap-1', content: 'Content 1' },
      prevChapter: undefined,
      nextChapter: { name: 'Chapter 2', slug: 'chap-2', content: '' },
    },
    {
      chapter: { name: 'Chapter 2', slug: 'chap-2', content: 'Content 2' },
      prevChapter: { name: 'Chapter 1', slug: 'chap-1', content: '' },
      nextChapter: { name: 'Chapter 3', slug: 'chap-3', content: '' },
    },
    {
      chapter: { name: 'Chapter 3', slug: 'chap-3', content: 'Content 3' },
      prevChapter: { name: 'Chapter 2', slug: 'chap-2', content: '' },
      nextChapter: undefined,
    },
  ],
}

describe('ChapterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getNovel as jest.Mock).mockResolvedValue(mockNovel)
    ;(saveCurrentChapter as jest.Mock).mockResolvedValue(undefined)
    mockPush.mockClear()
    mockReplace.mockClear()
    ;(nextNavigation.useParams as jest.Mock).mockReturnValue({
      slug: 'test-novel',
      chapterSlug: 'chap-2',
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

  it('shows next chapter button when next chapter exists', async () => {
    render(<ChapterPage />)

    await waitFor(() => {
      expect(screen.getByText('Chapter 2')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /next chapter/i })).toBeInTheDocument()
  })

  it('shows previous chapter button when previous chapter exists', async () => {
    render(<ChapterPage />)

    await waitFor(() => {
      expect(screen.getByText('Chapter 2')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /previous chapter/i })).toBeInTheDocument()
  })

  it('loads next chapter when clicking next button', async () => {
    const user = userEvent.setup()
    render(<ChapterPage />)

    await waitFor(() => {
      expect(screen.getByText('Chapter 2')).toBeInTheDocument()
    })

    const nextButton = screen.getAllByRole('button', { name: /next/i })[1]
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText('Chapter 3')).toBeInTheDocument()
    })

    expect(mockReplace).toHaveBeenCalledWith('/novel/test-novel/chapter/chap-3')
  })

  it('loads previous chapter when clicking previous button', async () => {
    const user = userEvent.setup()
    render(<ChapterPage />)

    await waitFor(() => {
      expect(screen.getByText('Chapter 2')).toBeInTheDocument()
    })

    const prevButton = screen.getAllByRole('button', { name: /previous/i })[1]
    await user.click(prevButton)

    await waitFor(() => {
      expect(screen.getByText('Chapter 1')).toBeInTheDocument()
    })

    expect(mockReplace).toHaveBeenCalledWith('/novel/test-novel/chapter/chap-1')
  })
})
