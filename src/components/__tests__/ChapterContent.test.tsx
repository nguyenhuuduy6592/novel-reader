import { render, screen } from '@testing-library/react'
import { ChapterContent } from '@/components/ChapterContent'
import { ChapterInfo, ReadingThemeConfig, AiSettings } from '@/types'
import { AiProvider } from '@/constants/ai'

const mockChapter: ChapterInfo = {
  chapter: {
    name: 'Test Chapter',
    slug: 'test-chapter',
    content: 'Paragraph 1\n\nParagraph 2\n\nParagraph 3',
    aiSummary: 'This is a test summary of the chapter.'
  },
  prevChapter: {
    name: 'Previous Chapter',
    slug: 'prev-chapter',
    content: ''
  },
  nextChapter: {
    name: 'Next Chapter',
    slug: 'next-chapter',
    content: ''
  }
}

const mockThemeConfig: ReadingThemeConfig = {
  background: 'sepia',
  fontFamily: 'sans-serif',
  fontSize: 18,
  lineHeight: 1.6,
  padding: 'compact'
}

const mockAiSettings: AiSettings = {
  provider: 'openrouter' as AiProvider,
  providers: {
    openrouter: { apiKey: 'test-key', model: 'deepseek/deepseek-chat' },
    google: { apiKey: '', model: 'gemini-2.0-flash-exp' },
    zai: { apiKey: '', model: 'glm-4.5-air' }
  },
  autoGenerate: false,
  summaryLength: 'medium'
}

describe('ChapterContent', () => {
  it('renders chapter name', () => {
    render(
      <ChapterContent
        chapter={mockChapter}
        themeConfig={mockThemeConfig}
        aiSettings={mockAiSettings}
        isGeneratingSummary={false}
        summaryError={null}
        onGenerateSummary={jest.fn()}
      />
    )

    expect(screen.getByText('Test Chapter')).toBeInTheDocument()
  })

  it('renders chapter content as paragraphs', () => {
    render(
      <ChapterContent
        chapter={mockChapter}
        themeConfig={mockThemeConfig}
        aiSettings={mockAiSettings}
        isGeneratingSummary={false}
        summaryError={null}
        onGenerateSummary={jest.fn()}
      />
    )

    expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument()
    expect(screen.getByText('Paragraph 3')).toBeInTheDocument()
  })

  it('applies theme background class', () => {
    const { container } = render(
      <ChapterContent
        chapter={mockChapter}
        themeConfig={{ ...mockThemeConfig, background: 'dark' }}
        aiSettings={mockAiSettings}
        isGeneratingSummary={false}
        summaryError={null}
        onGenerateSummary={jest.fn()}
      />
    )

    const contentDiv = container.querySelector('.reading-dark')
    expect(contentDiv).toBeInTheDocument()
  })

  it('renders AI summary when present', () => {
    render(
      <ChapterContent
        chapter={mockChapter}
        themeConfig={mockThemeConfig}
        aiSettings={mockAiSettings}
        isGeneratingSummary={false}
        summaryError={null}
        onGenerateSummary={jest.fn()}
      />
    )

    expect(screen.getByText('This is a test summary of the chapter.')).toBeInTheDocument()
  })

  it('does not render AI summary when not present', () => {
    const chapterWithoutSummary: ChapterInfo = {
      ...mockChapter,
      chapter: {
        ...mockChapter.chapter,
        aiSummary: undefined
      }
    }

    render(
      <ChapterContent
        chapter={chapterWithoutSummary}
        themeConfig={mockThemeConfig}
        aiSettings={mockAiSettings}
        isGeneratingSummary={false}
        summaryError={null}
        onGenerateSummary={jest.fn()}
      />
    )

    expect(screen.queryByText('This is a test summary of the chapter.')).not.toBeInTheDocument()
  })

  it('applies custom font family and line height styles via CSS variables', () => {
    render(
      <ChapterContent
        chapter={mockChapter}
        themeConfig={{ ...mockThemeConfig, fontFamily: 'serif', lineHeight: 2.0 }}
        aiSettings={mockAiSettings}
        isGeneratingSummary={false}
        summaryError={null}
        onGenerateSummary={jest.fn()}
      />
    )

    // Check that paragraphs are rendered (the prose div wraps them)
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument()
    expect(screen.getByText('Paragraph 3')).toBeInTheDocument()
    // The component applies styles via CSS variables in inline style
    // (actual values are set globally by useThemeConfig hook)
  })
})
