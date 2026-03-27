import type { Horse, RoundState } from './types';
import { clamp, hashString } from './utils';
export const RACE_START_LEFT = 8;
export const RACE_FINISH_LEFT = 91.5;

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);
const easeInCubic = (value: number) => value * value * value;
const easeInOutCubic = (value: number) =>
  value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
const linear = (value: number) => value;

const peak = (progress: number, centre: number, width: number) => {
  const distance = Math.abs(progress - centre);
  if (distance > width) {
    return 0;
  }

  return 1 - distance / width;
};

const phaseProgress = (
  progress: number,
  start: number,
  end: number,
  easing: (value: number) => number
) => easing(clamp((progress - start) / (end - start), 0, 1));

const finalHorseProgress = (horse: Horse, round: RoundState) => {
  if (horse.id === round.winnerHorseId) {
    return 1;
  }

  const seed = hashString(`${round.id}-${horse.id}`);
  return 0.83 + ((seed % 11) / 100);
};

const getHorseTrackProgress = (
  round: RoundState,
  horse: Horse,
  progress: number
) => {
  const seed = hashString(`${round.id}-${horse.id}`);
  const finishTarget = finalHorseProgress(horse, round);
  const isWinner = horse.id === round.winnerHorseId;
  const openingFraction =
    0.19 + (isWinner ? -0.014 : 0.012) + ((seed % 5) - 2) * 0.008;
  const settleFraction = 0.33 + (((seed >> 1) % 5) - 2) * 0.01;
  const pressureFraction =
    0.25 + (isWinner ? -0.018 : 0.016) + (((seed >> 2) % 5) - 2) * 0.008;
  const driveFraction = clamp(
    1 - openingFraction - settleFraction - pressureFraction,
    0.18,
    0.34
  );
  const normaliser =
    openingFraction + settleFraction + pressureFraction + driveFraction;
  const openingShare = openingFraction / normaliser;
  const settleShare = settleFraction / normaliser;
  const pressureShare = pressureFraction / normaliser;
  const driveShare = driveFraction / normaliser;

  const breakEnd = 0.16 + (((seed >> 3) % 5) - 2) * 0.007;
  const settleEnd = 0.54 + (((seed >> 4) % 5) - 2) * 0.012;
  const pressureEnd =
    (isWinner ? 0.78 : 0.82) + (((seed >> 5) % 5) - 2) * 0.008;

  const openingDistance =
    finishTarget *
    openingShare *
    phaseProgress(progress, 0, breakEnd, easeOutCubic);
  const settleDistance =
    finishTarget *
    settleShare *
    phaseProgress(progress, breakEnd, settleEnd, linear);
  const pressureDistance =
    finishTarget *
    pressureShare *
    phaseProgress(progress, settleEnd, pressureEnd, easeInOutCubic);
  const driveDistance =
    finishTarget *
    driveShare *
    phaseProgress(progress, pressureEnd, 1, easeInCubic);

  return clamp(
    openingDistance + settleDistance + pressureDistance + driveDistance,
    0,
    finishTarget
  );
};

export const getRaceHorseVisuals = (
  round: RoundState,
  horse: Horse,
  progress: number
) => {
  const seed = hashString(`${round.id}-${horse.id}`);
  const trackProgress = getHorseTrackProgress(round, horse, progress);
  const raceLeft =
    RACE_START_LEFT + trackProgress * (RACE_FINISH_LEFT - RACE_START_LEFT);
  const stridePulse =
    peak(progress, 0.16 + (seed % 7) * 0.01, 0.09) * 0.34 +
    peak(progress, 0.49 + ((seed >> 1) % 6) * 0.008, 0.1) * 0.28 +
    peak(
      progress,
      horse.id === round.winnerHorseId ? 0.84 : 0.78 + ((seed >> 2) % 4) * 0.01,
      0.11
    ) *
      (horse.id === round.winnerHorseId ? 0.52 : 0.2);
  const strideWave =
    (trackProgress * 14 + progress * 4.5) * Math.PI + horse.lane * 0.55;
  const bounce =
    (Math.sin(strideWave) * 0.44 +
      Math.sin(strideWave * 0.52 + (seed % 31)) * 0.08) *
    0.54;
  const fallStart = 0.35 + ((seed >> 2) % 5) * 0.06;
  const fallAmount = round.fallingHorseIds.includes(horse.id)
    ? peak(progress, fallStart + 0.045, 0.07)
    : 0;
  const speedPulse = clamp(0.98 + stridePulse + trackProgress * 0.28, 0.98, 1.95);
  const leanDegrees = clamp(
    speedPulse * 1.45 - fallAmount * 34,
    -5,
    6
  );
  const dustAmount = clamp(
    0.16 + speedPulse * 0.18,
    0.08,
    0.68
  );

  return {
    trackProgress,
    raceLeft,
    jumpLift: 0,
    bounce,
    isFalling: fallAmount > 0.12,
    fallAmount,
    scale: horse.id === round.winnerHorseId ? 1.02 : 1,
    leanDegrees,
    dustAmount,
    speedPulse
  };
};

export const getRaceStandings = (round: RoundState, progress: number) =>
  round.horses
    .map((horse) => ({
      horseId: horse.id,
      name: horse.name,
      lane: horse.lane,
      trackProgress: getHorseTrackProgress(round, horse, progress)
    }))
    .sort((left, right) => {
      if (right.trackProgress !== left.trackProgress) {
        return right.trackProgress - left.trackProgress;
      }

      return left.lane - right.lane;
    });

export const getRaceFinishLeft = () => RACE_FINISH_LEFT;
