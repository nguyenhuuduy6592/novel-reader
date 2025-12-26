import { AI_SUMMARY_PROMPT, SummaryLength } from '@/constants/ai';

export interface GenerateSummaryOptions {
  content: string;
  apiKey: string;
  model: string;
  length?: SummaryLength;
}

export interface GenerateSummaryError {
  error?: string | { message?: string };
  message?: string;
}

// Client-side function to call OpenRouter API directly
export async function generateSummary({
  content,
  apiKey,
  model,
  length = 'medium',
}: GenerateSummaryOptions): Promise<string> {
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
