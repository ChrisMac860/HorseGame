import { describe, expect, it } from 'vitest';
import { DEFAULT_HOST_SETTINGS } from '../src/lib/constants';
import {
  advanceAfterRoundSummary,
  beginAssignments,
  createSessionFromSetup,
  getCurrentRound,
  getHorseCount,
  pickRaceLengthSeconds,
  revealRaceResult,
  startRace,
  tapOutPlayer,
  validateAssignment,
  validateBet
} from '../src/lib/game';
import type { SetupDraft } from '../src/lib/types';

const createSequenceRandom = (...values: number[]) => {
  let index = 0;

  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
};

const setupDraft: SetupDraft = {
  players: [
    { name: 'Alex', colour: '#b74f32' },
    { name: 'Blair', colour: '#2d6a4f' },
    { name: 'Casey', colour: '#295c9b' }
  ]
};

describe('core game logic', () => {
  it('maps active players to the correct horse count', () => {
    expect(getHorseCount(2)).toBe(4);
    expect(getHorseCount(4)).toBe(4);
    expect(getHorseCount(5)).toBe(6);
    expect(getHorseCount(7)).toBe(6);
    expect(getHorseCount(8)).toBe(8);
    expect(getHorseCount(10)).toBe(8);
  });

  it('uses the weighted race timing pools by round band', () => {
    expect(pickRaceLengthSeconds(1, createSequenceRandom(0.99, 0.5))).toBeGreaterThanOrEqual(18);
    expect(pickRaceLengthSeconds(1, createSequenceRandom(0.99, 0.5))).toBeLessThanOrEqual(20);
    expect(pickRaceLengthSeconds(12, createSequenceRandom(0.95, 0.75))).toBeGreaterThanOrEqual(33);
    expect(pickRaceLengthSeconds(12, createSequenceRandom(0.95, 0.75))).toBeLessThanOrEqual(35);
  });

  it('rejects shot-only bets when the setting is off', () => {
    const session = createSessionFromSetup(
      setupDraft,
      {
        ...DEFAULT_HOST_SETTINGS,
        shotOnlyBetsAllowed: false
      },
      createSequenceRandom(0.1, 0.1, 0.1, 0.1, 0.1)
    );
    const round = getCurrentRound(session);
    const currentPlayerId = round.participantIds[0];
    const validation = validateBet(session, {
      playerId: currentPlayerId,
      horseId: round.horses[0].id,
      segmentStake: 0,
      shotStake: true,
      usedExtraBeerForThisBet: false
    });

    expect(validation.isValid).toBe(false);
    expect(validation.message).toMatch(/at least 1 segment/i);
  });

  it('blocks winner assignments that would exceed the receive cap and offers a suggestion', () => {
    let session = createSessionFromSetup(
      setupDraft,
      DEFAULT_HOST_SETTINGS,
      createSequenceRandom(0.1, 0.1, 0.1, 0.1, 0.1)
    );
    const round = getCurrentRound(session);
    const winnerHorseId = round.horses[0].id;

    session = {
      ...session,
      rounds: [
        {
          ...round,
          winnerHorseId,
          bets: [
            {
              playerId: session.players[0].id,
              horseId: winnerHorseId,
              segmentStake: 8,
              shotStake: true,
              usedExtraBeerForThisBet: false
            },
            {
              playerId: session.players[1].id,
              horseId: round.horses[1].id,
              segmentStake: 2,
              shotStake: false,
              usedExtraBeerForThisBet: false
            },
            {
              playerId: session.players[2].id,
              horseId: round.horses[2].id,
              segmentStake: 2,
              shotStake: false,
              usedExtraBeerForThisBet: false
            }
          ]
        }
      ]
    };

    session = startRace(session);
    session = revealRaceResult(session);
    session = beginAssignments(session);
    session = {
      ...session,
      rounds: [
        {
          ...getCurrentRound(session),
          receivedSegmentsByPlayer: {
            ...getCurrentRound(session).receivedSegmentsByPlayer,
            [session.players[1].id]: 8
          }
        }
      ]
    };

    const validation = validateAssignment(
      session,
      session.players[0].id,
      session.players[1].id,
      1,
      false
    );

    expect(validation.isValid).toBe(false);
    expect(validation.message).toMatch(/cap/i);
    expect(validation.suggestion).toBeTruthy();
    expect(
      validation.suggestion?.includes('Alex') || validation.suggestion?.includes('Casey')
    ).toBe(true);
  });

  it('marks a player as tapped out when they cannot cover punishment', () => {
    let session = createSessionFromSetup(
      {
        players: setupDraft.players.slice(0, 2)
      },
      DEFAULT_HOST_SETTINGS,
      createSequenceRandom(0.1, 0.1, 0.1, 0.1, 0.1)
    );
    const round = getCurrentRound(session);

    session = {
      ...session,
      phase: 'punishment',
      players: session.players.map((player, index) =>
        index === 1
          ? {
              ...player,
              currentSegments: 3,
              usedExtraBeerThisRound: true
            }
          : player
      ),
      rounds: [
        {
          ...round,
          phase: 'punishment',
          punishmentByPlayer: {
            [session.players[0].id]: {
              segmentsRequired: 0,
              shotCountRequired: 0,
              segmentsResolved: true,
              shotsResolved: true,
              tappedOut: false
            },
            [session.players[1].id]: {
              segmentsRequired: 10,
              shotCountRequired: 0,
              segmentsResolved: false,
              shotsResolved: true,
              tappedOut: false
            }
          }
        }
      ]
    };

    session = tapOutPlayer(session, session.players[1].id);

    expect(session.players[1].active).toBe(false);
    expect(session.players[1].tappedOut).toBe(true);
    expect(session.players[1].tapOutRound).toBe(1);
    expect(session.nextTapOutOrder).toBe(2);
  });

  it('ends the session when only one active player remains after the summary', () => {
    const baseSession = createSessionFromSetup(
      {
        players: setupDraft.players.slice(0, 2)
      },
      DEFAULT_HOST_SETTINGS,
      createSequenceRandom(0.1, 0.1, 0.1, 0.1, 0.1)
    );
    const session = advanceAfterRoundSummary(
      {
        ...baseSession,
        phase: 'roundSummary',
        players: [
          {
            ...baseSession.players[0],
            active: true
          },
          {
            ...baseSession.players[1],
            active: false,
            tappedOut: true,
            tapOutRound: 1,
            tapOutOrder: 1
          }
        ]
      },
      null
    );

    expect(session.phase).toBe('final');
  });
});
