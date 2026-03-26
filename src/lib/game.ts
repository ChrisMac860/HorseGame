import { CHEEKY_SUGGESTION_LINES } from '../data/cheekyLines';
import { HORSE_NAMES } from '../data/horseNames';
import { PLAYER_COLOURS } from '../data/playerColours';
import {
  DEFAULT_HOST_SETTINGS,
  MAX_PLAYERS,
  MAX_RECEIVED_SEGMENTS,
  MAX_RECEIVED_SHOTS,
  MAX_SEGMENT_STAKE,
  MIN_PLAYERS,
  RACE_LENGTH_PROFILES,
  SEGMENTS_PER_BEER
} from './constants';
import type {
  AppState,
  Assignment,
  AssignmentBlockKind,
  AssignmentValidationResult,
  Bet,
  BetValidationResult,
  HostSettings,
  Player,
  RoundState,
  SessionState,
  SetupDraft,
  SetupValidationResult
} from './types';
import {
  clamp,
  compareLeaderboardPlayers,
  createBooleanRecord,
  createNumberRecord,
  hashString,
  integerInRange,
  pickWeightedRange,
  sampleUnique,
  sum
} from './utils';

const nowIso = () => new Date().toISOString();

export const createDefaultSetupDraft = (playerCount = 4): SetupDraft => ({
  players: Array.from({ length: playerCount }, (_, index) => ({
    name: `Player ${index + 1}`,
    colour: PLAYER_COLOURS[index % PLAYER_COLOURS.length]
  }))
});

export const createDefaultAppState = (): AppState => ({
  view: 'home',
  hostSettingsDraft: DEFAULT_HOST_SETTINGS,
  setupDraft: createDefaultSetupDraft(),
  session: null,
  history: [],
  loadNotice: null
});

export const getActivePlayers = (players: Player[]) =>
  players.filter((player) => player.active);

export const getHorseCount = (activePlayerCount: number) => {
  if (activePlayerCount >= 2 && activePlayerCount <= 4) {
    return 4;
  }

  if (activePlayerCount >= 5 && activePlayerCount <= 7) {
    return 6;
  }

  return 8;
};

export const pickRaceLengthSeconds = (
  roundNumber: number,
  random: () => number = Math.random
) => {
  const profile =
    RACE_LENGTH_PROFILES.find(
      (candidate) =>
        roundNumber >= candidate.minRound &&
        (candidate.maxRound === null || roundNumber <= candidate.maxRound)
    ) ?? RACE_LENGTH_PROFILES.at(-1);

  if (!profile) {
    return 18;
  }

  const chosenRange = pickWeightedRange(profile.ranges, random);
  return integerInRange(chosenRange.min, chosenRange.max, random);
};

export const buildRound = (
  players: Player[],
  roundNumber: number,
  random: () => number = Math.random
): RoundState => {
  const activePlayers = getActivePlayers(players);
  const horseCount = getHorseCount(activePlayers.length);
  const pickedHorseNames = sampleUnique(HORSE_NAMES, horseCount, random);
  const horses = pickedHorseNames.map((horseName, lane) => ({
    id: `round-${roundNumber}-horse-${lane + 1}`,
    name: horseName,
    lane
  }));
  const winnerHorseId = horses[Math.floor(random() * horses.length)]?.id;
  const nonWinningHorseIds = horses
    .filter((horse) => horse.id !== winnerHorseId)
    .map((horse) => horse.id);
  const fallCountPool = [0, 0, 1, 1, 2];
  const fallCount =
    fallCountPool[Math.floor(random() * fallCountPool.length)] ?? 0;
  const fallingHorseIds = sampleUnique(nonWinningHorseIds, fallCount, random);
  const participantIds = activePlayers.map((player) => player.id);

  return {
    id: `round-${roundNumber}`,
    roundNumber,
    phase: 'betting',
    participantIds,
    horses,
    raceLengthSeconds: pickRaceLengthSeconds(roundNumber, random),
    winnerHorseId: winnerHorseId ?? horses[0].id,
    fallingHorseIds,
    bets: [],
    bettingOrder: participantIds,
    assignmentOrder: [],
    currentAssignmentIndex: 0,
    losingSelfSegmentsByPlayer: createNumberRecord(participantIds),
    losingSelfShotsByPlayer: createBooleanRecord(participantIds),
    outgoingWinnerSegmentsByPlayer: createNumberRecord(participantIds),
    outgoingWinnerShotsByPlayer: createBooleanRecord(participantIds),
    receivedSegmentsByPlayer: createNumberRecord(participantIds),
    receivedShotsByPlayer: createBooleanRecord(participantIds),
    assignments: [],
    punishmentByPlayer: {}
  };
};

export const createSessionFromSetup = (
  setupDraft: SetupDraft,
  hostSettings: HostSettings,
  random: () => number = Math.random
): SessionState => {
  const players = setupDraft.players.map((draftPlayer, index) => ({
    id: `player-${index + 1}`,
    name: draftPlayer.name.trim(),
    colour: draftPlayer.colour,
    active: true,
    tappedOut: false,
    tapOutRound: null,
    tapOutOrder: null,
    currentSegments: SEGMENTS_PER_BEER,
    usedExtraBeerThisRound: false,
    totalSegmentsTaken: 0,
    totalShotsTaken: 0,
    roundsWon: 0,
    roundsLost: 0
  }));
  const firstRound = buildRound(players, 1, random);
  const timestamp = nowIso();

  return {
    id: 'session-1',
    startedAt: timestamp,
    updatedAt: timestamp,
    phase: 'betting',
    hostSettings,
    players,
    rounds: [firstRound],
    nextTapOutOrder: 1
  };
};

export const getCurrentRound = (session: SessionState) =>
  session.rounds[session.rounds.length - 1];

export const getPlayerById = (session: SessionState, playerId: string) =>
  session.players.find((player) => player.id === playerId);

export const getHorseById = (round: RoundState, horseId: string) =>
  round.horses.find((horse) => horse.id === horseId);

export const getCurrentBettingPlayerId = (round: RoundState) =>
  round.bettingOrder[round.bets.length] ?? null;

export const getCurrentAssignmentWinnerId = (round: RoundState) =>
  round.assignmentOrder[round.currentAssignmentIndex] ?? null;

export const getAssignmentRemaining = (
  round: RoundState,
  playerId: string
) => {
  const playerAssignments = round.assignments.filter(
    (assignment) => assignment.fromPlayerId === playerId
  );

  return {
    segments:
      round.outgoingWinnerSegmentsByPlayer[playerId] -
      sum(playerAssignments.map((assignment) => assignment.segmentCount)),
    shot:
      Boolean(round.outgoingWinnerShotsByPlayer[playerId]) &&
      !playerAssignments.some((assignment) => assignment.shot)
  };
};

export const validateSetupDraft = (
  setupDraft: SetupDraft
): SetupValidationResult => {
  const trimmedNames = setupDraft.players.map((player) => player.name.trim());
  const errors: string[] = [];

  if (setupDraft.players.length < MIN_PLAYERS) {
    errors.push(`Add at least ${MIN_PLAYERS} players.`);
  }

  if (setupDraft.players.length > MAX_PLAYERS) {
    errors.push(`Keep it to ${MAX_PLAYERS} players or fewer.`);
  }

  if (trimmedNames.some((name) => name.length === 0)) {
    errors.push('Every player needs a name.');
  }

  if (new Set(trimmedNames).size !== trimmedNames.length) {
    errors.push('Player names must be unique.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const updateSetupPlayerCount = (
  setupDraft: SetupDraft,
  nextCount: number
) => {
  const clampedCount = clamp(nextCount, MIN_PLAYERS, MAX_PLAYERS);
  const currentPlayers = [...setupDraft.players];

  if (clampedCount < currentPlayers.length) {
    return {
      players: currentPlayers.slice(0, clampedCount)
    };
  }

  while (currentPlayers.length < clampedCount) {
    const nextIndex = currentPlayers.length;
    currentPlayers.push({
      name: `Player ${nextIndex + 1}`,
      colour: PLAYER_COLOURS[nextIndex % PLAYER_COLOURS.length]
    });
  }

  return { players: currentPlayers };
};

export const validateBet = (
  session: SessionState,
  bet: Bet
): BetValidationResult => {
  const round = getCurrentRound(session);
  const player = getPlayerById(session, bet.playerId);
  const currentPlayerId = getCurrentBettingPlayerId(round);

  if (round.phase !== 'betting') {
    return { isValid: false, message: 'Betting is closed for this round.' };
  }

  if (!player || !player.active) {
    return { isValid: false, message: 'That player is not active.' };
  }

  if (currentPlayerId !== player.id) {
    return { isValid: false, message: 'It is not their turn to bet.' };
  }

  if (!round.horses.some((horse) => horse.id === bet.horseId)) {
    return { isValid: false, message: 'Pick a horse for this bet.' };
  }

  if (!Number.isInteger(bet.segmentStake)) {
    return { isValid: false, message: 'Segments must be a whole number.' };
  }

  if (bet.segmentStake < 0 || bet.segmentStake > MAX_SEGMENT_STAKE) {
    return {
      isValid: false,
      message: `Bet between 0 and ${MAX_SEGMENT_STAKE} segments.`
    };
  }

  if (!session.hostSettings.shotsEnabled && bet.shotStake) {
    return {
      isValid: false,
      message: 'Shots are switched off in host settings.'
    };
  }

  if (
    !session.hostSettings.shotOnlyBetsAllowed &&
    bet.shotStake &&
    bet.segmentStake === 0
  ) {
    return {
      isValid: false,
      message: 'A shot needs at least 1 segment with the current settings.'
    };
  }

  if (bet.segmentStake === 0 && !bet.shotStake) {
    return {
      isValid: false,
      message: 'A bet needs at least 1 segment or 1 shot.'
    };
  }

  if (player.usedExtraBeerThisRound && bet.usedExtraBeerForThisBet) {
    return {
      isValid: false,
      message: 'That player already used their extra beer this round.'
    };
  }

  if (bet.usedExtraBeerForThisBet && bet.segmentStake <= player.currentSegments) {
    return {
      isValid: false,
      message: 'Save the extra beer for when it is actually needed.'
    };
  }

  const availableSegments =
    player.currentSegments +
    (bet.usedExtraBeerForThisBet ? SEGMENTS_PER_BEER : 0);

  if (bet.segmentStake > availableSegments) {
    return {
      isValid: false,
      message: `${player.name} cannot cover that many segments right now.`
    };
  }

  return { isValid: true, message: null };
};

export const placeBet = (session: SessionState, bet: Bet): SessionState => {
  const updatedPlayers = session.players.map((player) => {
    if (player.id !== bet.playerId) {
      return player;
    }

    if (!bet.usedExtraBeerForThisBet) {
      return player;
    }

    return {
      ...player,
      currentSegments: player.currentSegments + SEGMENTS_PER_BEER,
      usedExtraBeerThisRound: true
    };
  });
  const currentRound = getCurrentRound(session);
  const nextRound: RoundState = {
    ...currentRound,
    bets: [...currentRound.bets, bet]
  };

  return replaceCurrentRound(session, nextRound, 'betting', updatedPlayers);
};

const calculateRoundOutcome = (round: RoundState) => {
  const losingSelfSegmentsByPlayer = createNumberRecord(round.participantIds);
  const losingSelfShotsByPlayer = createBooleanRecord(round.participantIds);
  const outgoingWinnerSegmentsByPlayer = createNumberRecord(round.participantIds);
  const outgoingWinnerShotsByPlayer = createBooleanRecord(round.participantIds);

  for (const bet of round.bets) {
    if (bet.horseId === round.winnerHorseId) {
      outgoingWinnerSegmentsByPlayer[bet.playerId] = bet.segmentStake;
      outgoingWinnerShotsByPlayer[bet.playerId] = bet.shotStake;
      continue;
    }

    losingSelfSegmentsByPlayer[bet.playerId] = bet.segmentStake;
    losingSelfShotsByPlayer[bet.playerId] = bet.shotStake;
  }

  const assignmentOrder = round.participantIds.filter((playerId) => {
    const hasSegments = outgoingWinnerSegmentsByPlayer[playerId] > 0;
    const hasShot = outgoingWinnerShotsByPlayer[playerId];
    return hasSegments || hasShot;
  });

  return {
    losingSelfSegmentsByPlayer,
    losingSelfShotsByPlayer,
    outgoingWinnerSegmentsByPlayer,
    outgoingWinnerShotsByPlayer,
    assignmentOrder,
    currentAssignmentIndex: 0,
    assignments: [],
    receivedSegmentsByPlayer: createNumberRecord(round.participantIds),
    receivedShotsByPlayer: createBooleanRecord(round.participantIds),
    punishmentByPlayer: {}
  };
};

export const startRace = (session: SessionState): SessionState => {
  const currentRound = getCurrentRound(session);

  if (currentRound.bets.length !== currentRound.participantIds.length) {
    return session;
  }

  const nextRound = {
    ...currentRound,
    ...calculateRoundOutcome(currentRound),
    phase: 'race' as const
  };
  const winningPlayerIds = new Set(
    currentRound.bets
      .filter((bet) => bet.horseId === currentRound.winnerHorseId)
      .map((bet) => bet.playerId)
  );
  const updatedPlayers = session.players.map((player) => {
    if (!currentRound.participantIds.includes(player.id)) {
      return player;
    }

    if (winningPlayerIds.has(player.id)) {
      return {
        ...player,
        roundsWon: player.roundsWon + 1
      };
    }

    return {
      ...player,
      roundsLost: player.roundsLost + 1
    };
  });

  return replaceCurrentRound(session, nextRound, 'race', updatedPlayers);
};

export const revealRaceResult = (session: SessionState): SessionState => {
  const currentRound = getCurrentRound(session);
  return replaceCurrentRound(
    session,
    {
      ...currentRound,
      phase: 'results'
    },
    'results'
  );
};

export const beginAssignments = (session: SessionState): SessionState => {
  const currentRound = getCurrentRound(session);

  if (currentRound.assignmentOrder.length === 0) {
    return beginPunishment(session);
  }

  return replaceCurrentRound(
    session,
    {
      ...currentRound,
      phase: 'assignment'
    },
    'assignment'
  );
};

export const getSuggestedTarget = (
  session: SessionState,
  round: RoundState,
  blockedPlayerId: string,
  kind: AssignmentBlockKind
) => {
  const candidates = session.players.filter((player) => {
    if (!player.active || player.id === blockedPlayerId) {
      return false;
    }

    if (kind === 'segments') {
      return round.receivedSegmentsByPlayer[player.id] < MAX_RECEIVED_SEGMENTS;
    }

    return !round.receivedShotsByPlayer[player.id];
  });

  if (candidates.length === 0) {
    return null;
  }

  const lowestTotal = Math.min(
    ...candidates.map((candidate) => candidate.totalSegmentsTaken)
  );
  const lightestCandidates = candidates.filter(
    (candidate) => candidate.totalSegmentsTaken === lowestTotal
  );
  const chosenIndex =
    hashString(`${round.id}-${blockedPlayerId}-${kind}`) % lightestCandidates.length;

  return lightestCandidates[chosenIndex] ?? null;
};

const pickCheekyLine = (
  playerName: string,
  roundId: string,
  kind: AssignmentBlockKind
) => {
  const lineIndex =
    hashString(`${roundId}-${playerName}-${kind}`) %
    CHEEKY_SUGGESTION_LINES.length;
  return CHEEKY_SUGGESTION_LINES[lineIndex].replace('{name}', playerName);
};

export const validateAssignment = (
  session: SessionState,
  winnerId: string,
  targetId: string,
  segmentCount: number,
  shot: boolean
): AssignmentValidationResult => {
  const round = getCurrentRound(session);
  const currentWinnerId = getCurrentAssignmentWinnerId(round);

  if (round.phase !== 'assignment') {
    return { isValid: false, message: 'Assignments are not open.', suggestion: null };
  }

  if (!currentWinnerId || currentWinnerId !== winnerId) {
    return {
      isValid: false,
      message: 'It is not that winner’s turn to assign.',
      suggestion: null
    };
  }

  if (!round.participantIds.includes(targetId)) {
    return { isValid: false, message: 'Pick a valid target.', suggestion: null };
  }

  if (!Number.isInteger(segmentCount) || segmentCount < 0) {
    return { isValid: false, message: 'Segment count must be valid.', suggestion: null };
  }

  if (segmentCount === 0 && !shot) {
    return {
      isValid: false,
      message: 'Assign at least 1 segment or the shot.',
      suggestion: null
    };
  }

  const remaining = getAssignmentRemaining(round, winnerId);

  if (segmentCount > remaining.segments) {
    return {
      isValid: false,
      message: 'That exceeds the winner’s remaining segments.',
      suggestion: null
    };
  }

  if (shot && !remaining.shot) {
    return {
      isValid: false,
      message: 'The shot has already been assigned.',
      suggestion: null
    };
  }

  if (
    round.receivedSegmentsByPlayer[targetId] + segmentCount >
    MAX_RECEIVED_SEGMENTS
  ) {
    const suggestionPlayer = session.hostSettings.cheekySuggestions
      ? getSuggestedTarget(session, round, targetId, 'segments')
      : null;
    const suggestion = suggestionPlayer
      ? pickCheekyLine(suggestionPlayer.name, round.id, 'segments')
      : null;

    return {
      isValid: false,
      message: 'That target is already at the received-segment cap.',
      suggestion
    };
  }

  if (
    shot &&
    Number(round.receivedShotsByPlayer[targetId]) + Number(shot) > MAX_RECEIVED_SHOTS
  ) {
    const suggestionPlayer = session.hostSettings.cheekySuggestions
      ? getSuggestedTarget(session, round, targetId, 'shot')
      : null;
    const suggestion = suggestionPlayer
      ? pickCheekyLine(suggestionPlayer.name, round.id, 'shot')
      : null;

    return {
      isValid: false,
      message: 'That target already has a received shot this round.',
      suggestion
    };
  }

  return { isValid: true, message: null, suggestion: null };
};

export const addAssignment = (
  session: SessionState,
  assignment: Assignment
): SessionState => {
  const currentRound = getCurrentRound(session);
  const nextRound: RoundState = {
    ...currentRound,
    assignments: [...currentRound.assignments, assignment],
    receivedSegmentsByPlayer: {
      ...currentRound.receivedSegmentsByPlayer,
      [assignment.toPlayerId]:
        currentRound.receivedSegmentsByPlayer[assignment.toPlayerId] +
        assignment.segmentCount
    },
    receivedShotsByPlayer: assignment.shot
      ? {
          ...currentRound.receivedShotsByPlayer,
          [assignment.toPlayerId]: true
        }
      : currentRound.receivedShotsByPlayer
  };

  return replaceCurrentRound(session, nextRound, 'assignment');
};

export const confirmAssignmentWinner = (session: SessionState): SessionState => {
  const currentRound = getCurrentRound(session);
  const winnerId = getCurrentAssignmentWinnerId(currentRound);

  if (!winnerId) {
    return beginPunishment(session);
  }

  const remaining = getAssignmentRemaining(currentRound, winnerId);

  if (remaining.segments !== 0 || remaining.shot) {
    return session;
  }

  const nextIndex = currentRound.currentAssignmentIndex + 1;

  if (nextIndex >= currentRound.assignmentOrder.length) {
    return beginPunishment(session);
  }

  return replaceCurrentRound(
    session,
    {
      ...currentRound,
      currentAssignmentIndex: nextIndex
    },
    'assignment'
  );
};

const beginPunishment = (session: SessionState) => {
  const currentRound = getCurrentRound(session);
  const punishmentByPlayer = Object.fromEntries(
    currentRound.participantIds.map((playerId) => {
      const segmentsRequired =
        currentRound.losingSelfSegmentsByPlayer[playerId] +
        currentRound.receivedSegmentsByPlayer[playerId];
      const shotCountRequired =
        Number(currentRound.losingSelfShotsByPlayer[playerId]) +
        Number(currentRound.receivedShotsByPlayer[playerId]);

      return [
        playerId,
        {
          segmentsRequired,
          shotCountRequired,
          segmentsResolved: segmentsRequired === 0,
          shotsResolved: shotCountRequired === 0,
          tappedOut: false
        }
      ];
    })
  ) as RoundState['punishmentByPlayer'];

  return replaceCurrentRound(
    session,
    {
      ...currentRound,
      phase: 'punishment',
      punishmentByPlayer
    },
    'punishment'
  );
};

export const openExtraBeerDuringPunishment = (
  session: SessionState,
  playerId: string
): SessionState => {
  const currentRound = getCurrentRound(session);
  const player = getPlayerById(session, playerId);
  const punishmentState = currentRound.punishmentByPlayer[playerId];

  if (!player || !punishmentState) {
    return session;
  }

  if (
    player.usedExtraBeerThisRound ||
    punishmentState.segmentsRequired <= player.currentSegments
  ) {
    return session;
  }

  const updatedPlayers = session.players.map((candidate) =>
    candidate.id === playerId
      ? {
          ...candidate,
          currentSegments: candidate.currentSegments + SEGMENTS_PER_BEER,
          usedExtraBeerThisRound: true
        }
      : candidate
  );

  return replaceCurrentRound(session, currentRound, 'punishment', updatedPlayers);
};

export const confirmSegmentsTaken = (
  session: SessionState,
  playerId: string
): SessionState => {
  const currentRound = getCurrentRound(session);
  const punishmentState = currentRound.punishmentByPlayer[playerId];
  const player = getPlayerById(session, playerId);

  if (!player || !punishmentState || punishmentState.segmentsResolved) {
    return session;
  }

  if (player.currentSegments < punishmentState.segmentsRequired) {
    return session;
  }

  const updatedPlayers = session.players.map((candidate) =>
    candidate.id === playerId
      ? {
          ...candidate,
          currentSegments:
            candidate.currentSegments - punishmentState.segmentsRequired,
          totalSegmentsTaken:
            candidate.totalSegmentsTaken + punishmentState.segmentsRequired
        }
      : candidate
  );
  const nextRound: RoundState = {
    ...currentRound,
    punishmentByPlayer: {
      ...currentRound.punishmentByPlayer,
      [playerId]: {
        ...punishmentState,
        segmentsResolved: true
      }
    }
  };

  return replaceCurrentRound(session, nextRound, 'punishment', updatedPlayers);
};

export const confirmShotsTaken = (
  session: SessionState,
  playerId: string
): SessionState => {
  const currentRound = getCurrentRound(session);
  const punishmentState = currentRound.punishmentByPlayer[playerId];

  if (!punishmentState || punishmentState.shotsResolved) {
    return session;
  }

  const updatedPlayers = session.players.map((candidate) =>
    candidate.id === playerId
      ? {
          ...candidate,
          totalShotsTaken: candidate.totalShotsTaken + punishmentState.shotCountRequired
        }
      : candidate
  );
  const nextRound: RoundState = {
    ...currentRound,
    punishmentByPlayer: {
      ...currentRound.punishmentByPlayer,
      [playerId]: {
        ...punishmentState,
        shotsResolved: true
      }
    }
  };

  return replaceCurrentRound(session, nextRound, 'punishment', updatedPlayers);
};

export const tapOutPlayer = (
  session: SessionState,
  playerId: string
): SessionState => {
  const currentRound = getCurrentRound(session);
  const punishmentState = currentRound.punishmentByPlayer[playerId];
  const player = getPlayerById(session, playerId);

  if (!player || !punishmentState) {
    return session;
  }

  const updatedPlayers = session.players.map((candidate) =>
    candidate.id === playerId
      ? {
          ...candidate,
          active: false,
          tappedOut: true,
          tapOutRound: currentRound.roundNumber,
          tapOutOrder: session.nextTapOutOrder,
          currentSegments: 0
        }
      : candidate
  );
  const nextRound: RoundState = {
    ...currentRound,
    punishmentByPlayer: {
      ...currentRound.punishmentByPlayer,
      [playerId]: {
        ...punishmentState,
        segmentsResolved: true,
        shotsResolved: true,
        tappedOut: true
      }
    }
  };

  return {
    ...replaceCurrentRound(session, nextRound, 'punishment', updatedPlayers),
    nextTapOutOrder: session.nextTapOutOrder + 1
  };
};

export const canConfirmPunishment = (round: RoundState) =>
  Object.values(round.punishmentByPlayer).every(
    (punishmentState) =>
      (punishmentState.segmentsResolved && punishmentState.shotsResolved) ||
      punishmentState.tappedOut
  );

export const confirmPunishmentPhase = (session: SessionState): SessionState => {
  const currentRound = getCurrentRound(session);

  if (!canConfirmPunishment(currentRound)) {
    return session;
  }

  return replaceCurrentRound(
    session,
    {
      ...currentRound,
      phase: 'roundSummary'
    },
    'roundSummary'
  );
};

export const advanceAfterRoundSummary = (
  session: SessionState,
  nextRound: RoundState | null
): SessionState => {
  const activePlayers = getActivePlayers(session.players);

  if (activePlayers.length <= 1 || !nextRound) {
    return {
      ...session,
      updatedAt: nowIso(),
      phase: 'final'
    };
  }

  const resetPlayers = session.players.map((player) => ({
    ...player,
    usedExtraBeerThisRound: false
  }));

  return {
    ...session,
    updatedAt: nowIso(),
    phase: 'betting',
    players: resetPlayers,
    rounds: [...session.rounds, nextRound]
  };
};

export const replaceCurrentRound = (
  session: SessionState,
  round: RoundState,
  phase: SessionState['phase'],
  players = session.players
): SessionState => ({
  ...session,
  updatedAt: nowIso(),
  phase,
  players,
  rounds: [...session.rounds.slice(0, -1), round]
});

export const splitLeaderboard = (players: Player[]) => ({
  active: players.filter((player) => player.active).sort(compareLeaderboardPlayers),
  tappedOut: players
    .filter((player) => player.tappedOut)
    .sort((left, right) => {
      const leftRound = left.tapOutRound ?? Number.MAX_SAFE_INTEGER;
      const rightRound = right.tapOutRound ?? Number.MAX_SAFE_INTEGER;

      if (leftRound !== rightRound) {
        return leftRound - rightRound;
      }

      const leftOrder = left.tapOutOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.tapOutOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return compareLeaderboardPlayers(left, right);
    })
});

export const getRoundPunishmentTotals = (round: RoundState, playerId: string) => ({
  segments:
    round.losingSelfSegmentsByPlayer[playerId] +
    round.receivedSegmentsByPlayer[playerId],
  shots:
    Number(round.losingSelfShotsByPlayer[playerId]) +
    Number(round.receivedShotsByPlayer[playerId])
});

export const getBetForPlayer = (round: RoundState, playerId: string) =>
  round.bets.find((bet) => bet.playerId === playerId) ?? null;

export const getNextRound = (
  session: SessionState,
  random: () => number = Math.random
) => {
  const activePlayers = getActivePlayers(session.players);

  if (activePlayers.length <= 1) {
    return null;
  }

  return buildRound(session.players, session.rounds.length + 1, random);
};
