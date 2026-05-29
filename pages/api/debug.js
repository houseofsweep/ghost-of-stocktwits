export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  const start = Date.now()
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  // Test how long the AI call actually takes
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'Output ONLY raw JSON, no markdown, no text before or after.',
      messages: [{ role: 'user', content: 'Search OTLK stock short float 2026. Return ONLY: {"shortFloat": "X%", "warrantStrike": "$X", "keyCatalyst": "..."}' }]
    })
  })

  const elapsed = Date.now() - start
  const body = await r.json()
  const text = (body.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
  const jsonMatch = text.match(/\{[\s\S]*\}/)

  res.status(200).json({
    elapsed: `${elapsed}ms`,
    status: r.status,
    textLength: text.length,
    jsonFound: !!jsonMatch,
    parsed: jsonMatch ? JSON.parse(jsonMatch[0]) : null,
    error: body.error
  })
}
