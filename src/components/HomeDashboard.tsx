'use client';

import React, { useState } from 'react';
import { Match, User } from '../types/padel';
import { SAMPLE_PLAYERS } from '../lib/mockData';
import { Play, Plus, Trophy, Users, Zap, Award, ChevronRight } from 'lucide-react';
import { triggerHapticFeedback } from '../lib/telegram';

interface HomeDashboardProps {
  currentMatch: Match | null;
  currentUser: User;
  onCreateMatch: (playerCount: number, pointsPerRound: 13 | 24 | 32) => void;
  onResumeMatch: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  currentMatch,
  currentUser,
  onCreateMatch,
  onResumeMatch,
}) => {
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<number>(5);
  const [selectedPoints, setSelectedPoints] = useState<13 | 24 | 32>(32);

  const handleStart = () => {
    triggerHapticFeedback('success');
    onCreateMatch(selectedPlayerCount, selectedPoints);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-5 px-3 py-4 pb-20">
      {/* ACTIVE MATCH WIDGET */}
      {currentMatch && (
        <div className="glass-panel rounded-3xl p-5 border-2 border-[#ccff00]/70 bg-gradient-to-r from-lime-950/40 via-slate-900 to-slate-950 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase text-[#ccff00] bg-lime-950/80 border border-lime-400/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse"></span>
              Активна Гра
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              Раунд {currentMatch.current_round_index + 1} / {currentMatch.rounds.length}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-1">{currentMatch.title}</h3>
          <p className="text-xs text-slate-400 mb-4">
            Учасників: {currentMatch.participants.length} • Очок на раунд: {currentMatch.points_per_round}
          </p>

          <button
            onClick={() => {
              triggerHapticFeedback('medium');
              onResumeMatch();
            }}
            className="w-full neon-glow-btn py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <Play className="w-4 h-4 text-black fill-black" />
            Повернутися до гри
          </button>
        </div>
      )}

      {/* CREATE NEW MATCH CARD */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800">
        <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#ccff00]" />
          Створити новий турнір
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Американка на 1 корті з авто-ротацією гравців
        </p>

        {/* Player Count Selection */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-300 block mb-2">
            Кількість учасників:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[4, 5, 6, 7].map((count) => (
              <button
                key={count}
                onClick={() => {
                  setSelectedPlayerCount(count);
                  triggerHapticFeedback('light');
                }}
                className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                  selectedPlayerCount === count
                    ? 'bg-[#ccff00] text-black border-lime-300 shadow-md shadow-lime-900/30'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {count} {count === 4 ? 'гравці' : 'гравців'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 pl-1">
            {selectedPlayerCount === 4 && '4 активні, 0 на лаві (3 раунди)'}
            {selectedPlayerCount === 5 && '4 активні, 1 на лаві (5 раундів)'}
            {selectedPlayerCount === 6 && '4 активні, 2 на лаві (5 раундів)'}
            {selectedPlayerCount === 7 && '4 активні, 3 на лаві (7 раундів)'}
          </p>
        </div>

        {/* Points Selection */}
        <div className="mb-5">
          <label className="text-xs font-bold text-slate-300 block mb-2">
            Очок на один раунд:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[13, 24, 32].map((pts) => (
              <button
                key={pts}
                onClick={() => {
                  setSelectedPoints(pts as 13 | 24 | 32);
                  triggerHapticFeedback('light');
                }}
                className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                  selectedPoints === pts
                    ? 'bg-[#ccff00] text-black border-lime-300 shadow-md shadow-lime-900/30'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {pts} очок
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full neon-glow-btn py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 uppercase tracking-wide"
        >
          <Zap className="w-5 h-5 text-black fill-black" />
          Почати Турнір
        </button>
      </div>

      {/* GLOBAL COMPANY LEADERBOARD */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#ccff00]" />
            Глобальний Рейтинг Компанії
          </h3>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            All-Time Avg
          </span>
        </div>

        <div className="space-y-2.5">
          {SAMPLE_PLAYERS.slice(0, 5).map((player, idx) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center text-xs font-bold text-slate-500">
                  #{idx + 1}
                </span>
                <img
                  src={player.avatar_url}
                  alt={player.first_name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    {player.first_name} {player.last_name || ''}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Матчів: {player.total_matches_played}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-extrabold text-[#ccff00]">
                  {player.global_average_score}
                </span>
                <span className="text-[10px] text-slate-500 block">сер. бал</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
