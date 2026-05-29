export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800')
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })
  const t = ticker.toUpperCase()
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: 'You are a financial data extractor. Search for the requested data and return ONLY a valid JSON object with no markdown, no explanation. Use null for fields you cannot confirm.',
        messages: [{
          role: 'user',
          content: `Search for current data on ${t} stock and return ONLY this JSON object with real values:
{
  "shortFloat": null,
  "ivRank": null,
  "analystCount": null,
  "recommendation": null,
  "epsWhisper": null,
  "lastRaiseAmount": null,
  "lastRaiseType": null,
  "lastRaiseDate": null,
  "lastRaisePricePerShare": null,
  "raiseVsToday": null,
  "leadInvestors": null,
  "warrantStrike": null,
  "warrantExpiry": null,
  "warrantShares": null,
  "dilutionNote": null,
  "keyCatalyst": null,
  "rxDrugName": null,
  "rxIndication": null,
  "rxTRx": null,
  "rxNRx": null,
  "rxTrend": null,
  "rxMarketShare": null,
  "rxEarningsImplication": null,
  "secFilings": [],
  "catalogCatalysts": []
}

Search for: short float, IV rank, recent SEC 8-K filings with warrant/offering details, analyst price targets, prescription data if applicable.`
        }]
      })
    })

    if (!r.ok) {
      const err = await r.json()
      if (r.status === 429) return await knowledgeFallback(t, ANTHRO, res)
      return res.status(200).json({ ticker: t, noData: true, debug: `${r.status}: ${err?.error?.message?.slice(0,80)}` })
    }

    const d = await r.json()
    // Web search completes in one round - text is in the response directly
    const text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('')

    if (!text) return await knowledgeFallback(t, ANTHRO, res)

    const clean = text.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return await knowledgeFallback(t, ANTHRO, res)

    const data = JSON.parse(match[0])
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
    )
    return res.status(200).json({ ticker: t, ...filtered, aiLoaded: true, updatedAt: new Date().toISOString() })

  } catch (err) {
    return await knowledgeFallback(t, ANTHRO, res)
  }
}

async function knowledgeFallback(t, ANTHRO, res) {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: 'Return ONLY valid JSON, no markdown.',
        messages: [{ role: 'user', content: `Based on your knowledge of ${t} stock through early 2026, return ONLY JSON: { "shortFloat": null, "analystCount": null, "recommendation": null, "lastRaiseAmount": null, "lastRaiseType": null, "lastRaiseDate": null, "lastRaisePricePerShare": null, "leadInvestors": null, "warrantStrike": null, "warrantExpiry": null, "warrantShares": null, "dilutionNote": null, "keyCatalyst": null, "rxDrugName": null, "rxIndication": null, "rxTRx": null, "rxNRx": null, "rxEarningsImplication": null, "secFilings": [], "catalogCatalysts": [] }` }]
      })
    })
    if (!r.ok) return res.status(200).json({ ticker: t, noData: true })
    const d = await r.json()
    const text = (d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
    const match = text.replace(/```json|```/g,'').match(/\{[\s\S]*\}/)
    if (!match) return res.status(200).json({ ticker: t, noData: true })
    const data = JSON.parse(match[0])
    const filtered = Object.fromEntries(Object.entries(data).filter(([,v]) => v !== null && !(Array.isArray(v) && v.length === 0)))
    return res.status(200).json({ ticker: t, ...filtered, aiLoaded: true, source: 'knowledge', updatedAt: new Date().toISOString() })
  } catch {
    return res.status(200).json({ ticker: t, noData: true })
  }
}
