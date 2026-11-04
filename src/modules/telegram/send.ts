export async function sendTelegram(botToken: string, chatId: number | string, text: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (res.ok) return { ok: true };
  return { ok: false, error: `Telegram ${res.status}` };
}
