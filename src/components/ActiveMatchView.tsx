'use client';

import React, { useState } from 'react';
import { Match } from '../types/padel';
import { LeaderboardTable } from './LeaderboardTable';
import { Coffee, Minus, Plus, ChevronRight, CheckCircle2, Trophy, Clock, ArrowRight } from 'lucide-react';
import { triggerHapticFeedback } from '../lib/telegram';

interface ActiveMatchViewProps {
  match: Match;
  onUpdateScore: (t1Score: number) => void;
  onFinishRound: () => void;
  onViewSummary: () => void;
}

export const ActiveMatchView: React.FC<ActiveMatchViewProps> = ({
  match,
  onUpdateScore,
  onFinishRound,
  onViewSummary,
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'nextRound'>('leaderboard');

  const currentRound = match.rounds[match.current_round_index];
  const totalRounds = match.rounds.length;

  if (!currentRound) {
    return (
      <div className="p-6 text-center text-slate-300">
        <Trophy className="w-12 h-12 text-[#ccff00] mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-2">Матч завершено!</h2>
        <button
          onClick={onViewSummary}
          className="w-full neon-glow-btn py-3 rounded-xl font-bold text-sm mt-4"
        >
          Дивитися результати
        </button>
      </div>
    );
  }

  const nextRound = match.current_round_index < totalRounds - 1 ? match.rounds[match.current_round_index + 1] : null;

  const handleScoreChange = (delta: number) => {
    const newT1 = currentRound.t1_score + delta;
    if (newT1 >= 0 && newT1 <= match.points_per_round) {
      onUpdateScore(newT1);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-20 px-3 pt-3">
      {/* Round Header Progress */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="bg-[#ccff00] text-black text-xs font-black px-2.5 py-0.5 rounded-full uppercase">
            Раунд {currentRound.round_number} з {totalRounds}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Лиміт: {match.points_per_round} оч.
          </span>
        </div>
        {match.status === 'completed' ? (
          <button
            onClick={onViewSummary}
            className="text-xs text-[#ccff00] font-bold underline flex items-center gap-1"
          >
            Фінал <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Йде гра
          </span>
        )}
      </div>

      {/* BLOCK 1: COURT CARD & HUGE SCORE CONTROLLER */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-700/80 shadow-2xl relative overflow-hidden padel-court-bg">
        <div className="text-center mb-4">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
            🎾 На Корті Зараз
          </span>
        </div>

        {/* Teams Matchup Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Team A */}
          <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-3 text-center flex flex-col items-center">
            <span className="text-[10px] font-bold text-[#ccff00] mb-2 uppercase">Команда А</span>
            <div className="flex items-center gap-2 mb-2">
              <img
                src={currentRound.t1_p1.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentRound.t1_p1.first_name}
                className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover"
              />
              <img
                src={currentRound.t1_p2.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                alt={currentRound.t1_p2.first_name}
                className="w-10 h-10 rounded-full border-2 border-emerald-400 object-cover -ml-4"
              />
            </div>
            <div className="text-xs font-bold text-white leading-snug line-clamp-1">
              {currentRound.t1_p1.first_name}
            </div>
            <div className="text-xs font-bold text-white leading-snug line-clamp-1">
              {currentRound.t1_p2.first_name}
            </div>
          </div>

          {/* Team B */}
          <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-3 text-center flex flex-col items-center">
            <span className="text-[10px] font-bold text-sky-400 mb-2 uppercase">Команда Б</span>
            <div className="flex items-center gap-2 mb-2">
              <img
                src={currentRound.t2_p1.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                alt={currentRound.t2_p1.first_name}
                className="w-10 h-10 rounded-full border-2 border-sky-400 object-cover"
              />
              <img
                src={currentRound.t2_p2.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                alt={currentRound.t2_p2.first_name}
                className="w-10 h-10 rounded-full border-2 border-sky-400 object-cover -ml-4"
              />
            </div>
            <div className="text-xs font-bold text-white leading-snug line-clamp-1">
              {currentRound.t2_p1.first_name}
            </div>
            <div className="text-xs font-bold text-white leading-snug line-clamp-1">
              {currentRound.t2_p2.first_name}
            </div>
          </div>
        </div>

        {/* HUGE SCORE CONTROLLER (Sweaty hands ergonomic >30% width buttons) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-inner">
          <button
            onClick={() => handleScoreChange(-1)}
            disabled={currentRound.t1_score <= 0}
            className="w-5/12 h-16 bg-slate-800 active:bg-slate-700 disabled:opacity-30 rounded-xl flex items-center justify-center text-white transition-all border border-slate-700"
          >
            <Minus className="w-8 h-8 text-[#ccff00]" />
          </button>

          <div className="text-center px-2 min-w-[110px]">
            <div className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              <span className="text-[#ccff00]">{currentRound.t1_score}</span>
              <span className="text-slate-600">:</span>
              <span className="text-sky-400">{currentRound.t2_score}</span>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Рахунок</span>
          </div>

          <button
            onClick={() => handleScoreChange(+1)}
            disabled={currentRound.t1_score >= match.points_per_round}
            className="w-5/12 h-16 bg-[#ccff00] active:bg-[#b8e600] disabled:opacity-30 rounded-xl flex items-center justify-center text-black transition-all border border-lime-300 shadow-md shadow-lime-900/20"
          >
            <Plus className="w-8 h-8 text-black" />
          </button>
        </div>
      </div>

      {/* BLOCK 2: BENCH (RESTING PLAYERS) */}
      <div className="glass-panel rounded-2xl p-3.5 border border-slate-800/80 bg-slate-900/40 opacity-90">
        <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold">
          <Coffee className="w-4 h-4 text-amber-400" />
          Лава Запасних (Відпочивають ☕️):
        </div>
        {currentRound.resting_players.length === 0 ? (
          <p className="text-xs text-slate-500 italic pl-6">Усі 4 гравці беруть участь у цій грі</p>
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto py-1">
            {currentRound.resting_players.map((rp) => (
              <div
                key={rp.id}
                className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/60 rounded-xl px-3 py-1.5 shrink-0"
              >
                <img
                  src={rp.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={rp.first_name}
                  className="w-6 h-6 rounded-full object-cover border border-amber-400/50"
                />
                <span className="text-xs font-bold text-slate-200">{rp.first_name}</span>
                <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 px-1.5 py-0.5 rounded">
                  Лава
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BLOCK 3: TABS (LEADERBOARD vs NEXT ROUND PREVIEW) */}
      <div className="space-y-3">
        <div className="flex bg-slate-900/90 rounded-xl p-1 border border-slate-800">
          <button
            onClick={() => {
              setActiveTab('leaderboard');
              triggerHapticFeedback('light');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-slate-800 text-[#ccff00] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Таблиця очок
          </button>
          <button
            onClick={() => {
              setActiveTab('nextRound');
              triggerHapticFeedback('light');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'nextRound'
                ? 'bg-slate-800 text-[#ccff00] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Наступний раунд {nextRound ? `(#${nextRound.round_number})` : ''}
          </button>
        </div>

        {activeTab === 'leaderboard' ? (
          <LeaderboardTable participants={match.participants} />
        ) : (
          <div className="glass-panel rounded-2xl p-4 border border-slate-800">
            {nextRound ? (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Раунд #{nextRound.round_number} Анонс</span>
                  <span className="text-slate-400 text-[10px]">Далі в грі</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-emerald-400 font-bold block mb-1">Команда А</span>
                    <span className="text-white font-medium">
                      {nextRound.t1_p1.first_name} + {nextRound.t1_p2.first_name}
                    </span>
                  </div>
                  <span className="text-slate-500 font-black">VS</span>
                  <div className="text-right">
                    <span className="text-sky-400 font-bold block mb-1">Команда Б</span>
                    <span className="text-white font-medium">
                      {nextRound.t2_p1.first_name} + {nextRound.t2_p2.first_name}
                    </span>
                  </div>
                </div>

                {nextRound.resting_players.length > 0 && (
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                    <Coffee className="w-3.5 h-3.5 text-amber-400" />
                    <span>На лаві наступного раунду: </span>
                    <span className="text-amber-300 font-semibold">
                      {nextRound.resting_players.map((p) => p.first_name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">Це фінальний раунд турніру!</p>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM ACTION CTA BUTTON (MainButton Style) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 glass-panel border-t border-slate-800 z-40 max-w-md mx-auto">
        <button
          onClick={() => {
            if (match.current_round_index === totalRounds - 1) {
              onFinishRound();
              onViewSummary();
            } else {
              onFinishRound();
            }
          }}
          className="w-full neon-glow-btn py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 uppercase tracking-wide"
        >
          <CheckCircle2 className="w-5 h-5 text-black" />
          {match.current_round_index === totalRounds - 1 ? 'Завершити турнір' : 'Завершити раунд'}
        </button>
      </div>
    </div>
  );
};
