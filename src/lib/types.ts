export type AppView = 'home' | 'setup' | 'session';

export type SessionPhase =
  | 'betting'
  | 'race'
  | 'results'
  | 'assignment'
  | 'punishment'
  | 'roundSummary'
  | 'final';

export type AssignmentBlockKind = 'segments' | 'shot';

export interface HostSettings {
  shotsEnabled: boolean;
  shotOnlyBetsAllowed: boolean;
  cheekySuggestions: boolean;
  reducedRaceMotion: boolean;
}

export interface SetupDraftPlayer {
  name: string;
  colour: string;
}

export interface SetupDraft {
  players: SetupDraftPlayer[];
}

export interface Player {
  id: string;
  name: string;
  colour: string;
  active: boolean;
  tappedOut: boolean;
  tapOutRound: number | null;
  tapOutOrder: number | null;
  currentSegments: number;
  usedExtraBeerThisRound: boolean;
  totalSegmentsTaken: number;
  totalShotsTaken: number;
  roundsWon: number;
  roundsLost: number;
}

export interface Horse {
  id: string;
  name: string;
  lane: number;
}

export interface Bet {
  playerId: string;
  horseId: string;
  segmentStake: number;
  shotStake: boolean;
  usedExtraBeerForThisBet: boolean;
}

export interface Assignment {
  fromPlayerId: string;
  toPlayerId: string;
  segmentCount: number;
  shot: boolean;
}

export interface PunishmentResolutionState {
  segmentsRequired: number;
  shotCountRequired: number;
  segmentsResolved: boolean;
  shotsResolved: boolean;
  tappedOut: boolean;
}

export interface RoundState {
  id: string;
  roundNumber: number;
  phase: Exclude<SessionPhase, 'final'>;
  participantIds: string[];
  horses: Horse[];
  raceLengthSeconds: number;
  winnerHorseId: string;
  fallingHorseIds: string[];
  bets: Bet[];
  bettingOrder: string[];
  assignmentOrder: string[];
  currentAssignmentIndex: number;
  losingSelfSegmentsByPlayer: Record<string, number>;
  losingSelfShotsByPlayer: Record<string, boolean>;
  outgoingWinnerSegmentsByPlayer: Record<string, number>;
  outgoingWinnerShotsByPlayer: Record<string, boolean>;
  receivedSegmentsByPlayer: Record<string, number>;
  receivedShotsByPlayer: Record<string, boolean>;
  assignments: Assignment[];
  punishmentByPlayer: Record<string, PunishmentResolutionState>;
}

export interface SessionState {
  id: string;
  startedAt: string;
  updatedAt: string;
  phase: SessionPhase;
  hostSettings: HostSettings;
  players: Player[];
  rounds: RoundState[];
  nextTapOutOrder: number;
}

export interface AppState {
  view: AppView;
  hostSettingsDraft: HostSettings;
  setupDraft: SetupDraft;
  session: SessionState | null;
  history: SessionState[];
  loadNotice: string | null;
}

export interface PersistedAppState {
  version: number;
  hostSettingsDraft: HostSettings;
  session: SessionState | null;
  history: SessionState[];
}

export interface SetupValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BetValidationResult {
  isValid: boolean;
  message: string | null;
}

export interface AssignmentValidationResult {
  isValid: boolean;
  message: string | null;
  suggestion: string | null;
}

export interface WeightedRange {
  min: number;
  max: number;
  weight: number;
}
