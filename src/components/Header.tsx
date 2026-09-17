'use client';

import React from 'react';
import { User } from '../types/padel';
import { Trophy, Zap } from 'lucide-react';

interface HeaderProps {
  user: User;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  return (
    <header className="w-full glass-panel border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={user.first_name}
            className="w-10 h-10 rounded-full border-2 border-[#ccff00] object-cover shadow-sm"
          />
          <span className="absolute -bottom-1 -right-1 bg-[#ccff00] text-black text-[10px] font-bold px-1 rounded-full">
            PRO
          </span>
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
            {user.first_name} {user.last_name || ''}
          </h1>
          <p className="text-xs text-slate-400">@{user.username || 'player'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60 flex items-center gap-1.5 text-xs text-slate-300">
          <Zap className="w-3.5 h-3.5 text-[#ccff00]" />
          <span className="font-semibold text-white">{user.global_average_score}</span>
          <span className="text-[10px] text-slate-400">середній</span>
        </div>
      </div>
    </header>
  );
};
