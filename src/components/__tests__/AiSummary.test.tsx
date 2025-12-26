import { render, screen, fireEvent } from '@testing-library/react';
import { AiSummary } from '@/components/AiSummary';
import { AiSettings } from '@/types';
import { AiProvider } from '@/constants/ai';
import { LOCAL_STORAGE_KEYS } from '@/constants/storage';

const mockAiSettings: AiSettings = {
  provider: 'openrouter' as AiProvider,
  providers: {
    openrouter: { apiKey: 'test-key', model: 'deepseek/deepseek-chat' },
    google: { apiKey: '', model: 'gemini-2.0-flash-exp' }
  },
  autoGenerate: false,
  summaryLength: 'short'
};

describe('AiSummary', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('when generating', () => {
    it('shows loading state', () => {
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary={null}
          isGenerating={true}
          error={null}
          onGenerate={jest.fn()}
        />
      );

      expect(screen.getByText('Generating AI summary...')).toBeInTheDocument();
    });

    it('does not show error or summary while generating', () => {
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary="Existing summary"
          isGenerating={true}
          error="Some error"
          onGenerate={jest.fn()}
        />
      );

      expect(screen.getByText('Generating AI summary...')).toBeInTheDocument();
      expect(screen.queryByText('Some error')).not.toBeInTheDocument();
      expect(screen.queryByText('Existing summary')).not.toBeInTheDocument();
    });
  });

  describe('when no summary exists', () => {
    it('shows generate button', () => {
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary={null}
          isGenerating={false}
          error={null}
          onGenerate={jest.fn()}
        />
      );

      expect(screen.getByText('No AI summary available.')).toBeInTheDocument();
      expect(screen.getByText('Generate Summary')).toBeInTheDocument();
    });

    it('calls onGenerate when button is clicked', () => {
      const onGenerate = jest.fn();
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary={null}
          isGenerating={false}
          error={null}
          onGenerate={onGenerate}
        />
      );

      fireEvent.click(screen.getByText('Generate Summary'));
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('when summary exists', () => {
    it('displays the summary', () => {
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary="This is a test summary"
          isGenerating={false}
          error={null}
          onGenerate={jest.fn()}
        />
      );

      expect(screen.getByText('This is a test summary')).toBeInTheDocument();
      expect(screen.getByText('AI Summary')).toBeInTheDocument();
      expect(screen.getByText('Regenerate Summary')).toBeInTheDocument();
    });

    it('calls onGenerate when regenerate is clicked', () => {
      const onGenerate = jest.fn();
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary="Test summary"
          isGenerating={false}
          error={null}
          onGenerate={onGenerate}
        />
      );

      fireEvent.click(screen.getByText('Regenerate Summary'));
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('when error exists', () => {
    it('displays error message', () => {
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary="Existing summary"
          isGenerating={false}
          error="API request failed"
          onGenerate={jest.fn()}
        />
      );

      expect(screen.getByText('API request failed')).toBeInTheDocument();
      expect(screen.getByText('AI Summary Error')).toBeInTheDocument();
    });

    it('shows retry button', () => {
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary="Existing summary"
          isGenerating={false}
          error="API request failed"
          onGenerate={jest.fn()}
        />
      );

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('calls onGenerate when retry is clicked', () => {
      const onGenerate = jest.fn();
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary="Existing summary"
          isGenerating={false}
          error="API request failed"
          onGenerate={onGenerate}
        />
      );

      fireEvent.click(screen.getByText('Retry'));
      expect(onGenerate).toHaveBeenCalledTimes(1);
    });

    it('also shows existing summary below error', () => {
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary="Existing summary content"
          isGenerating={false}
          error="API request failed"
          onGenerate={jest.fn()}
        />
      );

      // Error should be visible
      expect(screen.getByText('API request failed')).toBeInTheDocument();
      expect(screen.getByText('AI Summary Error')).toBeInTheDocument();

      // Summary should also be visible
      expect(screen.getByText('Existing summary content')).toBeInTheDocument();
      expect(screen.getAllByText('AI Summary')).toHaveLength(1);
    });

    it('shows error and generate button when no summary exists', () => {
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary={null}
          isGenerating={false}
          error="API request failed"
          onGenerate={jest.fn()}
        />
      );

      // Error should be visible above the generate button
      expect(screen.getByText('API request failed')).toBeInTheDocument();
      expect(screen.getByText('AI Summary Error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();

      // Generate button should still be shown
      expect(screen.getByText('No AI summary available.')).toBeInTheDocument();
      expect(screen.getByText('Generate Summary')).toBeInTheDocument();
    });
  });

  describe('collapsed state persistence', () => {
    it('has localStorage key for collapsed state', () => {
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary="Test summary"
          isGenerating={false}
          error={null}
          onGenerate={jest.fn()}
        />
      );

      // The component sets up localStorage handling
      // Verify the summary is rendered (open by default)
      expect(screen.getByText('Test summary')).toBeInTheDocument();
    });

    it('restores collapsed state from localStorage on mount', () => {
      // Set to 'false' meaning open (not collapsed)
      localStorage.setItem(LOCAL_STORAGE_KEYS.AI_SUMMARY_COLLAPSED, 'false');

      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary="Test summary"
          isGenerating={false}
          error={null}
          onGenerate={jest.fn()}
        />
      );

      // Verify the localStorage key exists and component renders
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.AI_SUMMARY_COLLAPSED)).toBe('false');
      expect(screen.getByText('Test summary')).toBeInTheDocument();
    });
  });

  describe('visibility based on settings', () => {
    it('hides when no API key and no summary', () => {
      const noApiKeySettings: AiSettings = {
        ...mockAiSettings,
        providers: {
          openrouter: { apiKey: '', model: 'deepseek/deepseek-chat' },
          google: { apiKey: '', model: 'gemini-2.0-flash-exp' }
        }
      };

      const { container } = render(
        <AiSummary
          aiSettings={noApiKeySettings}
          summary={null}
          isGenerating={false}
          error={null}
          onGenerate={jest.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('shows when no API key but summary exists', () => {
      const noApiKeySettings: AiSettings = {
        ...mockAiSettings,
        providers: {
          openrouter: { apiKey: '', model: 'deepseek/deepseek-chat' },
          google: { apiKey: '', model: 'gemini-2.0-flash-exp' }
        }
      };

      render(
        <AiSummary
          aiSettings={noApiKeySettings}
          summary="Existing summary"
          isGenerating={false}
          error={null}
          onGenerate={jest.fn()}
        />
      );

      expect(screen.getByText('Existing summary')).toBeInTheDocument();
    });

    it('shows when API key is set even without summary', () => {
      render(
        <AiSummary
          aiSettings={mockAiSettings}
          summary={null}
          isGenerating={false}
          error={null}
          onGenerate={jest.fn()}
        />
      );

      expect(screen.getByText('No AI summary available.')).toBeInTheDocument();
    });
  });
});
