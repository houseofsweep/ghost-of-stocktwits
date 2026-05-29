export default async function handler(req, res) {
  const { ticker = 'OTLK' } = req.query
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  // Test 1: basic Claude call no tools
  const r1 = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: `What is 2+2? Reply in one word.` }]
    })
  })
  const d1 = await r1.json()

  // Test 2: with web search
  const r2 = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: `Search for "${ticker} SEC 8-K warrant 2026" and tell me what you find in 2 sentences.` }]
    })
  })
  const d2 = await r2.json()

  res.status(200).json({
    basicCall: { status: r1.status, stopReason: d1.stop_reason, text: d1.content?.[0]?.text, error: d1.error },
    searchCall: { status: r2.status, stopReason: d2.stop_reason, contentTypes: (d2.content||[]).map(b=>b.type), error: d2.error }
  })
}
