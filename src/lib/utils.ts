import type { Player, WeightedRange } from './types';

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const sum = (values: number[]) =>
  values.reduce((runningTotal, value) => runningTotal + value, 0);

export const sampleUnique = <T>(
  values: readonly T[],
  count: number,
  random: () => number
): T[] => {
  const pool = [...values];
  const picked: T[] = [];

  for (let index = 0; index < count && pool.length > 0; index += 1) {
    const pickIndex = Math.floor(random() * pool.length);
    picked.push(pool[pickIndex]);
    pool.splice(pickIndex, 1);
  }

  return picked;
};

export const pickWeightedRange = (
  ranges: WeightedRange[],
  random: () => number
) => {
  const totalWeight = sum(ranges.map((range) => range.weight));
  let threshold = random() * totalWeight;

  for (const range of ranges) {
    threshold -= range.weight;
    if (threshold <= 0) {
      return range;
    }
  }

  return ranges.at(-1) ?? ranges[0];
};

export const integerInRange = (
  min: number,
  max: number,
  random: () => number
) => min + Math.floor(random() * (max - min + 1));

export const createBooleanRecord = (ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, false])) as Record<string, boolean>;

export const createNumberRecord = (ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, 0])) as Record<string, number>;

export const hashString = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

export const compareLeaderboardPlayers = (left: Player, right: Player) => {
  if (left.totalSegmentsTaken !== right.totalSegmentsTaken) {
    return left.totalSegmentsTaken - right.totalSegmentsTaken;
  }

  if (left.totalShotsTaken !== right.totalShotsTaken) {
    return left.totalShotsTaken - right.totalShotsTaken;
  }

  return left.name.localeCompare(right.name, 'en-GB');
};

export const formatShotLabel = (shotCount: number) =>
  shotCount === 1 ? '1 shot' : `${shotCount} shots`;

export const formatSegmentLabel = (segmentCount: number) =>
  segmentCount === 1 ? '1 segment' : `${segmentCount} segments`;
