'use client';

import React, { useEffect } from 'react';
import { Match } from '../types/padel';
import { LeaderboardTable } from './LeaderboardTable';
import { Trophy, Share2, RotateCcw, Sparkles, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHapticFeedback, getTelegramWebApp } from '../lib/telegram';

interface MatchSummaryViewProps {
  match: Match;
  onNewMatch: () => void;
}

export const MatchSummaryView: React.FC<MatchSummaryViewProps> = ({ match, onNewMatch }) => {
  const winner = match.participants[0];

  useEffect(() => {
    // Fire confetti on load
    triggerHapticFeedback('success');
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ccff00', '#38bdf8', '#fbbf24'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ccff00', '#38bdf8', '#fbbf24'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const handleShareToTelegram = () => {
    triggerHapticFeedback('medium');
    const text = `🏆 *РЕЗУЛЬТАТИ ПАДЕЛ АМЕРИКАНКА*\n\n` +
      `🥇 *Переможець:* ${winner?.user.first_name} (${winner?.average_score.toFixed(2)} сер. б.)\n\n` +
      `📊 *Підсумкова таблиця:*\n` +
      match.participants
        .map((p, i) => `${i + 1}. ${p.user.first_name}: ${p.average_score.toFixed(2)} балів (${p.total_points} оч. / ${p.rounds_played} р.)`)
        .join('\n') +
      `\n\n🎾 Зіграно на Padel Americano Tracker`;

    const encodedText = encodeURIComponent(text);
    const tg = getTelegramWebApp();
    
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodedText}`);
    } else if (navigator.share) {
      navigator.share({ title: 'Padel Americano', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Результати скопійовано в буфер обміну!');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-5 px-3 py-6 pb-20">
      {/* WINNER PODIUM CARD */}
      <div className="glass-panel rounded-3xl p-6 border-2 border-[#ccff00]/60 text-center relative overflow-hidden bg-gradient-to-b from-lime-950/40 via-slate-900 to-slate-950 shadow-2xl">
        <div className="absolute top-3 right-3 text-[#ccff00] animate-spin-slow">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 mb-3">
          <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
        </div>

        <span className="text-xs font-black uppercase tracking-widest text-[#ccff00] block mb-1">
          Чемпіон Турніру
        </span>

        <div className="relative inline-block mb-3">
          <img
            src={winner?.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={winner?.user.first_name}
            className="w-20 h-20 rounded-full border-4 border-[#ccff00] object-cover mx-auto shadow-xl"
          />
          <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-[#ccff00] text-black font-extrabold text-xs px-3 py-0.5 rounded-full shadow-md">
            #1
          </div>
        </div>

        <h2 className="text-2xl font-black text-white">
          {winner?.user.first_name} {winner?.user.last_name || ''}
        </h2>
        <div className="text-[#ccff00] font-black text-xl mt-1">
          {winner?.average_score.toFixed(2)}{' '}
          <span className="text-xs text-slate-400 font-normal">середній бал</span>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-800">
          <div>
            Загалом очок: <span className="text-white font-bold">{winner?.total_points}</span>
          </div>
          <div>•</div>
          <div>
            Зіграно раундів: <span className="text-white font-bold">{winner?.rounds_played}</span>
          </div>
        </div>
      </div>

      {/* FULL LEADERBOARD TABLE */}
      <LeaderboardTable participants={match.participants} highlightWinner={true} />

      {/* ACTION BUTTONS */}
      <div className="space-y-3 pt-2">
        <button
          onClick={handleShareToTelegram}
          className="w-full neon-glow-btn py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 uppercase"
        >
          <Share2 className="w-4 h-4 text-black" />
          Надіслати результати в чат
        </button>

        <button
          onClick={onNewMatch}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" />
          Розпочати новий матч
        </button>
      </div>
    </div>
  );
};
