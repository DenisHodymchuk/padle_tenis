'use client';

import { useState, useEffect } from 'react';
import { Match, User, MatchStatus, MatchParticipant } from '../types/padel';
import { generateAmericanoSchedule, recalculateLeaderboard } from '../lib/americanoLogic';
import { getCurrentUser, triggerHapticFeedback } from '../lib/telegram';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = 'padel_americano_current_match';

export function useMatchStore() {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(getCurrentUser());
  const [companyPlayers, setCompanyPlayers] = useState<User[]>([]);
  const [userMatches, setUserMatches] = useState<Match[]>([]);

  useEffect(() => {
    // 1. Initialize real currentUser from Telegram SDK
    const u = getCurrentUser();
    setCurrentUser(u);

    // 2. If Supabase is configured, sync real user and fetch company players
    if (isSupabaseConfigured && supabase) {
      syncUserToSupabase(u);
      fetchCompanyPlayers();
    }

    // 3. Load saved match from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed: Match = JSON.parse(saved);
          setCurrentMatch(parsed);
          setUserMatches([parsed]);
          return;
        } catch (e) {
          console.error('Failed to parse saved match:', e);
        }
      }
    }
  }, []);

  // Supabase Realtime Score & Lobby Synchronization
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !currentMatch?.id) return;

    const channel = supabase
      .channel(`match:${currentMatch.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rounds', filter: `match_id=eq.${currentMatch.id}` },
        (payload) => {
          const updatedRound = payload.new as any;
          if (!updatedRound) return;
          setCurrentMatch((prev) => {
            if (!prev) return null;
            const rounds = prev.rounds.map((r) =>
              r.id === updatedRound.id
                ? {
                    ...r,
                    t1_score: updatedRound.t1_score,
                    t2_score: updatedRound.t2_score,
                    status: updatedRound.status,
                  }
                : r
            );
            const updatedParticipants = recalculateLeaderboard(prev.participants, rounds);
            return {
              ...prev,
              rounds,
              participants: updatedParticipants,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentMatch?.id]);

  const syncUserToSupabase = async (user: User) => {
    if (!supabase || !user.telegram_id) return;
    try {
      const { data } = await supabase.from('users').upsert({
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        avatar_url: user.avatar_url,
      }).select().single();

      if (data) {
        setCurrentUser((prev) => ({
          ...prev,
          id: data.id,
          total_matches_played: data.total_matches_played || 0,
          global_average_score: Number(data.global_average_score) || 0,
        }));
      }
    } catch (err) {
      console.warn('Supabase sync user warning:', err);
    }
  };

  const fetchCompanyPlayers = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('users').select('*').order('global_average_score', { ascending: false });
      if (data && data.length > 0) {
        const formatted: User[] = data.map((d: any) => ({
          id: d.id,
          telegram_id: d.telegram_id,
          first_name: d.first_name,
          last_name: d.last_name,
          username: d.username,
          avatar_url: d.avatar_url,
          total_matches_played: d.total_matches_played || 0,
          global_average_score: Number(d.global_average_score) || 0,
        }));
        setCompanyPlayers(formatted);
      }
    } catch (err) {
      console.warn('Supabase fetch company players warning:', err);
    }
  };

  const saveMatch = (match: Match | null) => {
    setCurrentMatch(match);
    if (typeof window !== 'undefined') {
      if (match) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(match));
        setUserMatches((prev) => {
          const exists = prev.some((m) => m.id === match.id);
          return exists ? prev.map((m) => (m.id === match.id ? match : m)) : [match, ...prev];
        });
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  const createLobbyMatch = (playerCount: number = 5, pointsPerRound: 13 | 24 | 32 = 32, title?: string) => {
    const matchId = `match-${Date.now()}`;

    // Add ONLY the real current user as participant #1
    const creatorParticipant: MatchParticipant = {
      id: `part-1-${Date.now()}`,
      match_id: matchId,
      user_id: currentUser.id,
      user: currentUser,
      total_points: 0,
      rounds_played: 0,
      average_score: 0,
    };

    const newMatch: Match = {
      id: matchId,
      creator_id: currentUser.id,
      created_at: new Date().toISOString(),
      title: title || `Падел Американка (${playerCount} гравців)`,
      status: 'lobby',
      points_per_round: pointsPerRound,
      participants: [creatorParticipant],
      rounds: [],
      current_round_index: 0,
    };

    triggerHapticFeedback('success');
    saveMatch(newMatch);
    return newMatch;
  };

  const addPlayerToLobby = (userToAdd: User) => {
    if (!currentMatch) return;
    const exists = currentMatch.participants.some((p) => p.user_id === userToAdd.id);
    if (exists || currentMatch.participants.length >= 7) return;

    const newParticipant: MatchParticipant = {
      id: `part-${Date.now()}`,
      match_id: currentMatch.id,
      user_id: userToAdd.id,
      user: userToAdd,
      total_points: 0,
      rounds_played: 0,
      average_score: 0,
    };

    const updatedMatch: Match = {
      ...currentMatch,
      participants: [...currentMatch.participants, newParticipant],
    };

    triggerHapticFeedback('light');
    saveMatch(updatedMatch);
  };

  const startLobbyGame = () => {
    if (!currentMatch || currentMatch.participants.length < 4) return;

    const activePlayers = currentMatch.participants.map((p) => p.user);
    const rounds = generateAmericanoSchedule(activePlayers, currentMatch.id, currentMatch.points_per_round);

    const updatedMatch: Match = {
      ...currentMatch,
      status: 'in_progress',
      rounds,
      current_round_index: 0,
      participants: recalculateLeaderboard(currentMatch.participants, rounds),
    };

    triggerHapticFeedback('success');
    saveMatch(updatedMatch);
  };

  const updateCurrentRoundScore = (t1Score: number) => {
    if (!currentMatch) return;
    const rounds = [...currentMatch.rounds];
    const idx = currentMatch.current_round_index;
    if (idx < 0 || idx >= rounds.length) return;

    const limit = currentMatch.points_per_round;
    const clampedT1 = Math.max(0, Math.min(limit, t1Score));
    const clampedT2 = limit - clampedT1;

    rounds[idx] = {
      ...rounds[idx],
      t1_score: clampedT1,
      t2_score: clampedT2,
    };

    triggerHapticFeedback('light');

    const updatedParticipants = recalculateLeaderboard(currentMatch.participants, rounds);

    const updatedMatch: Match = {
      ...currentMatch,
      rounds,
      participants: updatedParticipants,
    };

    saveMatch(updatedMatch);

    if (isSupabaseConfigured && supabase && rounds[idx].id) {
      supabase.from('rounds').upsert({
        id: rounds[idx].id,
        match_id: currentMatch.id,
        t1_score: clampedT1,
        t2_score: clampedT2,
        status: rounds[idx].status,
      }).then(() => {}).catch(() => {});
    }
  };

  const finishCurrentRound = () => {
    if (!currentMatch) return;
    const rounds = [...currentMatch.rounds];
    const idx = currentMatch.current_round_index;
    if (idx < 0 || idx >= rounds.length) return;

    rounds[idx] = {
      ...rounds[idx],
      status: 'finished',
    };

    const isLastRound = idx === rounds.length - 1;
    const nextIdx = isLastRound ? idx : idx + 1;
    const newStatus: MatchStatus = isLastRound ? 'completed' : 'in_progress';

    const updatedParticipants = recalculateLeaderboard(currentMatch.participants, rounds);

    triggerHapticFeedback(isLastRound ? 'success' : 'medium');

    const updatedMatch: Match = {
      ...currentMatch,
      status: newStatus,
      rounds,
      current_round_index: nextIdx,
      participants: updatedParticipants,
    };

    saveMatch(updatedMatch);

    // If match completed, update users global stats in Supabase & local state
    if (isLastRound) {
      updateParticipantsGlobalStats(updatedParticipants);
    }
  };

  const updateParticipantsGlobalStats = async (participants: MatchParticipant[]) => {
    // Update local state for current user
    const userPart = participants.find((p) => p.user_id === currentUser.id);
    if (userPart) {
      const newMatchesCount = currentUser.total_matches_played + 1;
      const newAvg = currentUser.total_matches_played === 0
        ? userPart.average_score
        : Math.round(((currentUser.global_average_score * currentUser.total_matches_played + userPart.average_score) / newMatchesCount) * 100) / 100;

      setCurrentUser((prev) => ({
        ...prev,
        total_matches_played: newMatchesCount,
        global_average_score: newAvg,
      }));

      // Update Supabase if configured
      if (isSupabaseConfigured && supabase && currentUser.telegram_id) {
        try {
          await supabase.from('users').update({
            total_matches_played: newMatchesCount,
            global_average_score: newAvg,
          }).eq('telegram_id', currentUser.telegram_id);
          fetchCompanyPlayers();
        } catch (e) {
          console.warn('Failed to update user stats in Supabase:', e);
        }
      }
    }
  };

  const resetMatch = () => {
    saveMatch(null);
  };

  return {
    currentMatch,
    currentUser,
    companyPlayers,
    userMatches,
    createLobbyMatch,
    addPlayerToLobby,
    startLobbyGame,
    updateCurrentRoundScore,
    finishCurrentRound,
    resetMatch,
  };
}
