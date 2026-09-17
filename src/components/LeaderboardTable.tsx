'use client';

import React from 'react';
import { MatchParticipant } from '../types/padel';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardTableProps {
  participants: MatchParticipant[];
  highlightWinner?: boolean;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  participants,
  highlightWinner = false,
}) => {
  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-400/40">
          <Trophy className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="w-6 h-6 rounded-full bg-slate-300/20 text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-300/40">
          <Medal className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="w-6 h-6 rounded-full bg-amber-600/20 text-amber-600 flex items-center justify-center font-bold text-xs border border-amber-600/40">
          <Award className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-semibold text-xs">
        {index + 1}
      </div>
    );
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-4 overflow-hidden border border-slate-800">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#ccff00]" />
          Поточна Таблиця Лідерів
        </h3>
        <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
          Сортування: Середній бал
        </span>
      </div>

      <div className="space-y-2">
        {participants.map((p, idx) => {
          const isLeader = idx === 0;

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                isLeader && highlightWinner
                  ? 'bg-gradient-to-r from-lime-950/40 via-slate-900 to-slate-900 border-[#ccff00]/60 shadow-lg shadow-lime-950/20'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {getRankBadge(idx)}
                <div className="relative">
                  <img
                    src={p.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={p.user.first_name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-snug">
                    {p.user.first_name} {p.user.last_name || ''}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Зіграно раундів: <span className="text-slate-200 font-medium">{p.rounds_played}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-base font-extrabold text-[#ccff00] leading-none">
                  {p.average_score.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Всього: {p.total_points} оч.
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
