'use client';

import React, { useState, useEffect } from 'react';
import { useMatchStore } from '../store/useMatchStore';
import { Header } from '../components/Header';
import { HomeDashboard } from '../components/HomeDashboard';
import { MatchLobbyView } from '../components/MatchLobbyView';
import { ActiveMatchView } from '../components/ActiveMatchView';
import { MatchSummaryView } from '../components/MatchSummaryView';
import { UserProfileView } from '../components/UserProfileView';
import { initTelegramApp } from '../lib/telegram';

export default function Page() {
  const {
    currentMatch,
    currentUser,
    companyPlayers,
    userMatches,
    createLobbyMatch,
    addPlayerToLobby,
    startLobbyGame,
    updateCurrentRoundScore,
    finishCurrentRound,
    resetMatch,
  } = useMatchStore();

  const [view, setView] = useState<'home' | 'lobby' | 'active_match' | 'summary' | 'profile'>('home');

  useEffect(() => {
    initTelegramApp();
  }, []);

  useEffect(() => {
    if (currentMatch) {
      if (currentMatch.status === 'lobby') {
        setView('lobby');
      } else if (currentMatch.status === 'completed') {
        setView('summary');
      } else if (currentMatch.status === 'in_progress' && view === 'home') {
        // Option to stay or switch
      }
    }
  }, [currentMatch]);

  const handleCreateNewMatch = (playerCount: number, pointsPerRound: 13 | 24 | 32) => {
    createLobbyMatch(playerCount, pointsPerRound);
    setView('lobby');
  };

  const handleResumeMatch = () => {
    if (!currentMatch) return;
    if (currentMatch.status === 'lobby') {
      setView('lobby');
    } else if (currentMatch.status === 'completed') {
      setView('summary');
    } else {
      setView('active_match');
    }
  };

  const handleStartGameFromLobby = () => {
    startLobbyGame();
    setView('active_match');
  };

  const handleNewMatchFromSummary = () => {
    resetMatch();
    setView('home');
  };

  return (
    <main className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center">
      {/* Top Header */}
      <Header user={currentUser} onOpenProfile={() => setView('profile')} />

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

        {view === 'lobby' && currentMatch && (
          <div>
            <div className="max-w-md mx-auto px-4 pt-3 flex items-center justify-between">
              <button
                onClick={() => setView('home')}
                className="text-xs text-slate-400 hover:text-white underline font-medium"
              >
                ← Головне меню
              </button>
              <h2 className="text-xs font-bold text-[#ccff00]">
                Лобі підготовки
              </h2>
            </div>
            <MatchLobbyView
              match={currentMatch}
              currentUser={currentUser}
              companyPlayers={companyPlayers}
              onAddPlayerToLobby={addPlayerToLobby}
              onStartGame={handleStartGameFromLobby}
              onBackToHome={() => setView('home')}
            />
          </div>
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

        {view === 'profile' && (
          <UserProfileView
            user={currentUser}
            userMatches={userMatches}
            onBackToHome={() => setView('home')}
          />
        )}
      </div>
    </main>
  );
}
