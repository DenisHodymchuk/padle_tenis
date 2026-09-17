import { User, Match } from '../types/padel';
import { generateAmericanoSchedule, recalculateLeaderboard } from './americanoLogic';

export const SAMPLE_PLAYERS: User[] = [
  {
    id: 'u-1',
    telegram_id: 101,
    first_name: 'Андрій',
    last_name: 'Шевченко',
    username: 'sheva_padel',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    total_matches_played: 28,
    global_average_score: 19.2,
  },
  {
    id: 'u-2',
    telegram_id: 102,
    first_name: 'Олена',
    last_name: 'Ковальчук',
    username: 'elena_k',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    total_matches_played: 22,
    global_average_score: 18.5,
  },
  {
    id: 'u-3',
    telegram_id: 103,
    first_name: 'Максим',
    last_name: 'Бойко',
    username: 'max_boyko',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    total_matches_played: 35,
    global_average_score: 17.9,
  },
  {
    id: 'u-4',
    telegram_id: 104,
    first_name: 'Віктор',
    last_name: 'Ткаченко',
    username: 'v_tkachenko',
    avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    total_matches_played: 19,
    global_average_score: 16.8,
  },
  {
    id: 'u-5',
    telegram_id: 105,
    first_name: 'Дмитро',
    last_name: 'Мельник',
    username: 'dima_melnyk',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    total_matches_played: 15,
    global_average_score: 16.2,
  },
  {
    id: 'u-6',
    telegram_id: 106,
    first_name: 'Юлія',
    last_name: 'Савченко',
    username: 'julia_padel',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    total_matches_played: 11,
    global_average_score: 15.7,
  },
  {
    id: 'u-7',
    telegram_id: 107,
    first_name: 'Тарас',
    last_name: 'Петренко',
    username: 'taras_p',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    total_matches_played: 8,
    global_average_score: 14.9,
  },
];

export function createInitialDemoMatch(playerCount: number = 5, pointsPerRound: 13 | 24 | 32 = 32): Match {
  const selectedPlayers = SAMPLE_PLAYERS.slice(0, playerCount);
  const matchId = 'demo-match-1';

  const initialParticipants = selectedPlayers.map((u, i) => ({
    id: `part-${i + 1}`,
    match_id: matchId,
    user_id: u.id,
    user: u,
    total_points: 0,
    rounds_played: 0,
    average_score: 0,
  }));

  const rounds = generateAmericanoSchedule(selectedPlayers, matchId, pointsPerRound);

  // Mark first round finished for demo realism
  if (rounds.length > 0) {
    rounds[0].t1_score = 18;
    rounds[0].t2_score = 14;
    rounds[0].status = 'finished';
  }

  const updatedParticipants = recalculateLeaderboard(initialParticipants, rounds);

  return {
    id: matchId,
    creator_id: selectedPlayers[0].id,
    created_at: new Date().toISOString(),
    title: `Падел Американка (${playerCount} гравців)`,
    status: 'in_progress',
    points_per_round: pointsPerRound,
    participants: updatedParticipants,
    rounds: rounds,
    current_round_index: 1, // Round 2 is playing
  };
}
