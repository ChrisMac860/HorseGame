import { useEffect, useState } from 'react';
import { validateBet, getCurrentBettingPlayerId, getCurrentRound, getPlayerById } from '../lib/game';
import { MAX_SEGMENT_STAKE } from '../lib/constants';
import type { Bet, SessionState } from '../lib/types';
import { BeerMeter } from './BeerMeter';

interface BettingViewProps {
  session: SessionState;
  onPlaceBet: (bet: Bet) => void;
  onStartRace: () => void;
}

export function BettingView({
  session,
  onPlaceBet,
  onStartRace
}: BettingViewProps) {
  const round = getCurrentRound(session);
  const currentPlayerId = getCurrentBettingPlayerId(round);
  const currentPlayer = currentPlayerId ? getPlayerById(session, currentPlayerId) : null;
  const [selectedHorseId, setSelectedHorseId] = useState(round.horses[0]?.id ?? '');
  const [segmentStake, setSegmentStake] = useState(1);
  const [shotStake, setShotStake] = useState(false);
  const [useExtraBeer, setUseExtraBeer] = useState(false);

  useEffect(() => {
    setSelectedHorseId(round.horses[0]?.id ?? '');
    setSegmentStake(1);
    setShotStake(false);
    setUseExtraBeer(false);
  }, [currentPlayerId, round.horses]);

  useEffect(() => {
    if (!currentPlayer) {
      return;
    }

    if (segmentStake <= currentPlayer.currentSegments) {
      setUseExtraBeer(false);
    }
  }, [currentPlayer, segmentStake]);

  if (!currentPlayer) {
    return (
      <section className="phase-shell">
        <div className="panel panel--hero">
          <p className="eyebrow">Betting locked</p>
          <h1>All bets are in</h1>
          <p>The board is set. Start the race when everyone is ready.</p>
          <button type="button" className="button button--primary" onClick={onStartRace}>
            Start race
          </button>
        </div>

        <div className="panel">
          <h2>Confirmed bets</h2>
          <BetList session={session} />
        </div>
      </section>
    );
  }

  const draftBet: Bet = {
    playerId: currentPlayer.id,
    horseId: selectedHorseId,
    segmentStake,
    shotStake,
    usedExtraBeerForThisBet: useExtraBeer
  };
  const validation = validateBet(session, draftBet);
  const canUseExtraBeer =
    !currentPlayer.usedExtraBeerThisRound && segmentStake > currentPlayer.currentSegments;

  return (
    <section className="phase-shell">
      <div className="panel panel--hero">
        <div className="panel__header">
          <p className="eyebrow">Round {round.roundNumber}</p>
          <h1>{currentPlayer.name} to bet</h1>
        </div>

        <div className="betting-grid">
          <div className="betting-main">
            <div className="horse-picker-grid">
              {round.horses.map((horse) => (
                <button
                  key={horse.id}
                  type="button"
                  className={`horse-card ${
                    selectedHorseId === horse.id ? 'is-selected' : ''
                  }`}
                  onClick={() => setSelectedHorseId(horse.id)}
                >
                  <span className="horse-card__lane">Lane {horse.lane + 1}</span>
                  <strong>{horse.name}</strong>
                </button>
              ))}
            </div>

            <div className="stake-grid">
              <div className="stake-group">
                <h2>Segments</h2>
                <div className="segment-chip-row">
                  {Array.from({ length: MAX_SEGMENT_STAKE + 1 }, (_, value) => (
                    <button
                      key={value}
                      type="button"
                      className={`chip-button ${
                        value === segmentStake ? 'is-selected' : ''
                      }`}
                      onClick={() => setSegmentStake(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              {session.hostSettings.shotsEnabled ? (
                <button
                  type="button"
                  className={`toggle-row ${shotStake ? 'is-on' : ''}`}
                  onClick={() => setShotStake((currentValue) => !currentValue)}
                  aria-pressed={shotStake}
                >
                  <span>Include a shot</span>
                  <span>{shotStake ? 'Yes' : 'No'}</span>
                </button>
              ) : null}

              <button
                type="button"
                className={`toggle-row ${useExtraBeer ? 'is-on' : ''}`}
                onClick={() => {
                  if (canUseExtraBeer) {
                    setUseExtraBeer((currentValue) => !currentValue);
                  }
                }}
                disabled={!canUseExtraBeer}
                aria-pressed={useExtraBeer}
              >
                <span>Open extra beer</span>
                <span>
                  {canUseExtraBeer
                    ? useExtraBeer
                      ? '+8 added'
                      : 'Needed for this stake'
                    : currentPlayer.usedExtraBeerThisRound
                      ? 'Already used'
                      : 'Not needed'}
                </span>
              </button>
            </div>
          </div>

          <aside className="betting-side">
            <div className="info-card">
              <h2>{currentPlayer.name}</h2>
              <BeerMeter segments={currentPlayer.currentSegments + (useExtraBeer ? 8 : 0)} />
              <p>
                Session totals: {currentPlayer.totalSegmentsTaken} segments taken,{' '}
                {currentPlayer.totalShotsTaken} shots taken
              </p>
            </div>

            {validation.message ? (
              <div className="validation-list">
                <p>{validation.message}</p>
              </div>
            ) : null}

            <button
              type="button"
              className="button button--primary"
              onClick={() => onPlaceBet(draftBet)}
              disabled={!validation.isValid}
            >
              Confirm bet
            </button>
          </aside>
        </div>
      </div>

      <div className="panel">
        <div className="panel__header">
          <p className="eyebrow">Open betting</p>
          <h2>Confirmed bets so far</h2>
        </div>
        <BetList session={session} />
      </div>
    </section>
  );
}

function BetList({ session }: { session: SessionState }) {
  const round = getCurrentRound(session);

  if (round.bets.length === 0) {
    return <p className="muted-copy">No bets confirmed yet.</p>;
  }

  return (
    <div className="summary-list">
      {round.bets.map((bet) => {
        const player = getPlayerById(session, bet.playerId);
        const horse = round.horses.find((candidate) => candidate.id === bet.horseId);

        return (
          <div className="summary-row" key={`${bet.playerId}-${bet.horseId}`}>
            <strong>{player?.name}</strong>
            <span>{horse?.name}</span>
            <span>{bet.segmentStake} segments</span>
            <span>{bet.shotStake ? 'Shot included' : 'No shot'}</span>
          </div>
        );
      })}
    </div>
  );
}
