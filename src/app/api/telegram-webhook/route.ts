import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8742234396:AAFIErVkiQy62sOWXXjdvWdZIy6LNPKXVsk';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://padletenis-production.up.railway.app';

export async function POST(req: Request) {
  try {
    const update = await req.json();

    if (update?.message) {
      const message = update.message;
      const chatId = message.chat?.id;
      const text = message.text || '';

      if (chatId && text.startsWith('/start')) {
        const parts = text.split(' ');
        const startParam = parts.length > 1 ? parts.slice(1).join(' ').trim() : '';

        let replyText = '🎾 *Падел Американка*';
        let buttonText = '🎾 Відкрити додаток';
        let webAppUrl = APP_URL;

        if (startParam && (startParam.includes('match_') || startParam.includes('match-') || startParam.length > 3)) {
          const cleanId = startParam.replace(/^(match_|match-)+/, '').trim();
          replyText = `🎾 *Вас запрошено до лобі падел-турніру!*\n\nНатисніть на кнопку нижче, щоб увійти в гральне лобі:`;
          buttonText = '🎾 УВІЙТИ В ЛОБІ ТУРНІРУ';
          webAppUrl = `${APP_URL}?tgWebAppStartParam=match_${cleanId}`;
        } else {
          replyText = `🎾 *Ласкаво просимо в Падел Американка!*\n\nНатисніть на кнопку нижче, щоб відкрити панель турнірів:`;
        }

        const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await fetch(telegramApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: buttonText,
                    web_app: { url: webAppUrl },
                  },
                ],
              ],
            },
          }),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook active' });
}
