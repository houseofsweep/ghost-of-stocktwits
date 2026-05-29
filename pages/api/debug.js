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
      system: 'After searching, output ONLY a raw JSON object starting with { and ending with }. No markdown. No backticks. No text before or after.',
      messages: [{ role: 'user', content: `Search for ${ticker} stock short float and warrant details 2025 2026. Return ONLY JSON: {"shortFloat": null, "warrantStrike": null, "warrantExpiry": null, "keyCatalyst": null}` }]
    })
  })

  const body = await r.json()
  const text = (body.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
  const hasJson = text.includes('{')
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  
  res.status(200).json({
    status: r.status,
    stopReason: body.stop_reason,
    contentTypes: (body.content||[]).map(b=>b.type),
    textLength: text.length,
    hasJson,
    jsonMatchFound: !!jsonMatch,
    fullText: text,
    error: body.error
  })
}
