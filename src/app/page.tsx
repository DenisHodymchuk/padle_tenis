'use client';

import React, { useState, useEffect } from 'react';
import { useMatchStore } from '../store/useMatchStore';
import { Header } from '../components/Header';
import { HomeDashboard } from '../components/HomeDashboard';
import { ActiveMatchView } from '../components/ActiveMatchView';
import { MatchSummaryView } from '../components/MatchSummaryView';
import { initTelegramApp } from '../lib/telegram';

export default function Page() {
  const {
    currentMatch,
    currentUser,
    createMatch,
    updateCurrentRoundScore,
    finishCurrentRound,
    resetMatch,
  } = useMatchStore();

  const [view, setView] = useState<'home' | 'active_match' | 'summary'>('home');

  useEffect(() => {
    initTelegramApp();
  }, []);

  useEffect(() => {
    if (currentMatch) {
      if (currentMatch.status === 'completed') {
        setView('summary');
      } else if (currentMatch.status === 'in_progress') {
        // Stay on home if user clicked home, or auto switch to active_match
      }
    }
  }, [currentMatch]);

  const handleCreateNewMatch = (playerCount: number, pointsPerRound: 13 | 24 | 32) => {
    createMatch(playerCount, pointsPerRound);
    setView('active_match');
  };

  const handleResumeMatch = () => {
    if (currentMatch?.status === 'completed') {
      setView('summary');
    } else {
      setView('active_match');
    }
  };

  const handleNewMatchFromSummary = () => {
    resetMatch();
    setView('home');
  };

  return (
    <main className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center">
      {/* Top Header */}
      <Header user={currentUser} />

      {/* View Router */}
      <div className="w-full flex-1 flex flex-col justify-start">
        {view === 'home' && (
          <HomeDashboard
            currentMatch={currentMatch}
            currentUser={currentUser}
            onCreateMatch={handleCreateNewMatch}
            onResumeMatch={handleResumeMatch}
          />
        )}

        {view === 'active_match' && currentMatch && (
          <div>
            <div className="max-w-md mx-auto px-4 pt-3 flex items-center justify-between">
              <button
                onClick={() => setView('home')}
                className="text-xs text-slate-400 hover:text-white underline font-medium"
              >
                ← Головне меню
              </button>
              <h2 className="text-xs font-bold text-slate-300">
                {currentMatch.title}
              </h2>
            </div>
            <ActiveMatchView
              match={currentMatch}
              onUpdateScore={updateCurrentRoundScore}
              onFinishRound={finishCurrentRound}
              onViewSummary={() => setView('summary')}
            />
          </div>
        )}

        {view === 'summary' && currentMatch && (
          <div>
            <div className="max-w-md mx-auto px-4 pt-3 flex items-center justify-between">
              <button
                onClick={() => setView('home')}
                className="text-xs text-slate-400 hover:text-white underline font-medium"
              >
                ← Головне меню
              </button>
              <h2 className="text-xs font-bold text-[#ccff00]">
                Фінальні Результати
              </h2>
            </div>
            <MatchSummaryView
              match={currentMatch}
              onNewMatch={handleNewMatchFromSummary}
            />
          </div>
        )}
      </div>
    </main>
  );
}
