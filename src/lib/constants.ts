import type { HostSettings, WeightedRange } from './types';

export const APP_NAME = 'Last Orders Derby';
export const STORAGE_KEY = 'last-orders-derby';
export const STORAGE_VERSION = 1;
export const SEGMENTS_PER_BEER = 8;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const MAX_SEGMENT_STAKE = 8;
export const MAX_RECEIVED_SEGMENTS = 8;
export const MAX_RECEIVED_SHOTS = 1;
export const HISTORY_LIMIT = 40;

export const DEFAULT_HOST_SETTINGS: HostSettings = {
  shotsEnabled: true,
  shotOnlyBetsAllowed: true,
  cheekySuggestions: true,
  reducedRaceMotion: false
};

export const RACE_LENGTH_PROFILES: Array<{
  minRound: number;
  maxRound: number | null;
  ranges: WeightedRange[];
}> = [
  {
    minRound: 1,
    maxRound: 3,
    ranges: [
      { min: 12, max: 16, weight: 9 },
      { min: 18, max: 20, weight: 2 }
    ]
  },
  {
    minRound: 4,
    maxRound: 7,
    ranges: [
      { min: 16, max: 22, weight: 8 },
      { min: 24, max: 26, weight: 2 }
    ]
  },
  {
    minRound: 8,
    maxRound: 11,
    ranges: [
      { min: 20, max: 28, weight: 8 },
      { min: 30, max: 32, weight: 2 }
    ]
  },
  {
    minRound: 12,
    maxRound: null,
    ranges: [
      { min: 24, max: 32, weight: 8 },
      { min: 33, max: 35, weight: 2 }
    ]
  }
];
