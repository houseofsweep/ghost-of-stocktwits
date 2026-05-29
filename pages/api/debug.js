export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  const { ticker = 'OTLK' } = req.query
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'Return ONLY valid JSON, no markdown.',
      messages: [{ role: 'user', content: `Search for ${ticker} stock short float, warrants, and most recent SEC 8-K filing from 2025-2026. Return ONLY JSON: {"shortFloat": null, "warrantStrike": null, "warrantExpiry": null, "lastRaiseDate": null, "keyCatalyst": null}` }]
    })
  })

  const status = r.status
  const body = await r.json()
  const contentTypes = (body.content||[]).map(b => b.type)
  const text = (body.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
  
  res.status(200).json({ status, stopReason: body.stop_reason, contentTypes, textLength: text.length, text: text.slice(0,500), error: body.error })
}
