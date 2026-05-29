export default async function handler(req, res) {
  const { ticker = 'OTLK' } = req.query
  const ANTHRO = process.env.ANTHROPIC_API_KEY
  const results = {}

  // Use Claude with web search to find SEC 8-K filings for this ticker
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHRO,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search SEC EDGAR for ${ticker} 8-K filings from 2025-2026. Find the most recent 8-K that mentions offering, warrant, placement, or financing. Return ONLY JSON:
{
  "lastRaiseAmount": null,
  "lastRaiseType": null,
  "lastRaiseDate": null,
  "lastRaisePricePerShare": null,
  "leadInvestors": null,
  "warrantStrike": null,
  "warrantExpiry": null,
  "warrantShares": null,
  "dilutionNote": null,
  "secLink": null,
  "keyCatalyst": null
}`
        }]
      })
    })

    const raw = await r.json()
    let text = ''
    for (const b of raw.content || []) {
      if (b.type === 'text') text += b.text
    }

    // If tool used, do follow up
    if (!text && (raw.content||[]).some(b => b.type === 'tool_use')) {
      const toolResults = (raw.content||[]).filter(b=>b.type==='tool_use').map(b=>({type:'tool_result',tool_use_id:b.id,content:'done'}))
      const f2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [
            { role: 'user', content: `Search SEC EDGAR for ${ticker} 8-K filings mentioning offering, warrant, placement. Return ONLY JSON with: lastRaiseAmount, lastRaiseType, lastRaiseDate, lastRaisePricePerShare, leadInvestors, warrantStrike, warrantExpiry, warrantShares, dilutionNote, secLink, keyCatalyst` },
            { role: 'assistant', content: raw.content },
            { role: 'user', content: toolResults }
          ]
        })
      })
      const fd = await f2.json()
      text = (fd.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
    }

    results.aiResponse = text.slice(0, 500)
    if (text) {
      const match = text.replace(/```json|```/g,'').match(/\{[\s\S]*\}/)
      if (match) results.parsed = JSON.parse(match[0])
    }
  } catch(e) {
    results.error = e.message
  }

  res.status(200).json(results)
}
