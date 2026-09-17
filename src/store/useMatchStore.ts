'use client';

import { useState, useEffect } from 'react';
import { Match, User, MatchStatus } from '../types/padel';
import { createInitialDemoMatch, SAMPLE_PLAYERS } from '../lib/mockData';
import { generateAmericanoSchedule, recalculateLeaderboard } from '../lib/americanoLogic';
import { getCurrentUser, triggerHapticFeedback } from '../lib/telegram';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = 'padel_americano_current_match';

export function useMatchStore() {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(SAMPLE_PLAYERS[0]);

  useEffect(() => {
    // Initialize currentUser from Telegram SDK
    const u = getCurrentUser();
    setCurrentUser(u);

    // If Supabase is configured, sync user to database
    if (isSupabaseConfigured && supabase) {
      syncUserToSupabase(u);
    }

    // Load saved match from localStorage or Supabase
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setCurrentMatch(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse saved match:', e);
        }
      } else {
        const demo = createInitialDemoMatch(5, 32);
        setCurrentMatch(demo);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
      }
    }
  }, []);

  // Supabase Realtime Score Synchronization
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !currentMatch?.id) return;

    const channel = supabase
      .channel(`match:${currentMatch.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rounds', filter: `match_id=eq.${currentMatch.id}` },
        (payload) => {
          const updatedRound = payload.new;
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
    if (!supabase) return;
    try {
      await supabase.from('users').upsert({
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        avatar_url: user.avatar_url,
      });
    } catch (err) {
      console.warn('Supabase sync user warning:', err);
    }
  };

  const saveMatch = (match: Match | null) => {
    setCurrentMatch(match);
    if (typeof window !== 'undefined') {
      if (match) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(match));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  const createMatch = (playerCount: number = 5, pointsPerRound: 13 | 24 | 32 = 32, title?: string) => {
    const selectedPlayers = SAMPLE_PLAYERS.slice(0, playerCount);
    const matchId = `match-${Date.now()}`;

    const participants = selectedPlayers.map((u, i) => ({
      id: `part-${i + 1}-${Date.now()}`,
      match_id: matchId,
      user_id: u.id,
      user: u,
      total_points: 0,
      rounds_played: 0,
      average_score: 0,
    }));

    const rounds = generateAmericanoSchedule(selectedPlayers, matchId, pointsPerRound);

    const newMatch: Match = {
      id: matchId,
      creator_id: currentUser.id,
      created_at: new Date().toISOString(),
      title: title || `Падел Американка (${playerCount} гравців)`,
      status: 'in_progress',
      points_per_round: pointsPerRound,
      participants: recalculateLeaderboard(participants, rounds),
      rounds,
      current_round_index: 0,
    };

    triggerHapticFeedback('success');
    saveMatch(newMatch);

    // Save asynchronously to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      saveMatchToSupabase(newMatch);
    }

    return newMatch;
  };

  const saveMatchToSupabase = async (match: Match) => {
    if (!supabase) return;
    try {
      await supabase.from('matches').insert({
        id: match.id,
        title: match.title,
        status: match.status,
        points_per_round: match.points_per_round,
      });
    } catch (e) {
      console.warn('Supabase save match warning:', e);
    }
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

    // Broadcast score change to Supabase if configured
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

    if (isSupabaseConfigured && supabase) {
      supabase.from('rounds').upsert({
        id: rounds[idx].id,
        status: 'finished',
        t1_score: rounds[idx].t1_score,
        t2_score: rounds[idx].t2_score,
      }).then(() => {}).catch(() => {});
    }
  };

  const resetMatch = () => {
    saveMatch(null);
  };

  return {
    currentMatch,
    currentUser,
    createMatch,
    updateCurrentRoundScore,
    finishCurrentRound,
    resetMatch,
  };
}
