import { HORSE_NAMES } from '../data/horseNames';
import { STORAGE_KEY, STORAGE_VERSION } from './constants';
import type { AppState, HostSettings, PersistedAppState, SessionState } from './types';

const CURRENT_HORSE_NAMES = new Set<string>(HORSE_NAMES);

const isHostSettings = (value: unknown): value is HostSettings => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.shotsEnabled === 'boolean' &&
    typeof record.shotOnlyBetsAllowed === 'boolean' &&
    typeof record.cheekySuggestions === 'boolean' &&
    typeof record.reducedRaceMotion === 'boolean'
  );
};

const isPersistedAppState = (value: unknown): value is PersistedAppState => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.version === STORAGE_VERSION &&
    isHostSettings(record.hostSettingsDraft) &&
    Array.isArray(record.history) &&
    (record.session === null || isSessionLike(record.session))
  );
};

const isSessionLike = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.phase === 'string' &&
    Array.isArray(record.players) &&
    Array.isArray(record.rounds)
  );
};

const sanitiseSessionHorseNames = (session: SessionState | null) => {
  if (!session) {
    return { session, namesRefreshed: false };
  }

  let namesRefreshed = false;
  const rounds = session.rounds.map((round) => {
    const usedNames = new Set<string>();
    let roundChanged = false;
    const horses = round.horses.map((horse, laneIndex) => {
      if (CURRENT_HORSE_NAMES.has(horse.name) && !usedNames.has(horse.name)) {
        usedNames.add(horse.name);
        return horse;
      }

      namesRefreshed = true;
      roundChanged = true;

      for (let offset = 0; offset < HORSE_NAMES.length; offset += 1) {
        const candidate =
          HORSE_NAMES[(round.roundNumber * 7 + laneIndex + offset) % HORSE_NAMES.length];
        if (!usedNames.has(candidate)) {
          usedNames.add(candidate);
          return {
            ...horse,
            name: candidate
          };
        }
      }

      const fallbackName = `Horse ${laneIndex + 1}`;
      usedNames.add(fallbackName);
      return {
        ...horse,
        name: fallbackName
      };
    });

    return roundChanged
      ? {
          ...round,
          horses
        }
      : round;
  });

  return {
    session: namesRefreshed
      ? {
          ...session,
          rounds
        }
      : session,
    namesRefreshed
  };
};

const sanitisePersistedState = (state: PersistedAppState) => {
  const currentSession = sanitiseSessionHorseNames(state.session);
  let namesRefreshed = currentSession.namesRefreshed;
  const history = state.history.map((session) => {
    const result = sanitiseSessionHorseNames(session);
    namesRefreshed = namesRefreshed || result.namesRefreshed;
    return result.session as SessionState;
  });

  return {
    persistedState: {
      ...state,
      session: currentSession.session,
      history
    },
    namesRefreshed
  };
};

export const loadPersistedState = () => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return { persistedState: null, loadNotice: null };
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isPersistedAppState(parsedValue)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return {
        persistedState: null,
        loadNotice: 'A saved session could not be read and was cleared.'
      };
    }

    const { persistedState, namesRefreshed } = sanitisePersistedState(parsedValue);

    return {
      persistedState,
      loadNotice: namesRefreshed
        ? 'Saved session horse names were refreshed to the current safe list.'
        : null
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return {
      persistedState: null,
      loadNotice: 'Saved data was corrupt, so the app cleared it safely.'
    };
  }
};

export const savePersistedState = (state: AppState) => {
  const payload: PersistedAppState = {
    version: STORAGE_VERSION,
    hostSettingsDraft: state.hostSettingsDraft,
    session: state.session,
    history: state.history
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const clearPersistedState = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};
