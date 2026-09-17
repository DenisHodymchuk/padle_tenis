'use client';

import { User } from '../types/padel';

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
      console.warn('Haptic feedback error:', e);
    }
  }
}

export function getCurrentUser(): User {
  const tg = getTelegramWebApp();
  const initUser = tg?.initDataUnsafe?.user;

  if (initUser && initUser.id) {
    // Construct real Telegram avatar URL if photo_url is provided, or user initials avatar
    const initials = encodeURIComponent(
      `${initUser.first_name || 'P'} ${initUser.last_name || ''}`.trim()
    );
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${initials}&background=ccff00&color=000000&font-size=0.4`;

    return {
      id: `u-tg-${initUser.id}`,
      telegram_id: initUser.id,
      first_name: initUser.first_name || 'Гравець',
      last_name: initUser.last_name || '',
      username: initUser.username || '',
      avatar_url: initUser.photo_url || fallbackAvatar,
      total_matches_played: 0,
      global_average_score: 0,
    };
  }

  // Fallback for browser dev mode
  return {
    id: 'u-tg-local',
    telegram_id: 1001,
    first_name: 'Гравець Падел',
    last_name: '',
    username: 'padel_player',
    avatar_url: 'https://ui-avatars.com/api/?name=Padel+Player&background=ccff00&color=000000',
    total_matches_played: 0,
    global_average_score: 0,
  };
}

/**
 * Share Match Invite Deep Link to Telegram Chat
 */
export function shareMatchInvite(matchId: string, title: string) {
  triggerHapticFeedback('medium');
  const botUsername = 'padle_tenis_bot';
  const deepLink = `https://t.me/${botUsername}?startapp=match_${matchId}`;
  const text = `🎾 Приєднуйтесь до турніру Падел Американка: "${title}"!\n\nПереходьте за посиланням у лобі гри:`;

  const tg = getTelegramWebApp();
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`;

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(shareUrl);
  } else if (typeof window !== 'undefined') {
    window.open(shareUrl, '_blank');
  }
}
