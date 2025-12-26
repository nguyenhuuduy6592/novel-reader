import { AI_PROVIDER_APIS, type GenerateSummaryOptions, type AiProvider } from '@/constants/ai';

export type { GenerateSummaryOptions };

/**
 * Generate AI summary using the specified provider.
 * This is the main entry point for AI summary generation.
 */
export async function generateSummary(options: GenerateSummaryOptions & { provider: AiProvider }): Promise<string> {
  const { provider, ...apiOptions } = options;
  const apiFunction = AI_PROVIDER_APIS[provider];
  return apiFunction(apiOptions);
}
