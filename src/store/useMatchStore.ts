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
        } catch (e) {
          console.error('Failed to parse saved match:', e);
        }
      }
    }
  }, []);

  // Supabase Realtime Score & Lobby Synchronization
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !currentMatch?.id) return;

    // Channel for rounds changes (scores)
    const roundsChannel = supabase
      .channel(`rounds:${currentMatch.id}`)
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

    // Channel for lobby participants changes (friends joining via deep link)
    const participantsChannel = supabase
      .channel(`participants:${currentMatch.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_participants', filter: `match_id=eq.${currentMatch.id}` },
        async (payload) => {
          const newPart = payload.new as any;
          if (!newPart || !newPart.user_id) return;

          // Fetch joining user details from Supabase users table
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', newPart.user_id)
            .single();

          if (userData) {
            const joiningUser: User = {
              id: userData.id,
              telegram_id: userData.telegram_id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              username: userData.username,
              avatar_url: userData.avatar_url,
              total_matches_played: userData.total_matches_played || 0,
              global_average_score: Number(userData.global_average_score) || 0,
            };

            setCurrentMatch((prev) => {
              if (!prev) return null;
              const exists = prev.participants.some((p) => p.user_id === joiningUser.id);
              if (exists) return prev;

              const updatedParticipants: MatchParticipant[] = [
                ...prev.participants,
                {
                  id: newPart.id || `part-${Date.now()}`,
                  match_id: prev.id,
                  user_id: joiningUser.id,
                  user: joiningUser,
                  total_points: 0,
                  rounds_played: 0,
                  average_score: 0,
                },
              ];

              return {
                ...prev,
                participants: updatedParticipants,
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roundsChannel);
      supabase.removeChannel(participantsChannel);
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

    // Save match to Supabase database for realtime joining
    if (isSupabaseConfigured && supabase) {
      supabase.from('matches').insert({
        id: matchId,
        creator_id: currentUser.id,
        title: newMatch.title,
        status: 'lobby',
        points_per_round: pointsPerRound,
      }).then(() => {
        supabase.from('match_participants').insert({
          match_id: matchId,
          user_id: currentUser.id,
        });
      }).catch((err) => console.warn('Supabase match insert error:', err));
    }

    return newMatch;
  };

  /**
   * Handle joining a match via Deep Link (from Telegram start_param)
   */
  const joinMatchByDeepLink = async (startParam: string): Promise<Match | null> => {
    const rawId = startParam.replace(/^(match_|match-)+/, '').trim();
    if (!rawId) return null;

    const matchIdHyphen = `match-${rawId}`;
    const matchIdUnderscore = `match_${rawId}`;

    // Check if match is already loaded in local state
    let targetMatch =
      currentMatch?.id === matchIdHyphen ||
      currentMatch?.id === matchIdUnderscore ||
      currentMatch?.id === rawId
        ? currentMatch
        : null;

    // If not local, try fetching from Supabase
    if (!targetMatch && isSupabaseConfigured && supabase) {
      try {
        const { data: matchData } = await supabase
          .from('matches')
          .select('*')
          .or(`id.eq.${matchIdHyphen},id.eq.${matchIdUnderscore},id.eq.${rawId}`)
          .maybeSingle();

        if (matchData) {
          const { data: partsData } = await supabase
            .from('match_participants')
            .select('*, users(*)')
            .eq('match_id', matchData.id);

          const participants: MatchParticipant[] = (partsData || []).map((p: any) => ({
            id: p.id,
            match_id: p.match_id,
            user_id: p.user_id,
            user: {
              id: p.users.id,
              telegram_id: p.users.telegram_id,
              first_name: p.users.first_name,
              last_name: p.users.last_name,
              username: p.users.username,
              avatar_url: p.users.avatar_url,
              total_matches_played: p.users.total_matches_played || 0,
              global_average_score: Number(p.users.global_average_score) || 0,
            },
            total_points: p.total_points || 0,
            rounds_played: p.rounds_played || 0,
            average_score: Number(p.average_score) || 0,
          }));

          targetMatch = {
            id: matchData.id,
            creator_id: matchData.creator_id,
            created_at: matchData.created_at,
            title: matchData.title,
            status: matchData.status as MatchStatus,
            points_per_round: matchData.points_per_round as 13 | 24 | 32,
            participants,
            rounds: [],
            current_round_index: matchData.current_round_index || 0,
          };
        }
      } catch (err) {
        console.warn('Supabase fetch match by deep link warning:', err);
      }
    }

    if (!targetMatch) {
      // Fallback: create or retrieve local match container
      targetMatch = currentMatch || createLobbyMatch(5, 32);
    }

    // Check if currentUser is in participants list
    const alreadyJoined = targetMatch.participants.some((p) => p.user_id === currentUser.id);

    if (!alreadyJoined && targetMatch.participants.length < 7) {
      const newParticipant: MatchParticipant = {
        id: `part-${Date.now()}`,
        match_id: targetMatch.id,
        user_id: currentUser.id,
        user: currentUser,
        total_points: 0,
        rounds_played: 0,
        average_score: 0,
      };

      targetMatch = {
        ...targetMatch,
        participants: [...targetMatch.participants, newParticipant],
      };

      // Save to Supabase match_participants
      if (isSupabaseConfigured && supabase && currentUser.id) {
        supabase.from('match_participants').insert({
          match_id: targetMatch.id,
          user_id: currentUser.id,
        }).then(() => {}).catch(() => {});
      }
    }

    triggerHapticFeedback('success');
    saveMatch(targetMatch);
    return targetMatch;
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

    if (isSupabaseConfigured && supabase) {
      supabase.from('match_participants').insert({
        match_id: currentMatch.id,
        user_id: userToAdd.id,
      }).then(() => {}).catch(() => {});
    }
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

    if (isSupabaseConfigured && supabase) {
      supabase.from('matches').update({ status: 'in_progress' }).eq('id', currentMatch.id).then(() => {}).catch(() => {});
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

    if (isLastRound) {
      updateParticipantsGlobalStats(updatedParticipants);
    }
  };

  const updateParticipantsGlobalStats = async (participants: MatchParticipant[]) => {
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
    joinMatchByDeepLink,
    addPlayerToLobby,
    startLobbyGame,
    updateCurrentRoundScore,
    finishCurrentRound,
    resetMatch,
  };
}
