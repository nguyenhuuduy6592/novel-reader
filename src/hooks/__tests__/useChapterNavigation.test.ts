import { renderHook, waitFor, act } from '@testing-library/react'
import { useChapterNavigation } from '@/hooks/useChapterNavigation'
import { getChapter, saveCurrentChapter, listChapters, updateNovelLastRead } from '@/lib/indexedDB'
import { ChapterInfo } from '@/types'

jest.mock('@/lib/indexedDB')

// Mock window functions
const mockScrollTo = jest.fn()
const mockPushState = jest.fn()
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()

// Store original location
const originalLocation = window.location

global.scrollTo = mockScrollTo
global.window.history.pushState = mockPushState
global.window.addEventListener = mockAddEventListener as any
global.window.removeEventListener = mockRemoveEventListener as any

describe('useChapterNavigation', () => {
  const mockSlug = 'test-novel'
  const mockChapterSlug = 'chuong-1'

  const mockChapter: ChapterInfo = {
    chapter: { name: 'Chapter 1', slug: 'chuong-1', content: 'Content 1' },
    prevChapter: undefined,
    nextChapter: { name: 'Chapter 2', slug: 'chuong-2', content: '' },
  }

  const mockChapter2: ChapterInfo = {
    chapter: { name: 'Chapter 2', slug: 'chuong-2', content: 'Content 2' },
    prevChapter: { name: 'Chapter 1', slug: 'chuong-1', content: '' },
    nextChapter: { name: 'Chapter 3', slug: 'chuong-3', content: '' },
  }

  const mockChapter3: ChapterInfo = {
    chapter: { name: 'Chapter 3', slug: 'chuong-3', content: 'Content 3' },
    prevChapter: { name: 'Chapter 2', slug: 'chuong-2', content: '' },
    nextChapter: undefined,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getChapter as jest.Mock).mockResolvedValue(mockChapter)
    ;(saveCurrentChapter as jest.Mock).mockResolvedValue(undefined)
    ;(listChapters as jest.Mock).mockResolvedValue([mockChapter, mockChapter2, mockChapter3])
    ;(updateNovelLastRead as jest.Mock).mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('loadChapter', () => {
    it('loads and displays chapter on mount', async () => {
      const onChapterChange = jest.fn()

      renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: mockChapterSlug,
          onChapterChange,
        })
      )

      await waitFor(() => {
        expect(getChapter).toHaveBeenCalledWith(mockSlug, mockChapterSlug)
        expect(onChapterChange).toHaveBeenCalledWith(mockChapter)
      })
    })

    it('saves current chapter and updates last read on load', async () => {
      const onChapterChange = jest.fn()

      renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: mockChapterSlug,
          onChapterChange,
        })
      )

      await waitFor(() => {
        expect(saveCurrentChapter).toHaveBeenCalledWith(mockSlug, mockChapterSlug, 'Chapter 1')
        expect(updateNovelLastRead).toHaveBeenCalledWith(mockSlug)
      })
    })

    it('scrolls to top when loading chapter', async () => {
      const onChapterChange = jest.fn()

      renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: mockChapterSlug,
          onChapterChange,
        })
      )

      await waitFor(() => {
        expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
      })
    })

    it('calls onChapterChange with null when chapter not found', async () => {
      const onChapterChange = jest.fn()
      ;(getChapter as jest.Mock).mockResolvedValue(null)

      renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: 'non-existent',
          onChapterChange,
        })
      )

      await waitFor(() => {
        expect(onChapterChange).toHaveBeenCalledWith(null)
      })
    })

    it('handles errors gracefully', async () => {
      const onChapterChange = jest.fn()
      ;(getChapter as jest.Mock).mockRejectedValue(new Error('Network error'))

      renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: mockChapterSlug,
          onChapterChange,
        })
      )

      await waitFor(() => {
        expect(onChapterChange).toHaveBeenCalledWith(null)
      })
    })

    it('uses pre-fetched chapter when provided', async () => {
      const onChapterChange = jest.fn()

      const { result } = renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: mockChapterSlug,
          onChapterChange,
        })
      )

      // Call loadChapter with pre-fetched chapter
      await act(async () => {
        await result.current.loadChapter('chuong-2', mockChapter2)
      })

      expect(getChapter).not.toHaveBeenCalledWith(mockSlug, 'chuong-2')
      expect(onChapterChange).toHaveBeenCalledWith(mockChapter2)
      expect(saveCurrentChapter).toHaveBeenCalledWith(mockSlug, 'chuong-2', 'Chapter 2')
    })
  })

  describe('navigateChapter', () => {
    it('navigates to next chapter using stored slug', async () => {
      const onChapterChange = jest.fn()
      ;(getChapter as jest.Mock)
        .mockResolvedValueOnce(mockChapter) // Initial load
        .mockResolvedValueOnce(mockChapter2) // Navigation fetch

      const { result } = renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: mockChapterSlug,
          onChapterChange,
        })
      )

      await waitFor(() => {
        expect(onChapterChange).toHaveBeenCalledWith(mockChapter)
      })

      // Navigate to next chapter
      await act(async () => {
        await result.current.navigateChapter('next', mockChapter)
      })

      await waitFor(() => {
        expect(getChapter).toHaveBeenCalledWith(mockSlug, 'chuong-2')
        expect(mockPushState).toHaveBeenCalledWith(
          { chapterSlug: 'chuong-2' },
          '',
          `/novel/${mockSlug}/chapter/chuong-2`
        )
        expect(onChapterChange).toHaveBeenCalledWith(mockChapter2)
      })
    })

    it('navigates to previous chapter using stored slug', async () => {
      const onChapterChange = jest.fn()
      ;(getChapter as jest.Mock)
        .mockResolvedValueOnce(mockChapter2) // Initial load
        .mockResolvedValueOnce(mockChapter) // Navigation fetch

      const { result } = renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: 'chuong-2',
          onChapterChange,
        })
      )

      await waitFor(() => {
        expect(onChapterChange).toHaveBeenCalledWith(mockChapter2)
      })

      // Navigate to previous chapter
      await act(async () => {
        await result.current.navigateChapter('prev', mockChapter2)
      })

      await waitFor(() => {
        expect(getChapter).toHaveBeenCalledWith(mockSlug, 'chuong-1')
        expect(mockPushState).toHaveBeenCalledWith(
          { chapterSlug: 'chuong-1' },
          '',
          `/novel/${mockSlug}/chapter/chuong-1`
        )
        expect(onChapterChange).toHaveBeenCalledWith(mockChapter)
      })
    })

    it('does nothing when target slug does not exist', async () => {
      const onChapterChange = jest.fn()
      const lastChapter: ChapterInfo = {
        chapter: { name: 'Last Chapter', slug: 'last', content: 'Content' },
        prevChapter: { name: 'Chapter 1', slug: 'chuong-1', content: '' },
        nextChapter: undefined,
      }

      // Mock to return the lastChapter specifically for this test
      ;(getChapter as jest.Mock).mockResolvedValueOnce(lastChapter)

      const { result } = renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: 'last',
          onChapterChange,
        })
      )

      await waitFor(() => {
        expect(onChapterChange).toHaveBeenCalledWith(lastChapter)
      })

      // Clear the mock to check only navigation calls
      ;(getChapter as jest.Mock).mockClear()

      // Try to navigate to next chapter (which doesn't exist)
      await act(async () => {
        await result.current.navigateChapter('next', lastChapter)
      })

      // Should not call getChapter for navigation since nextChapter.slug is undefined
      expect(getChapter).not.toHaveBeenCalled()
      expect(mockPushState).not.toHaveBeenCalled()
    })

    describe('fallback navigation', () => {
      it('uses chapter number-based fallback when stored slug is invalid', async () => {
        const onChapterChange = jest.fn()

        const chapterWithInvalidNext: ChapterInfo = {
          chapter: { name: 'Chapter 2', slug: 'chuong-2', content: 'Content 2' },
          prevChapter: { name: 'Chapter 1', slug: 'chuong-1', content: '' },
          nextChapter: { name: 'Invalid', slug: 'invalid-slug', content: '' },
        }

        ;(getChapter as jest.Mock)
          .mockResolvedValueOnce(chapterWithInvalidNext) // Initial load
          .mockResolvedValueOnce(null) // Invalid slug lookup fails

        const { result } = renderHook(() =>
          useChapterNavigation({
            slug: mockSlug,
            chapterSlug: 'chuong-2',
            onChapterChange,
          })
        )

        await waitFor(() => {
          expect(onChapterChange).toHaveBeenCalledWith(chapterWithInvalidNext)
        })

        // Navigate to next chapter (stored slug is invalid)
        await act(async () => {
          await result.current.navigateChapter('next', chapterWithInvalidNext)
        })

        await waitFor(() => {
          expect(getChapter).toHaveBeenCalledWith(mockSlug, 'invalid-slug')
          expect(listChapters).toHaveBeenCalledWith(mockSlug)
          expect(mockPushState).toHaveBeenCalledWith(
            { chapterSlug: 'chuong-3' },
            '',
            `/novel/${mockSlug}/chapter/chuong-3`
          )
          expect(onChapterChange).toHaveBeenCalledWith(mockChapter3)
        })
      })

      it('uses chapter number-based fallback for previous navigation', async () => {
        const onChapterChange = jest.fn()

        const chapterWithInvalidPrev: ChapterInfo = {
          chapter: { name: 'Chapter 2', slug: 'chuong-2', content: 'Content 2' },
          prevChapter: { name: 'Invalid', slug: 'invalid-slug', content: '' },
          nextChapter: { name: 'Chapter 3', slug: 'chuong-3', content: '' },
        }

        ;(getChapter as jest.Mock)
          .mockResolvedValueOnce(chapterWithInvalidPrev) // Initial load
          .mockResolvedValueOnce(null) // Invalid slug lookup fails

        const { result } = renderHook(() =>
          useChapterNavigation({
            slug: mockSlug,
            chapterSlug: 'chuong-2',
            onChapterChange,
          })
        )

        await waitFor(() => {
          expect(onChapterChange).toHaveBeenCalledWith(chapterWithInvalidPrev)
        })

        // Navigate to previous chapter (stored slug is invalid)
        await act(async () => {
          await result.current.navigateChapter('prev', chapterWithInvalidPrev)
        })

        await waitFor(() => {
          expect(getChapter).toHaveBeenCalledWith(mockSlug, 'invalid-slug')
          expect(listChapters).toHaveBeenCalledWith(mockSlug)
          expect(mockPushState).toHaveBeenCalledWith(
            { chapterSlug: 'chuong-1' },
            '',
            `/novel/${mockSlug}/chapter/chuong-1`
          )
          expect(onChapterChange).toHaveBeenCalledWith(mockChapter)
        })
      })

      it('does not navigate when chapter number cannot be extracted', async () => {
        const onChapterChange = jest.fn()

        const chapterWithNoNumber: ChapterInfo = {
          chapter: { name: 'Prologue', slug: 'prologue', content: 'Content' },
          prevChapter: undefined,
          nextChapter: { name: 'Chapter 1', slug: 'chuong-1', content: '' },
        }

        ;(getChapter as jest.Mock)
          .mockResolvedValueOnce(chapterWithNoNumber) // Initial load
          .mockResolvedValueOnce(null) // Invalid slug lookup fails

        const { result } = renderHook(() =>
          useChapterNavigation({
            slug: mockSlug,
            chapterSlug: 'prologue',
            onChapterChange,
          })
        )

        await waitFor(() => {
          expect(onChapterChange).toHaveBeenCalledWith(chapterWithNoNumber)
        })

        // Try to navigate (stored slug exists but lookup fails, no number for fallback)
        await act(async () => {
          await result.current.navigateChapter('next', chapterWithNoNumber)
        })

        // Should try direct lookup first, and when that fails, it will try fallback
        // but since the slug doesn't match the chapter number pattern, fallback won't work
        expect(getChapter).toHaveBeenCalledWith(mockSlug, 'chuong-1')
        expect(listChapters).toHaveBeenCalledWith(mockSlug)
        // Navigation won't complete because no matching chapter number found
        expect(mockPushState).not.toHaveBeenCalled()
      })
    })
  })

  describe('popstate handler', () => {
    it('sets up popstate event listener on mount', async () => {
      const onChapterChange = jest.fn()

      renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: mockChapterSlug,
          onChapterChange,
        })
      )

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('popstate', expect.any(Function))
      })
    })

    it('removes popstate event listener on unmount', async () => {
      const onChapterChange = jest.fn()

      const { unmount } = renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: mockChapterSlug,
          onChapterChange,
        })
      )

      unmount()

      expect(mockRemoveEventListener).toHaveBeenCalledWith('popstate', expect.any(Function))
    })

    it('loads chapter when popstate event occurs', async () => {
      const onChapterChange = jest.fn()

      // Get the popstate handler
      let popstateHandler: (() => void) | undefined
      mockAddEventListener.mockImplementation((event: string, handler: any) => {
        if (event === 'popstate') {
          popstateHandler = handler
        }
      })

      renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: mockChapterSlug,
          onChapterChange,
        })
      )

      await waitFor(() => {
        expect(onChapterChange).toHaveBeenCalledWith(mockChapter)
      })

      // Clear mocks to see new calls from popstate
      onChapterChange.mockClear()
      ;(getChapter as jest.Mock).mockClear()
      ;(getChapter as jest.Mock).mockResolvedValueOnce(mockChapter)

      // Due to jsdom limitations, window.location.pathname is "/" by default
      // The popstate handler will extract "" (empty string) from the pathname
      // We just verify that the handler triggers a loadChapter call
      await act(async () => {
        popstateHandler?.()
      })

      await waitFor(() => {
        // Verify the handler calls getChapter (even if with empty slug due to jsdom limitations)
        expect(getChapter).toHaveBeenCalled()
        expect(onChapterChange).toHaveBeenCalled()
      })
    })
  })

  describe('race condition handling', () => {
    it('handles concurrent loadChapter calls correctly', async () => {
      const onChapterChange = jest.fn()

      jest.useFakeTimers()

      const { result } = renderHook(() =>
        useChapterNavigation({
          slug: mockSlug,
          chapterSlug: mockChapterSlug,
          onChapterChange,
        })
      )

      await waitFor(() => {
        expect(onChapterChange).toHaveBeenCalled()
      })

      // Start two concurrent loadChapter calls
      ;(getChapter as jest.Mock)
        .mockResolvedValueOnce(mockChapter2)
        .mockResolvedValueOnce(mockChapter3)

      const promise1 = act(async () => {
        await result.current.loadChapter('chuong-2')
      })

      const promise2 = act(async () => {
        await result.current.loadChapter('chuong-3')
      })

      await Promise.all([promise1, promise2])

      // The loadingRef prevents race conditions - one of the concurrent calls will be skipped
      // The initial load happens, and then either chapter 2 or 3 wins the race
      // So we expect 2 total calls (initial + 1 winner)
      expect(onChapterChange).toHaveBeenCalledTimes(2)
    })
  })
})
