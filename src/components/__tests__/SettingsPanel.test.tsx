import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsPanel } from '@/components/SettingsPanel'
import { ReadingThemeConfig, AiSettings } from '@/types'
import { AiProvider } from '@/constants/ai'
import { AI_PROVIDERS } from '@/constants/ai'

const mockThemeConfig: ReadingThemeConfig = {
  background: 'sepia',
  fontFamily: 'sans-serif',
  fontSize: 18,
  lineHeight: 1.6,
  padding: 'compact'
}

const mockAiSettings: AiSettings = {
  provider: 'openrouter' as AiProvider,
  providers: {
    openrouter: { apiKey: '', model: 'deepseek/deepseek-chat' },
    google: { apiKey: '', model: 'gemini-2.0-flash-exp' }
  },
  autoGenerate: false,
  summaryLength: 'medium'
}

describe('SettingsPanel', () => {
  it('renders reading settings section', () => {
    const onThemeConfigChange = jest.fn()
    const onAiSettingsChange = jest.fn()
    const onProviderConfigUpdate = jest.fn()

    render(
      <SettingsPanel
        themeConfig={mockThemeConfig}
        onThemeConfigChange={onThemeConfigChange}
        aiSettings={mockAiSettings}
        onAiSettingsChange={onAiSettingsChange}
        onProviderConfigUpdate={onProviderConfigUpdate}
      />
    )

    expect(screen.getByText('Reading Settings')).toBeInTheDocument()
    expect(screen.getByText('Background')).toBeInTheDocument()
    expect(screen.getByText('Font')).toBeInTheDocument()
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('Line Height')).toBeInTheDocument()
    expect(screen.getByText('Padding')).toBeInTheDocument()
  })

  it('renders AI summary settings section', () => {
    const onThemeConfigChange = jest.fn()
    const onAiSettingsChange = jest.fn()
    const onProviderConfigUpdate = jest.fn()

    render(
      <SettingsPanel
        themeConfig={mockThemeConfig}
        onThemeConfigChange={onThemeConfigChange}
        aiSettings={mockAiSettings}
        onAiSettingsChange={onAiSettingsChange}
        onProviderConfigUpdate={onProviderConfigUpdate}
      />
    )

    expect(screen.getByText('AI Summary Settings')).toBeInTheDocument()
    expect(screen.getByText('AI Provider')).toBeInTheDocument()
    expect(screen.getByText(/API Key/)).toBeInTheDocument()
    expect(screen.getByText('AI Model')).toBeInTheDocument()
    expect(screen.getByText('Summary Length')).toBeInTheDocument()
    expect(screen.getByText('Auto-generate summary')).toBeInTheDocument()
  })

  it('shows correct provider label for API key', () => {
    const onProviderConfigUpdate = jest.fn()

    render(
      <SettingsPanel
        themeConfig={mockThemeConfig}
        onThemeConfigChange={jest.fn()}
        aiSettings={mockAiSettings}
        onAiSettingsChange={jest.fn()}
        onProviderConfigUpdate={onProviderConfigUpdate}
      />
    )

    expect(screen.getByText(`${AI_PROVIDERS.openrouter.label} API Key`)).toBeInTheDocument()
  })

  it('calls onThemeConfigChange when background is changed', () => {
    const onThemeConfigChange = jest.fn()

    const { container } = render(
      <SettingsPanel
        themeConfig={mockThemeConfig}
        onThemeConfigChange={onThemeConfigChange}
        aiSettings={mockAiSettings}
        onAiSettingsChange={jest.fn()}
        onProviderConfigUpdate={jest.fn()}
      />
    )

    // Find all selects and pick the first one (Background)
    const selects = container.querySelectorAll('select')
    const backgroundSelect = selects[0]
    fireEvent.change(backgroundSelect, { target: { value: 'dark' } })

    expect(onThemeConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ background: 'dark' })
    )
  })

  it('calls onProviderConfigUpdate when API key is changed', () => {
    const onProviderConfigUpdate = jest.fn()

    const { container } = render(
      <SettingsPanel
        themeConfig={mockThemeConfig}
        onThemeConfigChange={jest.fn()}
        aiSettings={mockAiSettings}
        onAiSettingsChange={jest.fn()}
        onProviderConfigUpdate={onProviderConfigUpdate}
      />
    )

    // Find API key input (first input)
    const apiKeyInput = container.querySelector('input[type="password"]') as HTMLInputElement
    fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } })

    expect(onProviderConfigUpdate).toHaveBeenCalledWith('openrouter', 'apiKey', 'new-api-key')
  })

  it('calls onAiSettingsChange when auto-generate checkbox is toggled', () => {
    const onAiSettingsChange = jest.fn()

    render(
      <SettingsPanel
        themeConfig={mockThemeConfig}
        onThemeConfigChange={jest.fn()}
        aiSettings={mockAiSettings}
        onAiSettingsChange={onAiSettingsChange}
        onProviderConfigUpdate={jest.fn()}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(onAiSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ autoGenerate: true })
    )
  })
})
