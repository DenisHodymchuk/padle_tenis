'use client';

import React from 'react';
import { User } from '../types/padel';
import { Zap, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  user: User;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onOpenProfile }) => {
  return (
    <header className="w-full glass-panel border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div
        onClick={onOpenProfile}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <div className="relative">
          <img
            src={user.avatar_url || 'https://ui-avatars.com/api/?name=User'}
            alt={user.first_name}
            className="w-10 h-10 rounded-full border-2 border-[#ccff00] object-cover shadow-sm group-hover:scale-105 transition-all"
          />
          <span className="absolute -bottom-1 -right-1 bg-[#ccff00] text-black text-[9px] font-black px-1 rounded-full">
            YOU
          </span>
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5 group-hover:text-[#ccff00] transition-colors">
            {user.first_name} {user.last_name || ''}
          </h1>
          <p className="text-[11px] text-slate-400">
            {user.username ? `@${user.username}` : 'Мій кабінет'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenProfile}
          className="bg-slate-800/90 hover:bg-slate-700 px-2.5 py-1.5 rounded-full border border-slate-700/60 flex items-center gap-1.5 text-xs text-slate-300 transition-all"
        >
          <Zap className="w-3.5 h-3.5 text-[#ccff00]" />
          <span className="font-bold text-white">
            {user.global_average_score > 0 ? user.global_average_score.toFixed(2) : '0.00'}
          </span>
          <span className="text-[10px] text-slate-400">сер.</span>
        </button>
      </div>
    </header>
  );
};
