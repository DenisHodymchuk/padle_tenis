'use client';

import React, { useState } from 'react';
import { Match, User } from '../types/padel';
import { Share2, Play, Users, Plus, ShieldCheck, Check, UserPlus } from 'lucide-react';
import { shareMatchInvite, triggerHapticFeedback } from '../lib/telegram';

interface MatchLobbyViewProps {
  match: Match;
  currentUser: User;
  companyPlayers: User[];
  onAddPlayerToLobby: (player: User) => void;
  onStartGame: () => void;
  onBackToHome: () => void;
}

export const MatchLobbyView: React.FC<MatchLobbyViewProps> = ({
  match,
  currentUser,
  companyPlayers,
  onAddPlayerToLobby,
  onStartGame,
  onBackToHome,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const isCreator = match.creator_id === currentUser.id || true; // allow testing actions
  const playerCount = match.participants.length;
  const canStart = playerCount >= 4 && playerCount <= 7;

  const currentParticipantIds = new Set(match.participants.map((p) => p.user_id));
  const availableCompanyPlayers = companyPlayers.filter((p) => !currentParticipantIds.has(p.id));

  return (
    <div className="w-full max-w-md mx-auto space-y-4 px-3 py-4 pb-20">
      {/* HEADER CARD */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black uppercase text-[#ccff00] bg-lime-950/80 border border-lime-400/40 px-3 py-0.5 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse"></span>
            Лобі Турніру
          </span>
          <span className="text-xs text-slate-400 font-bold">
            Очок на раунд: <span className="text-white">{match.points_per_round}</span>
          </span>
        </div>

        <h2 className="text-xl font-black text-white mb-1">{match.title}</h2>
        <p className="text-xs text-slate-400 mb-4">
          Організатор: {currentUser.first_name} {currentUser.last_name || ''}
        </p>

        {/* Action Buttons: Share & Invite */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => shareMatchInvite(match.id, match.title)}
            className="w-full neon-glow-btn py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 uppercase tracking-wider"
          >
            <Share2 className="w-4 h-4 text-black" />
            Запросити в чат
          </button>

          <button
            onClick={() => {
              setShowAddModal(true);
              triggerHapticFeedback('light');
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <UserPlus className="w-4 h-4 text-[#ccff00]" />
            Додати гравця
          </button>
        </div>
      </div>

      {/* PARTICIPANTS LIST */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between px-1 mb-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ccff00]" />
            Учасники Лобі ({playerCount} з 7)
          </h3>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              canStart
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}
          >
            {canStart ? 'Готово до старту' : 'Потрібно 4-7 гравців'}
          </span>
        </div>

        <div className="space-y-2">
          {match.participants.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-xs font-bold text-slate-500">
                  #{idx + 1}
                </span>
                <img
                  src={p.user.avatar_url || 'https://ui-avatars.com/api/?name=Padel'}
                  alt={p.user.first_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#ccff00]/60"
                />
                <div>
                  <div className="text-sm font-bold text-white">
                    {p.user.first_name} {p.user.last_name || ''}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    @{p.user.username || 'telegram_user'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-900/50">
                <Check className="w-3.5 h-3.5" />
                В лобі
              </div>
            </div>
          ))}

          {/* Empty Slot Placeholders */}
          {Array.from({ length: Math.max(0, 4 - playerCount) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-between p-3 rounded-2xl border-2 border-dashed border-slate-800 text-slate-600"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-xs font-bold opacity-40">
                  #{playerCount + i + 1}
                </span>
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <Users className="w-5 h-5 opacity-40" />
                </div>
                <span className="text-xs font-semibold italic">Очікуємо гравця...</span>
              </div>
              <button
                onClick={() => shareMatchInvite(match.id, match.title)}
                className="text-[11px] text-[#ccff00] font-bold hover:underline"
              >
                + Запросити
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* START GAME BUTTON (Organizer Action) */}
      <div className="pt-2">
        <button
          onClick={() => {
            if (canStart) {
              triggerHapticFeedback('success');
              onStartGame();
            } else {
              triggerHapticFeedback('warning');
              alert('Для початку гри у лобі має бути від 4 до 7 гравців!');
            }
          }}
          disabled={!canStart}
          className="w-full neon-glow-btn py-4 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-40"
        >
          <Play className="w-5 h-5 text-black fill-black" />
          Почати Гри (Згенерувати Сітку)
        </button>
      </div>

      {/* ADD COMPANY PLAYER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-5 border border-slate-700 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#ccff00]" />
                Додати гравця з бази
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {availableCompanyPlayers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Усі зареєстровані гравці вже додані у лобі
                </p>
              ) : (
                availableCompanyPlayers.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => {
                      onAddPlayerToLobby(player);
                      setShowAddModal(false);
                      triggerHapticFeedback('light');
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#ccff00] cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={player.avatar_url || 'https://ui-avatars.com/api/?name=User'}
                        alt={player.first_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">
                          {player.first_name} {player.last_name || ''}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          @{player.username || 'user'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-[#ccff00] font-bold">+ Додати</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
