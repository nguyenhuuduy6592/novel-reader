export interface ThemeOption {
  value: string;
  label: string;
}

export const AI_MODEL_OPTIONS = [
  { value: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (Free)' },
  { value: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air (Free)' },
  { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash Exp (Free)' },
  { value: 'deepseek/deepseek-r1-0528:free', label: 'DeepSeek R1 (Free)' },
] as const;

export const DEFAULT_AI_MODEL = 'openai/gpt-oss-120b:free' as const;

export const AI_SUMMARY_PROMPT = (content: string) =>
  `Bạn là một trợ lý hữu ích. Hãy tóm tắt nội dung chương truyện này.

Tóm tắt nên bao gồm:
• Các tình huống chính và diễn biến quan trọng trong chương
• Sự phát triển của cốt truyện và mối quan hệ giữa các nhân vật
• Những chi tiết đáng chú ý, bất ngờ hoặc bước ngoặt

Độ dài: 3-5 câu. Giọng văn: tự nhiên, dễ hiểu, dạng gạch đầu dòng nếu phù hợp. Duy trì giọng văn trong nội dung gốc.

Tránh:
• Không đưa ra ý kiến cá nhân hoặc phân tích sâu
• Không sao chép nguyên văn từ nội dung gốc
• Không sử dụng ngôn ngữ quá phức tạp hoặc học thuật

Nội dung chương:
${content}`;
