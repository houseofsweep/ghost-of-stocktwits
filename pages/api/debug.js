export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  // Simple test - no web search, just basic call
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say "working" and nothing else.' }]
    })
  })

  const status = r.status
  const body = await r.json()
  
  res.status(200).json({ 
    status, 
    text: body.content?.[0]?.text,
    error: body.error,
    stopReason: body.stop_reason
  })
}
