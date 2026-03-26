import { useEffect, useReducer } from 'react';
import { BettingView } from './components/BettingView';
import { FinalLeaderboardView } from './components/FinalLeaderboardView';
import { HomeView } from './components/HomeView';
import { PunishmentView } from './components/PunishmentView';
import { RaceView } from './components/RaceView';
import { ResultsAssignmentView } from './components/ResultsAssignmentView';
import { RoundSummaryView } from './components/RoundSummaryView';
import { SetupView } from './components/SetupView';
import { SidebarRoster } from './components/SidebarRoster';
import { APP_NAME } from './lib/constants';
import {
  createSessionFromSetup,
  getCurrentRound,
  getNextRound
} from './lib/game';
import { clearPersistedState, loadPersistedState, savePersistedState } from './lib/persistence';
import { appReducer, createHydratedState } from './lib/reducer';
import type { HostSettings, SessionState } from './lib/types';

const PHASE_LABELS: Record<SessionState['phase'], string> = {
  betting: 'Betting',
  race: 'Race',
  results: 'Results',
  assignment: 'Assignments',
  punishment: 'Punishment',
  roundSummary: 'Round summary',
  final: 'Final leaderboard'
};

const initialiseState = () => {
  const { persistedState, loadNotice } = loadPersistedState();
  return createHydratedState({
    ...(persistedState ?? {}),
    loadNotice
  });
};

function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, initialiseState);

  useEffect(() => {
    savePersistedState(state);
  }, [state]);

  useEffect(() => {
    if (state.session || state.history.length > 0) {
      return;
    }

    clearPersistedState();
    savePersistedState(state);
  }, [state]);

  const session = state.session;
  const hasSavedSession = Boolean(session);
  const canUndo =
    session !== null &&
    state.history.length > 0 &&
    session.phase !== 'race' &&
    session.phase !== 'roundSummary' &&
    session.phase !== 'final';

  const toggleSetting = (key: keyof HostSettings, value: boolean) => {
    dispatch({ type: 'set-host-setting', key, value });
  };

  const startSession = () => {
    const nextSession = createSessionFromSetup(
      state.setupDraft,
      state.hostSettingsDraft
    );
    dispatch({ type: 'start-session', session: nextSession });
  };

  const advanceAfterSummary = () => {
    if (!session) {
      return;
    }

    dispatch({
      type: 'advance-after-summary',
      nextRound: getNextRound(session)
    });
  };

  const renderMainView = () => {
    if (state.view === 'home') {
      return (
        <HomeView
          hasSavedSession={hasSavedSession}
          hostSettingsDraft={state.hostSettingsDraft}
          loadNotice={state.loadNotice}
          onResume={() => dispatch({ type: 'resume-session' })}
          onStartFresh={() => dispatch({ type: 'start-fresh' })}
          onOpenSetup={() => dispatch({ type: 'open-setup' })}
          onDismissLoadNotice={() => dispatch({ type: 'dismiss-load-notice' })}
          onToggleSetting={toggleSetting}
        />
      );
    }

    if (state.view === 'setup') {
      return (
        <SetupView
          setupDraft={state.setupDraft}
          hostSettingsDraft={state.hostSettingsDraft}
          onBack={() => dispatch({ type: 'go-home' })}
          onSetPlayerCount={(count) =>
            dispatch({ type: 'set-player-count', playerCount: count })
          }
          onSetPlayerName={(index, name) =>
            dispatch({ type: 'set-player-name', index, name })
          }
          onSetPlayerColour={(index, colour) =>
            dispatch({ type: 'set-player-colour', index, colour })
          }
          onToggleSetting={toggleSetting}
          onStartSession={startSession}
        />
      );
    }

    if (!session) {
      return null;
    }

    switch (session.phase) {
      case 'betting':
        return (
          <BettingView
            session={session}
            onPlaceBet={(bet) => dispatch({ type: 'place-bet', bet })}
            onStartRace={() => dispatch({ type: 'start-race' })}
          />
        );

      case 'race':
        return (
          <RaceView
            session={session}
            onRevealResults={() => dispatch({ type: 'finish-race' })}
          />
        );

      case 'results':
      case 'assignment':
        return (
          <ResultsAssignmentView
            session={session}
            onBeginAssignments={() => dispatch({ type: 'begin-assignments' })}
            onAddAssignment={(assignment) =>
              dispatch({ type: 'add-assignment', assignment })
            }
            onConfirmWinner={() => dispatch({ type: 'confirm-assignment-winner' })}
          />
        );

      case 'punishment':
        return (
          <PunishmentView
            session={session}
            onOpenExtraBeer={(playerId) =>
              dispatch({ type: 'open-extra-beer', playerId })
            }
            onConfirmSegments={(playerId) =>
              dispatch({ type: 'confirm-segments', playerId })
            }
            onConfirmShots={(playerId) =>
              dispatch({ type: 'confirm-shots', playerId })
            }
            onTapOut={(playerId) => dispatch({ type: 'tap-out', playerId })}
            onConfirmRound={() => dispatch({ type: 'confirm-punishments' })}
          />
        );

      case 'roundSummary':
        return <RoundSummaryView session={session} onContinue={advanceAfterSummary} />;

      case 'final':
        return (
          <FinalLeaderboardView
            session={session}
            onStartFresh={() => dispatch({ type: 'start-fresh' })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Shared-screen party game</p>
          <h1>{APP_NAME}</h1>
        </div>

        {session && state.view === 'session' ? (
          <div className="app-header__meta">
            <span className="status-chip">
              Round {getCurrentRound(session).roundNumber}
            </span>
            <span className="status-chip">{PHASE_LABELS[session.phase]}</span>
            {canUndo ? (
              <button
                type="button"
                className="button button--ghost"
                onClick={() => dispatch({ type: 'undo' })}
              >
                Undo last action
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {state.view === 'session' && session ? (
        <main className="session-layout">
          <div className="session-layout__main">{renderMainView()}</div>
          <SidebarRoster session={session} />
        </main>
      ) : (
        <main>{renderMainView()}</main>
      )}
    </div>
  );
}

export default App;
