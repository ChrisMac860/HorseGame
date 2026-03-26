import {
  advanceAfterRoundSummary,
  addAssignment,
  beginAssignments,
  confirmAssignmentWinner,
  confirmPunishmentPhase,
  confirmSegmentsTaken,
  confirmShotsTaken,
  createDefaultAppState,
  openExtraBeerDuringPunishment,
  placeBet,
  revealRaceResult,
  startRace,
  tapOutPlayer,
  updateSetupPlayerCount
} from './game';
import { DEFAULT_HOST_SETTINGS, HISTORY_LIMIT } from './constants';
import type {
  AppState,
  Assignment,
  Bet,
  HostSettings,
  RoundState,
  SessionState
} from './types';

export type AppAction =
  | { type: 'resume-session' }
  | { type: 'open-setup' }
  | { type: 'go-home' }
  | { type: 'start-fresh' }
  | { type: 'clear-saved-session' }
  | { type: 'dismiss-load-notice' }
  | { type: 'set-player-count'; playerCount: number }
  | { type: 'set-player-name'; index: number; name: string }
  | { type: 'set-player-colour'; index: number; colour: string }
  | { type: 'set-host-setting'; key: keyof HostSettings; value: boolean }
  | { type: 'start-session'; session: SessionState }
  | { type: 'place-bet'; bet: Bet }
  | { type: 'undo' }
  | { type: 'start-race' }
  | { type: 'finish-race' }
  | { type: 'begin-assignments' }
  | { type: 'add-assignment'; assignment: Assignment }
  | { type: 'confirm-assignment-winner' }
  | { type: 'open-extra-beer'; playerId: string }
  | { type: 'confirm-segments'; playerId: string }
  | { type: 'confirm-shots'; playerId: string }
  | { type: 'tap-out'; playerId: string }
  | { type: 'confirm-punishments' }
  | { type: 'advance-after-summary'; nextRound: RoundState | null };

const cloneSession = (session: SessionState) => structuredClone(session);

const pushHistory = (state: AppState): AppState => {
  if (!state.session) {
    return state;
  }

  const nextHistory = [...state.history, cloneSession(state.session)].slice(
    -HISTORY_LIMIT
  );

  return {
    ...state,
    history: nextHistory
  };
};

const withHistory = (
  state: AppState,
  updater: (session: SessionState) => SessionState
): AppState => {
  if (!state.session) {
    return state;
  }

  const nextState = pushHistory(state);

  return {
    ...nextState,
    session: updater(nextState.session as SessionState),
    view: 'session'
  };
};

export const createHydratedState = (
  persistedState?: Partial<AppState> & { hostSettingsDraft?: HostSettings }
): AppState => {
  const baseState = createDefaultAppState();

  return {
    ...baseState,
    hostSettingsDraft: persistedState?.hostSettingsDraft ?? DEFAULT_HOST_SETTINGS,
    session: persistedState?.session ?? null,
    history: persistedState?.history ?? [],
    loadNotice: persistedState?.loadNotice ?? null
  };
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'resume-session':
      return state.session
        ? {
            ...state,
            view: 'session'
          }
        : state;

    case 'open-setup':
      return {
        ...state,
        view: 'setup'
      };

    case 'go-home':
      return {
        ...state,
        view: 'home'
      };

    case 'dismiss-load-notice':
      return {
        ...state,
        loadNotice: null
      };

    case 'start-fresh':
      return {
        ...state,
        view: 'setup',
        session: null,
        history: []
      };

    case 'clear-saved-session':
      return {
        ...state,
        view: 'home',
        session: null,
        history: []
      };

    case 'set-player-count':
      return {
        ...state,
        setupDraft: updateSetupPlayerCount(state.setupDraft, action.playerCount)
      };

    case 'set-player-name':
      return {
        ...state,
        setupDraft: {
          players: state.setupDraft.players.map((player, index) =>
            index === action.index ? { ...player, name: action.name } : player
          )
        }
      };

    case 'set-player-colour':
      return {
        ...state,
        setupDraft: {
          players: state.setupDraft.players.map((player, index) =>
            index === action.index ? { ...player, colour: action.colour } : player
          )
        }
      };

    case 'set-host-setting':
      return {
        ...state,
        hostSettingsDraft: {
          ...state.hostSettingsDraft,
          [action.key]: action.value
        }
      };

    case 'start-session':
      return {
        ...state,
        view: 'session',
        session: action.session,
        history: []
      };

    case 'place-bet':
      return withHistory(state, (session) => placeBet(session, action.bet));

    case 'undo': {
      if (state.history.length === 0) {
        return state;
      }

      const previousSession = state.history[state.history.length - 1];

      return {
        ...state,
        session: previousSession,
        history: state.history.slice(0, -1),
        view: 'session'
      };
    }

    case 'start-race':
      return state.session
        ? {
            ...state,
            view: 'session',
            history: [],
            session: startRace(state.session)
          }
        : state;

    case 'finish-race':
      return state.session
        ? {
            ...state,
            session: revealRaceResult(state.session)
          }
        : state;

    case 'begin-assignments':
      return withHistory(state, (session) => beginAssignments(session));

    case 'add-assignment':
      return withHistory(state, (session) => addAssignment(session, action.assignment));

    case 'confirm-assignment-winner':
      return withHistory(state, (session) => confirmAssignmentWinner(session));

    case 'open-extra-beer':
      return withHistory(state, (session) =>
        openExtraBeerDuringPunishment(session, action.playerId)
      );

    case 'confirm-segments':
      return withHistory(state, (session) =>
        confirmSegmentsTaken(session, action.playerId)
      );

    case 'confirm-shots':
      return withHistory(state, (session) => confirmShotsTaken(session, action.playerId));

    case 'tap-out':
      return withHistory(state, (session) => tapOutPlayer(session, action.playerId));

    case 'confirm-punishments':
      return state.session
        ? {
            ...state,
            history: [],
            session: confirmPunishmentPhase(state.session)
          }
        : state;

    case 'advance-after-summary':
      return state.session
        ? {
            ...state,
            history: [],
            session: advanceAfterRoundSummary(state.session, action.nextRound)
          }
        : state;

    default:
      return state;
  }
};
