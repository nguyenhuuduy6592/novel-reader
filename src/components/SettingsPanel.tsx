import { ReadingThemeConfig, AiSettings } from '@/types';
import { type AiProvider, type SummaryLength } from '@/constants/ai';
import { ThemeSelect } from '@/components/ThemeSelect';
import {
  BACKGROUND_OPTIONS,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  PADDING_OPTIONS,
} from '@/constants/theme';
import { AI_PROVIDER_OPTIONS, AI_PROVIDERS, AI_SUMMARY_LENGTH_OPTIONS } from '@/constants/ai';

interface SettingsPanelProps {
  themeConfig: ReadingThemeConfig;
  onThemeConfigChange: (config: ReadingThemeConfig) => void;
  aiSettings: AiSettings;
  onAiSettingsChange: (settings: AiSettings) => void;
  onProviderConfigUpdate: <K extends keyof AiSettings['providers'][AiProvider]>(
    provider: AiProvider,
    key: K,
    value: AiSettings['providers'][AiProvider][K]
  ) => void;
}

export function SettingsPanel({
  themeConfig,
  onThemeConfigChange,
  aiSettings,
  onAiSettingsChange,
  onProviderConfigUpdate,
}: SettingsPanelProps) {
  return (
    <div
      id="settings-panel"
      className="mb-6 p-4 bg-gray-100 rounded-lg animate-in slide-in-from-top-2 duration-200 ease-out"
    >
      <h3 className="font-bold mb-3 text-lg">Reading Settings</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-4">
        <ThemeSelect
          label="Background"
          value={themeConfig.background}
          onChange={(v) => onThemeConfigChange({ ...themeConfig, background: v as ReadingThemeConfig['background'] })}
          options={BACKGROUND_OPTIONS}
        />
        <ThemeSelect
          label="Font"
          value={themeConfig.fontFamily}
          onChange={(v) => onThemeConfigChange({ ...themeConfig, fontFamily: v as ReadingThemeConfig['fontFamily'] })}
          options={FONT_OPTIONS}
        />
        <ThemeSelect
          label="Size"
          value={themeConfig.fontSize}
          onChange={(v) => onThemeConfigChange({ ...themeConfig, fontSize: parseInt(v) })}
          options={FONT_SIZE_OPTIONS}
        />
        <ThemeSelect
          label="Line Height"
          value={themeConfig.lineHeight}
          onChange={(v) => onThemeConfigChange({ ...themeConfig, lineHeight: parseFloat(v) })}
          options={LINE_HEIGHT_OPTIONS}
        />
        <ThemeSelect
          label="Padding"
          value={themeConfig.padding}
          onChange={(v) => onThemeConfigChange({ ...themeConfig, padding: v as ReadingThemeConfig['padding'] })}
          options={PADDING_OPTIONS}
        />
      </div>

      <h4 className="font-bold mb-2 text-md mt-4">AI Summary Settings</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <ThemeSelect
          label="AI Provider"
          value={aiSettings.provider}
          onChange={(v) => onAiSettingsChange({ ...aiSettings, provider: v as AiProvider })}
          options={AI_PROVIDER_OPTIONS}
        />
        <div>
          <label className="block mb-1 font-medium">{AI_PROVIDERS[aiSettings.provider].label} API Key</label>
          <input
            type="password"
            value={aiSettings.providers[aiSettings.provider].apiKey}
            onChange={(e) => onProviderConfigUpdate(aiSettings.provider, 'apiKey', e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder={AI_PROVIDERS[aiSettings.provider].placeholder}
          />
        </div>
        <ThemeSelect
          label="AI Model"
          value={aiSettings.providers[aiSettings.provider].model}
          onChange={(v) => onProviderConfigUpdate(aiSettings.provider, 'model', v)}
          options={AI_PROVIDERS[aiSettings.provider].modelOptions}
        />
        <ThemeSelect
          label="Summary Length"
          value={aiSettings.summaryLength}
          onChange={(v) => onAiSettingsChange({ ...aiSettings, summaryLength: v as SummaryLength })}
          options={AI_SUMMARY_LENGTH_OPTIONS}
        />
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer p-2">
            <input
              type="checkbox"
              checked={aiSettings.autoGenerate}
              onChange={(e) => onAiSettingsChange({ ...aiSettings, autoGenerate: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="font-medium">Auto-generate summary</span>
          </label>
        </div>
      </div>
    </div>
  );
}
