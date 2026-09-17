'use client';

import React from 'react';
import { User, Match } from '../types/padel';
import { Trophy, Zap, Shield, Calendar, Award, RotateCcw } from 'lucide-react';

interface UserProfileViewProps {
  user: User;
  userMatches: Match[];
  onBackToHome: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  user,
  userMatches,
  onBackToHome,
}) => {
  return (
    <div className="w-full max-w-md mx-auto space-y-4 px-3 py-4 pb-20">
      {/* PROFILE HEADER CARD */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 text-center relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl">
        <div className="relative inline-block mb-3">
          <img
            src={user.avatar_url || 'https://ui-avatars.com/api/?name=User'}
            alt={user.first_name}
            className="w-24 h-24 rounded-full border-4 border-[#ccff00] object-cover mx-auto shadow-xl"
          />
          <span className="absolute -bottom-1 right-1 bg-[#ccff00] text-black font-black text-[11px] px-2 py-0.5 rounded-full shadow">
            PLAYER
          </span>
        </div>

        <h2 className="text-2xl font-black text-white">
          {user.first_name} {user.last_name || ''}
        </h2>
        <p className="text-xs text-slate-400 font-medium">@{user.username || 'telegram_user'}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <div className="text-2xl font-black text-[#ccff00]">
              {user.global_average_score > 0 ? user.global_average_score.toFixed(2) : '0.00'}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-1 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-[#ccff00]" />
              Середній бал
            </div>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <div className="text-2xl font-black text-sky-400">
              {user.total_matches_played}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-1 mt-0.5">
              <Trophy className="w-3.5 h-3.5 text-sky-400" />
              Матчів зіграно
            </div>
          </div>
        </div>
      </div>

      {/* MATCH HISTORY SECTION */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#ccff00]" />
          Історія Турнірів
        </h3>

        {userMatches.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            <Award className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            Ви ще не зіграли жодного турніру. Створіть перший турнір у головному меню!
          </div>
        ) : (
          <div className="space-y-2">
            {userMatches.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white">{m.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(m.created_at).toLocaleDateString('uk-UA')} • {m.points_per_round} оч./раунд
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    m.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                      : 'bg-amber-950 text-amber-400 border border-amber-900'
                  }`}
                >
                  {m.status === 'completed' ? 'Завершено' : 'У процесі'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onBackToHome}
        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
      >
        ← Повернутися на головну
      </button>
    </div>
  );
};
