import type { CSSProperties } from 'react';

interface RaceHorseSpriteProps {
  laneNumber: number;
  isWinner: boolean;
  isFalling: boolean;
  isRunning: boolean;
  reducedMotion: boolean;
  speedPulse: number;
}

const SILK_COMBINATIONS = [
  { silk: '#ef4444' },
  { silk: '#3b82f6' },
  { silk: '#10b981' },
  { silk: '#f59e0b' },
  { silk: '#d946ef' },
  { silk: '#f8fafc' },
  { silk: '#14b8a6' },
  { silk: '#fde047' }
] as const;

export function RaceHorseSprite({
  laneNumber,
  isWinner,
  isFalling,
  isRunning,
  reducedMotion,
  speedPulse
}: RaceHorseSpriteProps) {
  const silk = SILK_COMBINATIONS[(laneNumber - 1) % SILK_COMBINATIONS.length];
  const gallopDuration = `${Math.max(0.24, 0.35 - speedPulse * 0.04)}s`;
  const style = {
    '--jockey-colour': silk.silk,
    '--gallop-duration': gallopDuration
  } as CSSProperties;

  return (
    <div
      className={`race-horse ${isWinner ? 'is-winner' : ''} ${
        isFalling ? 'is-falling' : ''
      } ${isRunning ? 'is-running' : ''} ${
        reducedMotion ? 'is-reduced-motion' : ''
      }`}
      style={style}
      aria-hidden="true"
    >
      <svg className="race-horse__svg" viewBox="0 0 100 60" role="presentation">
        <path d="M25 40 L20 55 L23 55 L28 40 Z" fill="#4a3018" />
        <path d="M35 40 L38 55 L41 55 L36 40 Z" fill="#362210" />
        <path d="M75 40 L85 52 L88 50 L78 38 Z" fill="#4a3018" />
        <path d="M70 40 L72 55 L75 55 L72 38 Z" fill="#362210" />
        <path d="M20 20 Q10 25 5 40 Q15 35 18 25 Z" fill="#1a1108" />
        <path
          d="M15 25 C15 15, 30 10, 50 15 C65 18, 75 15, 80 5 C82 0, 90 2, 95 10 C97 15, 90 25, 85 25 C82 35, 75 42, 60 42 C40 42, 20 40, 15 25 Z"
          fill="#6b4423"
        />
        <path
          d="M85 25 C82 35, 75 42, 60 42 C40 42, 20 40, 15 25 C15 15, 30 10, 50 15 C65 18, 75 15, 80 5"
          fill="none"
          stroke="#4a3018"
          strokeWidth="2"
        />
        <circle cx="85" cy="12" r="1.5" fill="#000000" />
        <path
          d="M92 12 Q95 15 90 18"
          fill="none"
          stroke="#000000"
          strokeWidth="1"
        />
        <path d="M44 16 L50 7 L60 7 L56 18 Z" fill="#e5e5e5" />
        <path
          className="race-horse__silk"
          d="M49 6 L60 6 C65 10, 61 18, 55 18 L45 15 C43 10, 47 6, 49 6 Z"
        />
        <path
          className="race-horse__helmet"
          d="M51 2 C51 -2, 62 -2, 62 2 L64 4 L50 4 Z"
        />
        <ellipse cx="57" cy="2" rx="5" ry="3" fill="rgba(0,0,0,0.2)" />
        <rect className="race-horse__saddle-cloth" x="46" y="20" width="10" height="8" rx="1.2" />
      </svg>
    </div>
  );
}
