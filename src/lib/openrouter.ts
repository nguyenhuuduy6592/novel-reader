import { AI_SUMMARY_PROMPT, SummaryLength, AiProvider } from '@/constants/ai';

export interface GenerateSummaryOptions {
  content: string;
  apiKey: string;
  provider: AiProvider;
  model: string;
  length?: SummaryLength;
}

export interface GenerateSummaryError {
  error?: string | { message?: string };
  message?: string;
}

// OpenRouter API function
async function generateSummaryWithOpenRouter({
  content,
  apiKey,
  model,
  length = 'medium',
}: Omit<GenerateSummaryOptions, 'provider'>): Promise<string> {
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
      const errorData: GenerateSummaryError = await response.json();

      // Handle various error response formats from OpenRouter
      if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      } else if (typeof errorData.error === 'object' && errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else {
        errorMessage = JSON.stringify(errorData);
      }

      // Add helpful guidance for common errors
      if (errorMessage.includes('data policy') || errorMessage.includes('Free model publication')) {
        errorMessage += '\n\nTo fix this, go to https://openrouter.ai/settings/privacy and enable "Free model publication" in your data policy settings.';
      }
    } catch {
      // If we can't parse the error, use the status text
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

// Google AI API function
async function generateSummaryWithGoogle({
  content,
  apiKey,
  model,
  length = 'medium',
}: Omit<GenerateSummaryOptions, 'provider'>): Promise<string> {
  const prompt = AI_SUMMARY_PROMPT(content, length);

  // Google AI uses different API format
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
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

// Main function that routes to the appropriate provider
export async function generateSummary({
  content,
  apiKey,
  provider,
  model,
  length = 'medium',
}: GenerateSummaryOptions): Promise<string> {
  if (provider === 'google') {
    return generateSummaryWithGoogle({ content, apiKey, model, length });
  }
  return generateSummaryWithOpenRouter({ content, apiKey, model, length });
}
