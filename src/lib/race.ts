import type { Horse, RoundState } from './types';
import { clamp, hashString } from './utils';

const easeOut = (value: number) => 1 - (1 - value) * (1 - value);
const easeInOut = (value: number) =>
  value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;

const peak = (progress: number, centre: number, width: number) => {
  const distance = Math.abs(progress - centre);
  if (distance > width) {
    return 0;
  }

  return 1 - distance / width;
};

const finalHorseProgress = (horse: Horse, round: RoundState) => {
  if (horse.id === round.winnerHorseId) {
    return 1;
  }

  const seed = hashString(`${round.id}-${horse.id}`);
  return 0.72 + ((seed % 22) / 100);
};

export const getRaceHorseVisuals = (
  round: RoundState,
  horse: Horse,
  progress: number
) => {
  const seed = hashString(`${round.id}-${horse.id}`);
  const paceBias = 0.9 + (seed % 8) / 50;
  const endProgress = finalHorseProgress(horse, round);
  const curveBase =
    easeInOut(progress) * endProgress +
    Math.sin(progress * (5 + (seed % 3)) + seed) * 0.015;
  const horseProgress = clamp(curveBase * paceBias, 0, endProgress);
  const leaderProgress = Math.max(
    ...round.horses.map((candidate) => {
      const candidateEnd = finalHorseProgress(candidate, round);
      const candidateSeed = hashString(`${round.id}-${candidate.id}`);
      const candidateBias = 0.9 + (candidateSeed % 8) / 50;
      const candidateCurve =
        easeInOut(progress) * candidateEnd +
        Math.sin(progress * (5 + (candidateSeed % 3)) + candidateSeed) * 0.015;
      return clamp(candidateCurve * candidateBias, 0, candidateEnd);
    })
  );
  const relativeOffset = clamp((horseProgress - leaderProgress) * 95, -22, 7);
  const jumpLift =
    peak(progress, 0.24 + horse.lane * 0.02, 0.05) * 18 +
    peak(progress, 0.61 - horse.lane * 0.015, 0.05) * 16;
  const bounce = Math.sin(progress * 24 + horse.lane) * 2.4;
  const fallWindowStart = 0.36 + (horse.lane % 2) * 0.18;
  const isFalling =
    round.fallingHorseIds.includes(horse.id) &&
    progress >= fallWindowStart &&
    progress <= fallWindowStart + 0.13;

  return {
    trackProgress: horseProgress,
    relativeOffset,
    jumpLift,
    bounce,
    isFalling,
    scale: horse.id === round.winnerHorseId ? 1.04 + progress * 0.03 : 1
  };
};

export const getBackgroundShift = (progress: number) => easeOut(progress) * 68;
