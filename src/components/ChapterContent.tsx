import DOMPurify from 'dompurify';
import { ChapterInfo, ReadingThemeConfig, AiSettings } from '@/types';
import { AiSummary } from '@/components/AiSummary';

interface ChapterContentProps {
  chapter: ChapterInfo;
  themeConfig: ReadingThemeConfig;
  aiSettings: AiSettings;
  isGeneratingSummary: boolean;
  summaryError: string | null;
  onGenerateSummary: () => void;
}

export function ChapterContent({
  chapter,
  themeConfig,
  aiSettings,
  isGeneratingSummary,
  summaryError,
  onGenerateSummary,
}: ChapterContentProps) {
  return (
    <div className={`reading-${themeConfig.background} sm:rounded-lg sm:shadow-md reading-content min-h-[50vh]`}>
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center pb-4 border-b border-current/20">
        {chapter.chapter.name}
      </h1>

      <AiSummary
        aiSettings={aiSettings}
        summary={chapter.chapter.aiSummary ?? null}
        isGenerating={isGeneratingSummary}
        error={summaryError}
        onGenerate={onGenerateSummary}
      />

      <div
        className="prose prose-lg max-w-none"
        style={{
          fontFamily: 'var(--reading-font-family)',
          lineHeight: 'var(--reading-line-height)',
        }}
      >
        {chapter.chapter.content.split('\n').filter(Boolean).map((paragraph, index) => (
          <p key={index} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(paragraph) }} />
        ))}
      </div>
    </div>
  );
}
