import { PLAYER_COLOURS } from '../data/playerColours';
import { MAX_PLAYERS, MIN_PLAYERS } from '../lib/constants';
import { validateSetupDraft } from '../lib/game';
import type { HostSettings, SetupDraft } from '../lib/types';
import { HostSettingsControls } from './HostSettingsControls';

interface SetupViewProps {
  setupDraft: SetupDraft;
  hostSettingsDraft: HostSettings;
  onBack: () => void;
  onSetPlayerCount: (count: number) => void;
  onSetPlayerName: (index: number, name: string) => void;
  onSetPlayerColour: (index: number, colour: string) => void;
  onToggleSetting: (key: keyof HostSettings, value: boolean) => void;
  onStartSession: () => void;
}

export function SetupView({
  setupDraft,
  hostSettingsDraft,
  onBack,
  onSetPlayerCount,
  onSetPlayerName,
  onSetPlayerColour,
  onToggleSetting,
  onStartSession
}: SetupViewProps) {
  const validation = validateSetupDraft(setupDraft);

  return (
    <section className="setup-shell">
      <div className="setup-main panel">
        <div className="panel__header">
          <p className="eyebrow">Session setup</p>
          <h1>Get the table ready</h1>
        </div>

        <div className="stepper-row">
          <label htmlFor="player-count">Player count</label>
          <div className="stepper-controls">
            <button
              type="button"
              className="button button--ghost"
              onClick={() => onSetPlayerCount(setupDraft.players.length - 1)}
              disabled={setupDraft.players.length <= MIN_PLAYERS}
            >
              -
            </button>
            <input
              id="player-count"
              type="number"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              value={setupDraft.players.length}
              onChange={(event) => onSetPlayerCount(Number(event.target.value))}
            />
            <button
              type="button"
              className="button button--ghost"
              onClick={() => onSetPlayerCount(setupDraft.players.length + 1)}
              disabled={setupDraft.players.length >= MAX_PLAYERS}
            >
              +
            </button>
          </div>
        </div>

        <div className="player-form-list">
          {setupDraft.players.map((player, index) => (
            <article className="player-form-card" key={`${player.name}-${index}`}>
              <div className="player-form-card__head">
                <h2>Player {index + 1}</h2>
                <span className="colour-dot" style={{ backgroundColor: player.colour }} />
              </div>

              <label className="field-group">
                <span>Name</span>
                <input
                  type="text"
                  maxLength={24}
                  value={player.name}
                  onChange={(event) => onSetPlayerName(index, event.target.value)}
                />
              </label>

              <div className="field-group">
                <span>Colour</span>
                <div className="colour-grid">
                  {PLAYER_COLOURS.map((colour) => (
                    <button
                      type="button"
                      key={colour}
                      className={`colour-swatch ${
                        colour === player.colour ? 'is-selected' : ''
                      }`}
                      style={{ backgroundColor: colour }}
                      onClick={() => onSetPlayerColour(index, colour)}
                      aria-label={`Select ${colour} for Player ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {validation.errors.length > 0 ? (
          <div className="validation-list">
            {validation.errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}

        <div className="action-row">
          <button type="button" className="button button--secondary" onClick={onBack}>
            Back
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={onStartSession}
            disabled={!validation.isValid}
          >
            Start game
          </button>
        </div>
      </div>

      <aside className="panel">
        <div className="panel__header">
          <p className="eyebrow">Host settings</p>
          <h2>Use these rules</h2>
        </div>
        <HostSettingsControls settings={hostSettingsDraft} onToggle={onToggleSetting} />
      </aside>
    </section>
  );
}
