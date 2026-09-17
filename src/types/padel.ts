export interface User {
  id: string;
  telegram_id?: number;
  first_name: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  total_matches_played: number;
  global_average_score: number;
}

export type MatchStatus = 'lobby' | 'in_progress' | 'completed';

export interface MatchParticipant {
  id: string;
  match_id: string;
  user_id: string;
  user: User;
  total_points: number;
  rounds_played: number;
  average_score: number; // total_points / rounds_played
}

export interface Round {
  id: string;
  match_id: string;
  round_number: number;
  t1_p1: User;
  t1_p2: User;
  t2_p1: User;
  t2_p2: User;
  resting_players: User[];
  t1_score: number;
  t2_score: number;
  status: 'playing' | 'finished';
}

export interface Match {
  id: string;
  creator_id: string;
  created_at: string;
  title: string;
  status: MatchStatus;
  points_per_round: 13 | 24 | 32;
  participants: MatchParticipant[];
  rounds: Round[];
  current_round_index: number;
}
