import { describe, expect, it } from 'vitest';
import { buildRound } from '../src/lib/game';
import { getRaceFinishLeft, getRaceHorseVisuals } from '../src/lib/race';
import type { Player } from '../src/lib/types';

const createSequenceRandom = (...values: number[]) => {
  let index = 0;

  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
};

const players: Player[] = [
  {
    id: 'player-1',
    name: 'Alex',
    colour: '#b74f32',
    active: true,
    tappedOut: false,
    tapOutRound: null,
    tapOutOrder: null,
    currentSegments: 8,
    usedExtraBeerThisRound: false,
    totalSegmentsTaken: 0,
    totalShotsTaken: 0,
    roundsWon: 0,
    roundsLost: 0
  },
  {
    id: 'player-2',
    name: 'Blair',
    colour: '#2d6a4f',
    active: true,
    tappedOut: false,
    tapOutRound: null,
    tapOutOrder: null,
    currentSegments: 8,
    usedExtraBeerThisRound: false,
    totalSegmentsTaken: 0,
    totalShotsTaken: 0,
    roundsWon: 0,
    roundsLost: 0
  },
  {
    id: 'player-3',
    name: 'Casey',
    colour: '#295c9b',
    active: true,
    tappedOut: false,
    tapOutRound: null,
    tapOutOrder: null,
    currentSegments: 8,
    usedExtraBeerThisRound: false,
    totalSegmentsTaken: 0,
    totalShotsTaken: 0,
    roundsWon: 0,
    roundsLost: 0
  },
  {
    id: 'player-4',
    name: 'Drew',
    colour: '#8b5e34',
    active: true,
    tappedOut: false,
    tapOutRound: null,
    tapOutOrder: null,
    currentSegments: 8,
    usedExtraBeerThisRound: false,
    totalSegmentsTaken: 0,
    totalShotsTaken: 0,
    roundsWon: 0,
    roundsLost: 0
  }
];

describe('race animation simulation', () => {
  it('keeps horses moving forward across five rounds and lands the winner on the finish', () => {
    const finishLeft = getRaceFinishLeft();
    const random = createSequenceRandom(
      0.02, 0.18, 0.35, 0.56, 0.74, 0.91,
      0.11, 0.27, 0.43, 0.63, 0.81, 0.97,
      0.05, 0.22, 0.39, 0.58, 0.76, 0.94,
      0.09, 0.25, 0.47, 0.67, 0.84, 0.99,
      0.14, 0.3, 0.5, 0.7, 0.87, 0.96
    );

    for (let roundNumber = 1; roundNumber <= 5; roundNumber += 1) {
      const round = buildRound(players, roundNumber, random);
      const previousLeftByHorse = new Map<string, number>();

      for (let step = 0; step <= 40; step += 1) {
        const progress = step / 40;

        for (const horse of round.horses) {
          const visuals = getRaceHorseVisuals(round, horse, progress);
          const previousLeft = previousLeftByHorse.get(horse.id) ?? Number.NEGATIVE_INFINITY;

          expect(Number.isFinite(visuals.raceLeft)).toBe(true);
          expect(visuals.raceLeft).toBeGreaterThanOrEqual(previousLeft - 0.0001);
          previousLeftByHorse.set(horse.id, visuals.raceLeft);
        }
      }

      const winnerHorse = round.horses.find((horse) => horse.id === round.winnerHorseId);
      expect(winnerHorse).toBeTruthy();

      const winnerVisuals = getRaceHorseVisuals(round, winnerHorse!, 1);
      expect(winnerVisuals.raceLeft).toBeCloseTo(finishLeft, 4);
    }
  });
});
