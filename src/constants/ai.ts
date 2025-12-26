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

export type AiProvider = 'openrouter' | 'google';

export const AI_PROVIDER_OPTIONS = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'google', label: 'Google AI' },
] as const;

export const DEFAULT_AI_PROVIDER: AiProvider = 'openrouter';

export const DEFAULT_AI_MODEL = 'openai/gpt-oss-120b:free' as const;

export const GOOGLE_AI_MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
] as const;

export const DEFAULT_GOOGLE_AI_MODEL = 'gemini-2.5-flash-lite' as const;

export const AI_SUMMARY_LENGTH_OPTIONS = [
  { value: 'short', label: 'Short (2-3 sentences)' },
  { value: 'medium', label: 'Medium (4-5 sentences)' },
  { value: 'long', label: 'Long (Detailed)' },
] as const;

export const DEFAULT_AI_SUMMARY_LENGTH: SummaryLength = 'short';

const SHORT_PROMPT = (content: string) =>
  `Tóm tắt nội dung chương truyện sau trong 2-3 câu, viết thành một đoạn văn liền mạch tự nhiên như đang kể lại cho người khác nghe.

${content}

QUAN TRỌNG:
• Phải trả lời bằng TIẾNG VIỆT tự nhiên, không được dùng tiếng Anh hay ngôn ngữ khác
• Viết ngay câu tóm tắt, không viết lời mở đầu như "Dưới đây là tóm tắt" hay "Tóm lại"
• Giọng văn phải tự nhiên như người Việt đang kể chuyện`;

const MEDIUM_PROMPT = (content: string) =>
  `Tóm tắt nội dung chương truyện sau trong 4-5 câu:

${content}

Tóm tắt nên bao gồm:
• Các tình huống chính và diễn biến quan trọng trong chương
• Sự phát triển của cốt truyện và mối quan hệ giữa các nhân vật
• Những chi tiết đáng chú ý, bất ngờ hoặc bước ngoặt

QUAN TRỌNG:
• Phải trả lời bằng TIẾNG VIỆT tự nhiên, không được dùng tiếng Anh hay ngôn ngữ khác
• Viết thành đoạn văn hoặc gạch đầu dòng, giọng văn tự nhiên, dễ hiểu, duy trì giọng văn trong nội dung gốc
• Giọng văn phải tự nhiên như người Việt đang kể chuyện
• Không viết lời mở đầu hay giải thích

Tránh:
• Không đưa ra ý kiến cá nhân hoặc phân tích sâu
• Không sao chép nguyên văn từ nội dung gốc
• Không sử dụng ngôn ngữ quá phức tạp hoặc học thuật
`;


const LONG_PROMPT = (content: string) =>
  `Tóm tắt chi tiết nội dung chương truyện sau:

${content}

Tóm tắt nên bao gồm:
• Mở đầu: Bối cảnh, nhân vật, và hoàn cảnh khởi đầu của chương
• Diễn biến chính: Các tình huống quan trọng, xung đột, và hành động của nhân vật
• Sự phát triển: Biến đổi trong mối quan hệ giữa các nhân vật và tiến triển cốt truyện
• Chi tiết đáng chú ý: Những sự kiện bất ngờ, bước ngoặt, hoặc thông tin quan tiết
• Kết thúc: Tình huống kết thúc của chương và gợi ý cho chương sau

QUAN TRỌNG:
• Phải trả lời bằng TIẾNG VIỆT tự nhiên, không được dùng tiếng Anh hay ngôn ngữ khác
• Viết chi tiết khoảng 8-12 câu hoặc dạng gạch đầu dòng đầy đủ
• Giọng văn tự nhiên, dễ hiểu, duy trì giọng văn trong nội dung gốc
• Giọng văn phải tự nhiên như người Việt đang kể chuyện
• Không viết lời mở đầu hay giải thích

Tránh:
• Không đưa ra ý kiến cá nhân hoặc phân tích sâu
• Không sao chép nguyên văn từ nội dung gốc
• Không sử dụng ngôn ngữ quá phức tạp hoặc học thuật
`;

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
