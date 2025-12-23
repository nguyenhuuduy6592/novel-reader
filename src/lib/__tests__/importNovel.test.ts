import { importNovelFromJson } from '../importNovel'
import { Novel } from '@/types'
import { saveNovel } from '../indexedDB'

jest.mock('../indexedDB')

describe('importNovelFromJson', () => {
  const mockNovel: Novel = {
    book: {
      bookId: 123,
      slug: 'test-novel',
      coverUrl: '/cover.jpg',
      name: 'Test Novel',
      chapterCount: 10,
      author: { name: 'Test Author' },
    },
    chapters: [
      {
        chapter: { name: 'Chapter 1', slug: 'chap-1', content: 'Content 1' },
      },
      {
        chapter: { name: 'Chapter 2', slug: 'chap-2', content: 'Content 2' },
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('imports novel with relative cover URL', async () => {
    const jsonString = JSON.stringify(mockNovel)

    const result = await importNovelFromJson(jsonString)

    expect(result.success).toBe(true)
    expect(saveNovel).toHaveBeenCalledWith(
      expect.objectContaining({
        book: expect.objectContaining({
          coverUrl: 'https://static.truyenchucv.org/cover.jpg',
        }),
      }),
    )
  })

  it('imports novel with absolute cover URL', async () => {
    const novelWithAbsoluteUrl = {
      ...mockNovel,
      book: { ...mockNovel.book, coverUrl: 'https://example.com/cover.jpg' },
    }
    const jsonString = JSON.stringify(novelWithAbsoluteUrl)

    const result = await importNovelFromJson(jsonString)

    expect(result.success).toBe(true)
    expect(saveNovel).toHaveBeenCalledWith(
      expect.objectContaining({
        book: expect.objectContaining({
          coverUrl: 'https://example.com/cover.jpg',
        }),
      }),
    )
  })

  it('sorts chapters by slug', async () => {
    const unsortedNovel: Novel = {
      ...mockNovel,
      chapters: [
        { chapter: { name: 'Chapter 2', slug: 'chap-2', content: 'Content 2' } },
        { chapter: { name: 'Chapter 1', slug: 'chap-1', content: 'Content 1' } },
        { chapter: { name: 'Chapter 3', slug: 'chap-3', content: 'Content 3' } },
      ],
    }
    const jsonString = JSON.stringify(unsortedNovel)

    await importNovelFromJson(jsonString)

    expect(saveNovel).toHaveBeenCalledTimes(1)
    const callArgs = (saveNovel as jest.Mock).mock.calls[0][0]
    expect(callArgs.chapters).toHaveLength(3)
    expect(callArgs.chapters[0].chapter.slug).toBe('chap-1')
    expect(callArgs.chapters[1].chapter.slug).toBe('chap-2')
    expect(callArgs.chapters[2].chapter.slug).toBe('chap-3')
  })

  it('handles novel without chapters', async () => {
    const novelWithoutChapters: Novel = { book: mockNovel.book }
    const jsonString = JSON.stringify(novelWithoutChapters)

    const result = await importNovelFromJson(jsonString)

    expect(result.success).toBe(true)
    expect(saveNovel).toHaveBeenCalledWith(
      expect.objectContaining({
        chapters: [],
      }),
    )
  })

  it('returns error for invalid JSON', async () => {
    const result = await importNovelFromJson('invalid json')

    expect(result.success).toBe(false)
    expect(result.error).toContain('invalid json')
  })

  it('returns error for malformed novel data', async () => {
    const result = await importNovelFromJson('{"book": "not an object"}')

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
