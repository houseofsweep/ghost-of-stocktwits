export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=3600')
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })
  const t = ticker.toUpperCase()
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  try {
    // No web search - use Claude's training knowledge, much faster and no rate limit issues
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHRO,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: `You are a financial data assistant with knowledge of biotech stocks. Return ONLY valid JSON with no markdown, no explanation, no preamble. Use null for any field you are not confident about. Never make up data.`,
        messages: [{
          role: 'user',
          content: `Based on your knowledge of ${t} stock (as of early 2026), return ONLY this JSON object:
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
}`
        }]
      })
    })

    if (!r.ok) {
      const err = await r.json()
      return res.status(200).json({ ticker: t, noData: true, debug: `${r.status}: ${err?.error?.message?.slice(0,100)}` })
    }

    const raw = await r.json()
    const text = (raw.content || []).filter(b => b.type === 'text').map(b => b.text).join('')

    if (!text) return res.status(200).json({ ticker: t, noData: true, debug: 'empty response' })

    const clean = text.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return res.status(200).json({ ticker: t, noData: true, debug: 'no JSON', raw: text.slice(0,200) })

    const data = JSON.parse(match[0])
    
    // Filter out nulls so we don't overwrite good FMP data with nulls
    const filtered = Object.fromEntries(Object.entries(data).filter(([k, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)))
    
    return res.status(200).json({ ticker: t, ...filtered, aiLoaded: true, updatedAt: new Date().toISOString() })

  } catch (err) {
    return res.status(200).json({ ticker: t, noData: true, debug: err.message })
  }
}
