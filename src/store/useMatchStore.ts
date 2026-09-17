'use client';

import { useState, useEffect } from 'react';
import { Match, User, MatchStatus, MatchParticipant } from '../types/padel';
import { generateAmericanoSchedule, recalculateLeaderboard } from '../lib/americanoLogic';
import { getCurrentUser, triggerHapticFeedback } from '../lib/telegram';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = 'padel_americano_current_match';

export function formatUuid(prefix: 'user' | 'match' | 'part', raw: string | number): string {
  const str = String(raw).replace(/[^0-9]/g, '');
  const pad = (str || '1').padStart(12, '0').slice(-12);
  const typeByte = prefix === 'user' ? '8000' : prefix === 'match' ? '9000' : 'a000';
  return `00000000-0000-4000-${typeByte}-${pad}`;
}

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

    const rawMatchId = currentMatch.id.replace(/[^0-9]/g, '');
    const dbMatchId = formatUuid('match', rawMatchId);

    // Channel for rounds changes (scores)
    const roundsChannel = supabase
      .channel(`rounds:${currentMatch.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rounds' },
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
        { event: '*', schema: 'public', table: 'match_participants' },
        async (payload) => {
          const newPart = payload.new as any;
          if (!newPart || !newPart.user_id) return;

          // Fetch joining user details from Supabase users table
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', newPart.user_id)
            .maybeSingle();

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
              const exists = prev.participants.some(
                (p) => p.user_id === joiningUser.id || (joiningUser.telegram_id && p.user.telegram_id === joiningUser.telegram_id)
              );
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

  const syncUserToSupabase = async (user: User): Promise<User> => {
    if (!supabase || !user.telegram_id) return user;
    const dbUserId = formatUuid('user', user.telegram_id);
    try {
      const { data, error } = await supabase.from('users').upsert({
        id: dbUserId,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        avatar_url: user.avatar_url,
      }, { onConflict: 'telegram_id' }).select().single();

      if (error) {
        console.warn('Supabase user upsert error:', error);
      }

      if (data) {
        const updated: User = {
          ...user,
          id: data.id,
          total_matches_played: data.total_matches_played || 0,
          global_average_score: Number(data.global_average_score) || 0,
        };
        setCurrentUser(updated);
        return updated;
      }
    } catch (err) {
      console.warn('Supabase sync user warning:', err);
    }
    return { ...user, id: dbUserId };
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

  const createLobbyMatch = async (playerCount: number = 5, pointsPerRound: 13 | 24 | 32 = 32, title?: string) => {
    const activeUser = await syncUserToSupabase(currentUser);
    const rawTs = Date.now();
    const matchId = `match-${rawTs}`;
    const dbMatchId = formatUuid('match', rawTs);
    const dbUserId = formatUuid('user', activeUser.telegram_id || activeUser.id);
    const dbPartId = formatUuid('part', rawTs);

    const creatorParticipant: MatchParticipant = {
      id: dbPartId,
      match_id: matchId,
      user_id: activeUser.id,
      user: activeUser,
      total_points: 0,
      rounds_played: 0,
      average_score: 0,
    };

    const newMatch: Match = {
      id: matchId,
      creator_id: activeUser.id,
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
      try {
        const { error: matchErr } = await supabase.from('matches').insert({
          id: dbMatchId,
          creator_id: dbUserId,
          title: newMatch.title,
          status: 'lobby',
          points_per_round: pointsPerRound,
        });
        if (matchErr) console.error('Supabase match insert error:', matchErr);

        const { error: partErr } = await supabase.from('match_participants').insert({
          id: dbPartId,
          match_id: dbMatchId,
          user_id: dbUserId,
        });
        if (partErr) console.error('Supabase participant insert error:', partErr);
      } catch (err) {
        console.warn('Supabase match insert warning:', err);
      }
    }

    return newMatch;
  };

  /**
   * Handle joining a match via Deep Link (from Telegram start_param)
   */
  const joinMatchByDeepLink = async (startParam: string): Promise<Match | null> => {
    const activeUser = await syncUserToSupabase(currentUser);
    const rawId = startParam ? startParam.replace(/^(match_|match-)+/, '').trim() : '';

    const matchIdHyphen = rawId ? `match-${rawId}` : '';
    const dbMatchId = rawId ? formatUuid('match', rawId) : '';
    const dbUserId = formatUuid('user', activeUser.telegram_id || activeUser.id);

    let targetMatchData: any = null;

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Try fetching exact match ID
        if (rawId) {
          const { data: matches, error: mErr } = await supabase
            .from('matches')
            .select('*')
            .or(`id.eq.${dbMatchId},id.eq.${rawId},id.eq.${matchIdHyphen}`)
            .order('created_at', { ascending: false });

          if (mErr) console.error('Supabase fetch match error:', mErr);
          if (matches && matches.length > 0) {
            targetMatchData = matches[0];
          }
        }

        // 2. Fallback: search for any active lobby in Supabase created recently
        if (!targetMatchData) {
          const { data: activeLobbies, error: lErr } = await supabase
            .from('matches')
            .select('*')
            .eq('status', 'lobby')
            .order('created_at', { ascending: false })
            .limit(1);

          if (lErr) console.error('Supabase fetch active lobbies error:', lErr);
          if (activeLobbies && activeLobbies.length > 0) {
            targetMatchData = activeLobbies[0];
          }
        }

        if (targetMatchData) {
          // Add activeUser to match_participants if not already joined
          const dbPartId = formatUuid('part', Date.now());
          const { error: insErr } = await supabase.from('match_participants').upsert({
            id: dbPartId,
            match_id: targetMatchData.id,
            user_id: dbUserId,
          }, { onConflict: 'match_id,user_id' });

          if (insErr) console.error('Supabase join participant error:', insErr);

          // Fetch all updated participants for this lobby
          const { data: partsData, error: pErr } = await supabase
            .from('match_participants')
            .select('*, users(*)')
            .eq('match_id', targetMatchData.id);

          if (pErr) console.error('Supabase fetch participants error:', pErr);

          const participants: MatchParticipant[] = (partsData || []).map((p: any) => ({
            id: p.id,
            match_id: p.match_id,
            user_id: p.user_id,
            user: {
              id: p.users?.id || p.user_id,
              telegram_id: p.users?.telegram_id,
              first_name: p.users?.first_name || 'Учасник',
              last_name: p.users?.last_name || '',
              username: p.users?.username || '',
              avatar_url: p.users?.avatar_url || 'https://ui-avatars.com/api/?name=Padel',
              total_matches_played: p.users?.total_matches_played || 0,
              global_average_score: Number(p.users?.global_average_score) || 0,
            },
            total_points: p.total_points || 0,
            rounds_played: p.rounds_played || 0,
            average_score: Number(p.average_score) || 0,
          }));

          const syncedMatch: Match = {
            id: `match-${targetMatchData.id.replace(/[^0-9]/g, '')}`,
            creator_id: targetMatchData.creator_id,
            created_at: targetMatchData.created_at,
            title: targetMatchData.title,
            status: targetMatchData.status as MatchStatus,
            points_per_round: targetMatchData.points_per_round as 13 | 24 | 32,
            participants,
            rounds: [],
            current_round_index: targetMatchData.current_round_index || 0,
          };

          triggerHapticFeedback('success');
          saveMatch(syncedMatch);
          return syncedMatch;
        }
      } catch (err) {
        console.warn('Supabase fetch match by deep link warning:', err);
      }
    }

    if (currentMatch) return currentMatch;
    return await createLobbyMatch(5, 32);
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

  const cancelCurrentMatch = async () => {
    if (currentMatch && isSupabaseConfigured && supabase) {
      const rawMatchId = currentMatch.id.replace(/[^0-9]/g, '');
      const dbMatchId = formatUuid('match', rawMatchId);
      try {
        await supabase.from('matches').delete().or(`id.eq.${dbMatchId},id.eq.${currentMatch.id}`);
        await supabase.from('match_participants').delete().or(`match_id.eq.${dbMatchId},match_id.eq.${currentMatch.id}`);
        await supabase.from('rounds').delete().or(`match_id.eq.${dbMatchId},match_id.eq.${currentMatch.id}`);
      } catch (e) {
        console.warn('Failed to delete match from Supabase:', e);
      }
    }
    triggerHapticFeedback('warning');
    saveMatch(null);
  };

  const resetMatch = () => {
    cancelCurrentMatch();
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
    cancelCurrentMatch,
  };
}
