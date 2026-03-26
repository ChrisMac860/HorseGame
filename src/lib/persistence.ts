import { STORAGE_KEY, STORAGE_VERSION } from './constants';
import type { AppState, HostSettings, PersistedAppState } from './types';

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

    return { persistedState: parsedValue, loadNotice: null };
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
