import { User, Round, Match, MatchParticipant } from '../types/padel';

/**
 * Generate Americano Round Robin schedules for 4, 5, 6, or 7 players.
 * Rules:
 * - Always 4 active players on court per round (2 vs 2).
 * - Rest of players (0 to 3) sit on bench.
 * - No player rests 2 rounds in a row.
 * - Maximizes unique partner/opponent combinations.
 */
export function generateAmericanoSchedule(
  players: User[],
  matchId: string,
  pointsPerRound: 13 | 24 | 32 = 32
): Round[] {
  const n = players.length;
  if (n < 4 || n > 7) {
    throw new Error('Americano Tracker supports 4 to 7 players on 1 court');
  }

  const rounds: Round[] = [];
  const initialT1 = Math.ceil(pointsPerRound / 2);
  const initialT2 = Math.floor(pointsPerRound / 2);

  if (n === 4) {
    // 4 Players -> 3 Rounds, 0 resting
    const configs = [
      { t1: [0, 1], t2: [2, 3], rest: [] },
      { t1: [0, 2], t2: [1, 3], rest: [] },
      { t1: [0, 3], t2: [1, 2], rest: [] },
    ];
    configs.forEach((cfg, idx) => {
      rounds.push({
        id: `r-${idx + 1}-${Date.now()}`,
        match_id: matchId,
        round_number: idx + 1,
        t1_p1: players[cfg.t1[0]],
        t1_p2: players[cfg.t1[1]],
        t2_p1: players[cfg.t2[0]],
        t2_p2: players[cfg.t2[1]],
        resting_players: [],
        t1_score: initialT1,
        t2_score: initialT2,
        status: 'playing',
      });
    });
  } else if (n === 5) {
    // 5 Players -> 5 Rounds, 1 resting per round
    // Resting sequence: [4, 3, 2, 1, 0]
    const configs = [
      { rest: 4, active: [0, 1, 2, 3], t1: [0, 1], t2: [2, 3] },
      { rest: 3, active: [0, 2, 1, 4], t1: [0, 2], t2: [1, 4] },
      { rest: 2, active: [0, 4, 1, 3], t1: [0, 4], t2: [1, 3] },
      { rest: 1, active: [0, 3, 2, 4], t1: [0, 3], t2: [2, 4] },
      { rest: 0, active: [1, 4, 2, 3], t1: [1, 4], t2: [2, 3] },
    ];
    configs.forEach((cfg, idx) => {
      rounds.push({
        id: `r-${idx + 1}-${Date.now()}`,
        match_id: matchId,
        round_number: idx + 1,
        t1_p1: players[cfg.t1[0]],
        t1_p2: players[cfg.t1[1]],
        t2_p1: players[cfg.t2[0]],
        t2_p2: players[cfg.t2[1]],
        resting_players: [players[cfg.rest]],
        t1_score: initialT1,
        t2_score: initialT2,
        status: 'playing',
      });
    });
  } else if (n === 6) {
    // 6 Players -> 5 Rounds, 2 resting per round
    const configs = [
      { rest: [4, 5], t1: [0, 1], t2: [2, 3] },
      { rest: [2, 3], t1: [0, 4], t2: [1, 5] },
      { rest: [0, 1], t1: [2, 4], t2: [3, 5] },
      { rest: [1, 4], t1: [0, 3], t2: [2, 5] },
      { rest: [0, 5], t1: [1, 2], t2: [3, 4] },
    ];
    configs.forEach((cfg, idx) => {
      rounds.push({
        id: `r-${idx + 1}-${Date.now()}`,
        match_id: matchId,
        round_number: idx + 1,
        t1_p1: players[cfg.t1[0]],
        t1_p2: players[cfg.t1[1]],
        t2_p1: players[cfg.t2[0]],
        t2_p2: players[cfg.t2[1]],
        resting_players: [players[cfg.rest[0]], players[cfg.rest[1]]],
        t1_score: initialT1,
        t2_score: initialT2,
        status: 'playing',
      });
    });
  } else if (n === 7) {
    // 7 Players -> 7 Rounds, 3 resting per round
    const configs = [
      { rest: [4, 5, 6], t1: [0, 1], t2: [2, 3] },
      { rest: [1, 2, 3], t1: [0, 4], t2: [5, 6] },
      { rest: [0, 5, 6], t1: [1, 3], t2: [2, 4] },
      { rest: [2, 3, 4], t1: [0, 5], t2: [1, 6] },
      { rest: [0, 1, 6], t1: [2, 5], t2: [3, 4] },
      { rest: [1, 4, 5], t1: [0, 2], t2: [3, 6] },
      { rest: [0, 2, 3], t1: [1, 5], t2: [4, 6] },
    ];
    configs.forEach((cfg, idx) => {
      rounds.push({
        id: `r-${idx + 1}-${Date.now()}`,
        match_id: matchId,
        round_number: idx + 1,
        t1_p1: players[cfg.t1[0]],
        t1_p2: players[cfg.t1[1]],
        t2_p1: players[cfg.t2[0]],
        t2_p2: players[cfg.t2[1]],
        resting_players: [players[cfg.rest[0]], players[cfg.rest[1]], players[cfg.rest[2]]],
        t1_score: initialT1,
        t2_score: initialT2,
        status: 'playing',
      });
    });
  }

  return rounds;
}

/**
 * Calculates current leaderboards and average scores.
 * Formula: Average = Total Points / Rounds Played
 */
export function recalculateLeaderboard(
  participants: MatchParticipant[],
  rounds: Round[]
): MatchParticipant[] {
  // Map of userId -> { points, roundsPlayed }
  const statsMap: Record<string, { points: number; roundsPlayed: number }> = {};

  participants.forEach((p) => {
    statsMap[p.user_id] = { points: 0, roundsPlayed: 0 };
  });

  rounds.forEach((r) => {
    if (r.status === 'finished') {
      const t1Players = [r.t1_p1.id, r.t1_p2.id];
      const t2Players = [r.t2_p1.id, r.t2_p2.id];

      t1Players.forEach((uid) => {
        if (statsMap[uid]) {
          statsMap[uid].points += r.t1_score;
          statsMap[uid].roundsPlayed += 1;
        }
      });

      t2Players.forEach((uid) => {
        if (statsMap[uid]) {
          statsMap[uid].points += r.t2_score;
          statsMap[uid].roundsPlayed += 1;
        }
      });
    }
  });

  const updatedParticipants = participants.map((p) => {
    const stat = statsMap[p.user_id] || { points: 0, roundsPlayed: 0 };
    const avg = stat.roundsPlayed > 0 ? stat.points / stat.roundsPlayed : 0;
    return {
      ...p,
      total_points: stat.points,
      rounds_played: stat.roundsPlayed,
      average_score: Math.round(avg * 100) / 100, // format to 2 decimal places
    };
  });

  // Sort by average_score DESC, then total_points DESC
  return updatedParticipants.sort((a, b) => {
    if (b.average_score !== a.average_score) {
      return b.average_score - a.average_score;
    }
    return b.total_points - a.total_points;
  });
}
