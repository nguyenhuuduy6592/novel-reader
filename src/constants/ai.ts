export interface ThemeOption {
  value: string;
  label: string;
}

export type SummaryLength = 'short' | 'medium' | 'long';

export const AI_MODEL_OPTIONS = [
  { value: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (Free)' },
  { value: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air (Free)' },
  { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash Exp (Free)' },
  { value: 'deepseek/deepseek-r1-0528:free', label: 'DeepSeek R1 (Free)' },
] as const;

export const DEFAULT_AI_MODEL = 'openai/gpt-oss-120b:free' as const;

export const AI_SUMMARY_LENGTH_OPTIONS = [
  { value: 'short', label: 'Short (2-3 sentences)' },
  { value: 'medium', label: 'Medium (4-5 sentences)' },
  { value: 'long', label: 'Long (Detailed)' },
] as const;

export const DEFAULT_AI_SUMMARY_LENGTH: SummaryLength = 'medium';

const SHORT_PROMPT = (content: string) =>
  `Bạn là một trợ lý hữu ích. Hãy tóm tắt ngắn gọn nội dung chương truyện này trong 2-3 câu.

Tóm tắt nên tập trung vào diễn biến quan trọng nhất.

Nội dung chương:
${content}`;

const MEDIUM_PROMPT = (content: string) =>
  `Bạn là một trợ lý hữu ích. Hãy tóm tắt nội dung chương truyện này.

Tóm tắt nên bao gồm:
• Các tình huống chính và diễn biến quan trọng trong chương
• Sự phát triển của cốt truyện và mối quan hệ giữa các nhân vật
• Những chi tiết đáng chú ý, bất ngờ hoặc bước ngoặt

Độ dài: 4-5 câu. Giọng văn: tự nhiên, dễ hiểu, dạng gạch đầu dòng nếu phù hợp. Duy trì giọng văn trong nội dung gốc.

Tránh:
• Không đưa ra ý kiến cá nhân hoặc phân tích sâu
• Không sao chép nguyên văn từ nội dung gốc
• Không sử dụng ngôn ngữ quá phức tạp hoặc học thuật

Nội dung chương:
${content}`;

const LONG_PROMPT = (content: string) =>
  `Bạn là một trợ lý hữu ích. Hãy tóm tắt chi tiết nội dung chương truyện này.

Tóm tắt nên bao gồm:
• Mở đầu: Bối cảnh, nhân vật, và hoàn cảnh khởi đầu của chương
• Diễn biến chính: Các tình huống quan trọng, xung đột, và hành động của nhân vật
• Sự phát triển: Biến đổi trong mối quan hệ giữa các nhân vật và tiến triển cốt truyện
• Chi tiết đáng chú ý: Những sự kiện bất ngờ, bước ngoặt, hoặc thông tin quan tiết
• Kết thúc: Tình huống kết thúc của chương và gợi ý cho chương sau

Độ dài: Chi tiết, khoảng 8-12 câu hoặc dạng gạch đầu dòng đầy đủ. Giọng văn: tự nhiên, dễ hiểu, dạng gạch đầu dòng. Duy trì giọng văn trong nội dung gốc.

Tránh:
• Không đưa ra ý kiến cá nhân hoặc phân tích sâu
• Không sao chép nguyên văn từ nội dung gốc
• Không sử dụng ngôn ngữ quá phức tạp hoặc học thuật

Nội dung chương:
${content}`;

export const AI_SUMMARY_PROMPT = (content: string, length: SummaryLength = 'medium'): string => {
  switch (length) {
    case 'short':
      return SHORT_PROMPT(content);
    case 'long':
      return LONG_PROMPT(content);
    case 'medium':
    default:
      return MEDIUM_PROMPT(content);
  }
};
