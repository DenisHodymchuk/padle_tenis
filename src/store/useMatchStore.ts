'use client';

import { useState, useEffect } from 'react';
import { Match, User, MatchStatus } from '../types/padel';
import { createInitialDemoMatch, SAMPLE_PLAYERS } from '../lib/mockData';
import { generateAmericanoSchedule, recalculateLeaderboard } from '../lib/americanoLogic';
import { getCurrentUser, triggerHapticFeedback } from '../lib/telegram';

const STORAGE_KEY = 'padel_americano_current_match';

export function useMatchStore() {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(SAMPLE_PLAYERS[0]);

  useEffect(() => {
    // Initialize currentUser from Telegram SDK
    const u = getCurrentUser();
    setCurrentUser(u);

    // Load saved match from localStorage or initialize demo match
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setCurrentMatch(JSON.parse(saved));
          return;
        } catch (e) {
          console.error('Failed to parse saved match:', e);
        }
      }
      // Fallback: create demo 5-player match
      const demo = createInitialDemoMatch(5, 32);
      setCurrentMatch(demo);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
    }
  }, []);

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
    return newMatch;
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
