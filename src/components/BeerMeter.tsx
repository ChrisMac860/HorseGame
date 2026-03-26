import { SEGMENTS_PER_BEER } from '../lib/constants';

interface BeerMeterProps {
  segments: number;
  compact?: boolean;
}

export function BeerMeter({ segments, compact = false }: BeerMeterProps) {
  const safeSegments = Math.max(0, segments);
  const beerCount = Math.max(1, Math.ceil(safeSegments / SEGMENTS_PER_BEER));
  const rows = Array.from({ length: beerCount }, (_, index) => {
    const remaining = safeSegments - index * SEGMENTS_PER_BEER;
    return Math.max(0, Math.min(SEGMENTS_PER_BEER, remaining));
  });

  return (
    <div className={`beer-meter ${compact ? 'is-compact' : ''}`}>
      <div className="beer-meter__count">{safeSegments} segments available</div>
      <div className="beer-meter__rows">
        {rows.map((filledSegments, index) => (
          <div className="beer-meter__row" key={`${filledSegments}-${index}`}>
            {Array.from({ length: SEGMENTS_PER_BEER }, (_, cellIndex) => (
              <span
                key={cellIndex}
                className={`beer-meter__cell ${
                  cellIndex < filledSegments ? 'is-filled' : ''
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
