import type { AiSettings, AiProviderConfig } from '@/types';

export interface ThemeOption {
  value: string;
  label: string;
}

export type SummaryLength = 'short' | 'medium';

export type AiProvider = 'openrouter' | 'google' | 'zai';

export interface GenerateSummaryOptions {
  content: string;
  apiKey: string;
  model: string;
  length?: SummaryLength;
}

export interface ProviderApiFunction {
  (options: GenerateSummaryOptions): Promise<string>;
}

// Provider-specific configuration
export const AI_PROVIDERS = {
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'openai/gpt-oss-120b:free',
    placeholder: 'sk-or-...',
    modelOptions: [
      { value: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (Free)' },
      { value: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air (Free)' },
      { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash Exp (Free)' },
      { value: 'deepseek/deepseek-r1-0528:free', label: 'DeepSeek R1 (Free)' },
    ] as const,
  },
  google: {
    label: 'Google AI',
    defaultModel: 'gemini-2.5-flash-lite',
    placeholder: 'AIza...',
    modelOptions: [
      { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ] as const,
  },
  zai: {
    label: 'Z.ai (GLM)',
    defaultModel: 'glm-4.5-air',
    placeholder: 'Your Z.ai API key',
    modelOptions: [
      { value: 'glm-4.7', label: 'GLM 4.7' },
      { value: 'glm-4.6', label: 'GLM 4.6' },
      { value: 'glm-4.5', label: 'GLM 4.5' },
      { value: 'glm-4.5-air', label: 'GLM 4.5 Air' }
    ] as const,
  },
} as const satisfies Record<AiProvider, { label: string; defaultModel: string; placeholder: string; modelOptions: readonly { value: string; label: string }[] }>;

// Provider API implementations
async function generateWithOpenRouter({ content, apiKey, model, length = 'medium' }: GenerateSummaryOptions): Promise<string> {
  const prompt = AI_SUMMARY_PROMPT(content, length);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
      'X-Title': 'Novel Reader',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      } else if (typeof errorData.error === 'object' && errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else {
        errorMessage = JSON.stringify(errorData);
      }
      if (errorMessage.includes('data policy') || errorMessage.includes('Free model publication')) {
        errorMessage += '\n\nTo fix this, go to https://openrouter.ai/settings/privacy and enable "Free model publication" in your data policy settings.';
      }
    } catch {
      errorMessage = response.statusText || `API error: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from OpenRouter API');
  }
  return data.choices[0].message.content;
}

async function generateWithGoogle({ content, apiKey, model, length = 'medium' }: GenerateSummaryOptions): Promise<string> {
  const prompt = AI_SUMMARY_PROMPT(content, length);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!response.ok) {
    let errorMessage = `Google AI API error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else {
        errorMessage = JSON.stringify(errorData);
      }
    } catch {
      errorMessage = response.statusText || `Google AI API error: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid response from Google AI API');
  }
  return data.candidates[0].content.parts[0].text;
}

async function generateWithZai({ content, apiKey, model, length = 'medium' }: GenerateSummaryOptions): Promise<string> {
  const prompt = AI_SUMMARY_PROMPT(content, length);

  const response = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    let errorMessage = `Z.ai API error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      } else if (typeof errorData.error === 'object' && errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else {
        errorMessage = JSON.stringify(errorData);
      }
    } catch {
      errorMessage = response.statusText || `Z.ai API error: ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from Z.ai API');
  }
  return data.choices[0].message.content;
}

// Central registry of provider API functions
export const AI_PROVIDER_APIS: Record<AiProvider, ProviderApiFunction> = {
  openrouter: generateWithOpenRouter,
  google: generateWithGoogle,
  zai: generateWithZai,
};

export const AI_PROVIDER_OPTIONS = Object.entries(AI_PROVIDERS).map(([value, { label }]) => ({ value, label }));

export const DEFAULT_AI_PROVIDER: AiProvider = 'openrouter';

// Helper to create default providers config (for settings initialization)
export const createDefaultProvidersConfig = (): Record<AiProvider, AiProviderConfig> =>
  Object.keys(AI_PROVIDERS).reduce((acc, provider) => {
    acc[provider as AiProvider] = {
      apiKey: '',
      model: AI_PROVIDERS[provider as AiProvider].defaultModel,
    };
    return acc;
  }, {} as Record<AiProvider, AiProviderConfig>);

export const AI_SUMMARY_LENGTH_OPTIONS = [
  { value: 'short', label: 'Short (2-3 sentences)' },
  { value: 'medium', label: 'Medium (4-5 sentences)' },
] as const;

export const DEFAULT_AI_SUMMARY_LENGTH: SummaryLength = 'short';

// Default AI settings (for settings initialization)
export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: DEFAULT_AI_PROVIDER,
  providers: createDefaultProvidersConfig(),
  autoGenerate: false,
  summaryLength: DEFAULT_AI_SUMMARY_LENGTH,
};

const SHORT_PROMPT = (content: string) =>
  `Tóm tắt nội dung chương truyện sau trong 2-3 câu, viết thành một đoạn văn liền mạch tự nhiên như đang kể lại cho người khác nghe.

${content}

QUAN TRỌNG:
• Phải trả lời bằng TIẾNG VIỆT tự nhiên, không được dùng tiếng Anh hay ngôn ngữ khác
• Viết ngay câu tóm tắt, không viết lời mở đầu như "Dưới đây là tóm tắt" hay "Tóm lại"
• Giọng văn phải tự nhiên như người Việt đang kể chuyện
• Chia thành đoạn văn riêng biệt khi có sự thay đổi về chủ đề hoặc bối cảnh, giúp dễ đọc hơn`;

const MEDIUM_PROMPT = (content: string) =>
  `Tóm tắt nội dung chương truyện sau trong 4-5 câu:

${content}

Tóm tắt nên bao gồm:
• Các tình huống chính và diễn biến quan trọng trong chương
• Sự phát triển của cốt truyện và mối quan hệ giữa các nhân vật
• Những chi tiết đáng chú ý, bất ngờ hoặc bước ngoặt

QUAN TRỌNG:
• Phải trả lời bằng TIẾNG VIỆT tự nhiên, không được dùng tiếng Anh hay ngôn ngữ khác
• Chia tóm tắt thành nhiều đoạn văn, mỗi đoạn tập trung vào một khía cạnh hoặc sự kiện chính
• Giọng văn tự nhiên, dễ hiểu, duy trì giọng văn trong nội dung gốc
• Giọng văn phải tự nhiên như người Việt đang kể chuyện
• Không viết lời mở đầu hay giải thích
• Sử dụng xuống dòng để tạo đoạn văn mới khi chuyển sang ý hoặc sự kiện khác, giúp dễ đọc hơn

Tránh:
• Không đưa ra ý kiến cá nhân hoặc phân tích sâu
• Không sao chép nguyên văn từ nội dung gốc
• Không sử dụng ngôn ngữ quá phức tạp hoặc học thuật
• Không viết tất cả thành một đoạn văn duy nhất
`;

export const AI_SUMMARY_PROMPT = (content: string, length: SummaryLength = 'short'): string => {
  switch (length) {
    case 'medium':
      return MEDIUM_PROMPT(content);
    case 'short':
    default:
      return SHORT_PROMPT(content);
  }
};
