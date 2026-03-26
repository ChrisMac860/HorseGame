import type { HostSettings } from '../lib/types';

interface HostSettingsControlsProps {
  settings: HostSettings;
  onToggle: (key: keyof HostSettings, value: boolean) => void;
}

const SETTING_COPY: Array<{
  key: keyof HostSettings;
  title: string;
  description: string;
}> = [
  {
    key: 'shotsEnabled',
    title: 'Shots enabled',
    description: 'Lets players include a shot in their round bet.'
  },
  {
    key: 'shotOnlyBetsAllowed',
    title: 'Shot-only bets allowed',
    description: 'Allows 0 segments when a player wants to risk only a shot.'
  },
  {
    key: 'cheekySuggestions',
    title: 'Cheeky suggestion messages',
    description: 'Shows a light nudge when a winner hits the receive cap.'
  },
  {
    key: 'reducedRaceMotion',
    title: 'Reduced race motion',
    description: 'Tones down the race bounce and jumps without changing the result.'
  }
];

export function HostSettingsControls({
  settings,
  onToggle
}: HostSettingsControlsProps) {
  return (
    <div className="settings-grid">
      {SETTING_COPY.map((setting) => (
        <button
          key={setting.key}
          type="button"
          className={`toggle-card ${settings[setting.key] ? 'is-on' : ''}`}
          onClick={() => onToggle(setting.key, !settings[setting.key])}
          aria-pressed={settings[setting.key]}
        >
          <span className="toggle-card__top">
            <span>{setting.title}</span>
            <span className="toggle-pill">
              {settings[setting.key] ? 'On' : 'Off'}
            </span>
          </span>
          <span className="toggle-card__description">{setting.description}</span>
        </button>
      ))}
    </div>
  );
}
