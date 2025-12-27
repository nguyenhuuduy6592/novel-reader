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

  it('sorts chapters using nextChapter/prevChapter links', async () => {
    const unsortedNovel: Novel = {
      ...mockNovel,
      chapters: [
        {
          chapter: { name: 'Chapter 2', slug: 'chap-2', content: 'Content 2' },
          nextChapter: { slug: 'chap-3', name: '', content: '' },
          prevChapter: { slug: 'chap-1', name: '', content: '' },
        },
        {
          chapter: { name: 'Chapter 1', slug: 'chap-1', content: 'Content 1' },
          nextChapter: { slug: 'chap-2', name: '', content: '' },
        },
        {
          chapter: { name: 'Chapter 3', slug: 'chap-3', content: 'Content 3' },
          prevChapter: { slug: 'chap-2', name: '', content: '' },
        },
      ],
    }
    const jsonString = JSON.stringify(unsortedNovel)

    await importNovelFromJson(jsonString)

    expect(saveNovel).toHaveBeenCalledTimes(1)
    const callArgs = (saveNovel as jest.Mock).mock.calls[0][0]
    expect(callArgs.chapters).toHaveLength(3)
    // Chapters ARE sorted using nextChapter/prevChapter links
    expect(callArgs.chapters[0].chapter.slug).toBe('chap-1')
    expect(callArgs.chapters[1].chapter.slug).toBe('chap-2')
    expect(callArgs.chapters[2].chapter.slug).toBe('chap-3')
  })

  it('normalizes Vietnamese chapter slugs', async () => {
    const novelWithAccents: Novel = {
      ...mockNovel,
      chapters: [
        {
          chapter: { name: 'Chương 1', slug: 'Chương-1', content: 'Content 1' },
          nextChapter: { slug: 'Chương-2', name: '', content: '' },
        },
        {
          chapter: { name: 'Chương 2', slug: 'Chương-2', content: 'Content 2' },
          prevChapter: { slug: 'Chương-1', name: '', content: '' },
        },
      ],
    }
    const jsonString = JSON.stringify(novelWithAccents)

    await importNovelFromJson(jsonString)

    expect(saveNovel).toHaveBeenCalledTimes(1)
    const callArgs = (saveNovel as jest.Mock).mock.calls[0][0]
    expect(callArgs.chapters).toHaveLength(2)
    // Slugs should be normalized
    expect(callArgs.chapters[0].chapter.slug).toBe('chuong-1')
    expect(callArgs.chapters[1].chapter.slug).toBe('chuong-2')
    // References should also be updated
    expect(callArgs.chapters[0].nextChapter?.slug).toBe('chuong-2')
    expect(callArgs.chapters[1].prevChapter?.slug).toBe('chuong-1')
  })

  it('normalizes special characters in slugs', async () => {
    const novelWithSpecialChars: Novel = {
      ...mockNovel,
      chapters: [
        {
          chapter: { name: 'Chapter 1', slug: 'chapter@#$1', content: 'Content 1' },
        },
      ],
    }
    const jsonString = JSON.stringify(novelWithSpecialChars)

    await importNovelFromJson(jsonString)

    expect(saveNovel).toHaveBeenCalledTimes(1)
    const callArgs = (saveNovel as jest.Mock).mock.calls[0][0]
    // Special characters should be replaced with dashes
    expect(callArgs.chapters[0].chapter.slug).toBe('chapter-1')
  })

  it('handles novel without chapters', async () => {
    const novelWithoutChapters: Novel = { book: mockNovel.book }
    const jsonString = JSON.stringify(novelWithoutChapters)

    const result = await importNovelFromJson(jsonString)

    expect(result.success).toBe(true)
    expect(saveNovel).toHaveBeenCalledTimes(1)
    // Note: chapters property is undefined when not provided in input
    const callArgs = (saveNovel as jest.Mock).mock.calls[0][0]
    expect(callArgs.book).toBeDefined()
    // The chapters property may be undefined since we don't normalize it
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
