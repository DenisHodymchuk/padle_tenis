'use client';

import { User } from '../types/padel';

// Mock user for local web browser testing outside Telegram Mini App
export const MOCK_TELEGRAM_USER: User = {
  id: 'u-tg-me',
  telegram_id: 777000111,
  first_name: 'Олександр',
  last_name: 'Падельний',
  username: 'padel_pro_ua',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  total_matches_played: 14,
  global_average_score: 18.4,
};

export function getTelegramWebApp() {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp;
  }
  return null;
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.('#0f172a');
      tg.setBackgroundColor?.('#0b0f19');
    } catch (err) {
      console.warn('Telegram WebApp init warning:', err);
    }
  }
}

export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback) {
    try {
      if (['light', 'medium', 'heavy'].includes(type)) {
        tg.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
      } else if (['success', 'warning', 'error'].includes(type)) {
        tg.HapticFeedback.notificationOccurred(type as 'success' | 'warning' | 'error');
      }
    } catch (e) {
      console.warn('Haptic feedback non-critical failure', e);
    }
  }
}

export function getCurrentUser(): User {
  const tg = getTelegramWebApp();
  const initUser = tg?.initDataUnsafe?.user;

  if (initUser) {
    return {
      id: `u-tg-${initUser.id}`,
      telegram_id: initUser.id,
      first_name: initUser.first_name || 'Гравець',
      last_name: initUser.last_name,
      username: initUser.username,
      avatar_url: initUser.photo_url || MOCK_TELEGRAM_USER.avatar_url,
      total_matches_played: 12,
      global_average_score: 17.8,
    };
  }

  return MOCK_TELEGRAM_USER;
}
