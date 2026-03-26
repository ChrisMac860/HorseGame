import { APP_NAME } from '../lib/constants';
import type { HostSettings } from '../lib/types';
import { HostSettingsControls } from './HostSettingsControls';

interface HomeViewProps {
  hasSavedSession: boolean;
  hostSettingsDraft: HostSettings;
  loadNotice: string | null;
  onResume: () => void;
  onStartFresh: () => void;
  onOpenSetup: () => void;
  onDismissLoadNotice: () => void;
  onToggleSetting: (key: keyof HostSettings, value: boolean) => void;
}

export function HomeView({
  hasSavedSession,
  hostSettingsDraft,
  loadNotice,
  onResume,
  onStartFresh,
  onOpenSetup,
  onDismissLoadNotice,
  onToggleSetting
}: HomeViewProps) {
  return (
    <section className="hero-shell">
      <div className="hero-copy">
        <p className="eyebrow">Private prototype</p>
        <h1>{APP_NAME}</h1>
        <p className="hero-copy__lede">
          Shared-screen horse racing chaos for one room, one device, and absolutely
          no backend.
        </p>

        {loadNotice ? (
          <div className="notice-card">
            <span>{loadNotice}</span>
            <button type="button" onClick={onDismissLoadNotice}>
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="hero-actions">
          {hasSavedSession ? (
            <button type="button" className="button button--primary" onClick={onResume}>
              Resume session
            </button>
          ) : (
            <button
              type="button"
              className="button button--primary"
              onClick={onOpenSetup}
            >
              Start session
            </button>
          )}

          <button
            type="button"
            className="button button--secondary"
            onClick={hasSavedSession ? onStartFresh : onOpenSetup}
          >
            Start fresh
          </button>
        </div>

        <ul className="hero-rules">
          <li>2 to 10 players on one shared screen</li>
          <li>Full local session persistence with resume support</li>
          <li>Undo is available while the round is still open</li>
        </ul>
      </div>

      <div className="home-card-stack">
        <section className="panel">
          <div className="panel__header">
            <p className="eyebrow">Host settings</p>
            <h2>Round defaults</h2>
          </div>
          <HostSettingsControls
            settings={hostSettingsDraft}
            onToggle={onToggleSetting}
          />
        </section>

        <section className="panel panel--compact">
          <div className="panel__header">
            <p className="eyebrow">Flow</p>
            <h2>How a round runs</h2>
          </div>
          <ol className="phase-list">
            <li>Players bet openly in turn.</li>
            <li>The race runs to a pre-picked winner.</li>
            <li>Winners assign punishment one by one.</li>
            <li>Punishment is resolved and the round locks.</li>
          </ol>
        </section>
      </div>
    </section>
  );
}
