export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
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
          content: `You MUST search the web for current 2025-2026 data. Search these specific queries one by one:
1. Fetch https://efts.sec.gov/LATEST/search-index?q=%22${t}%22&forms=8-K&dateRange=custom&startdt=2025-01-01&enddt=2026-12-31 for recent SEC filings
2. Search "${t} offering warrant 2025 2026 SEC filing"
3. Search "${t} short float 2026 finviz"
4. Search "${t} warrant strike price 2025 2026"

Today is May 2026. Only use data from 2025-2026. Ignore anything older. Return ONLY this JSON:
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
  "catalogCatalysts": [],
  "sharesOutstanding": null,
  "fullyDilutedShares": null,
  "fdmc": null,
  "fdmcNote": null
}

Search specifically for: total shares outstanding, warrants outstanding (count), options outstanding, convertible notes (shares if converted), then calculate fully diluted shares = shares + warrants + options + convertible shares. Also calculate FDMC = fully diluted shares × current price.

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

    // Strip all markdown fences and find JSON
    const clean = text
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .replace(/^[^{]*/s, '')  // remove any text before first {
      .trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) {
      // Try extracting from anywhere in the text
      const anyJson = text.match(/\{[\s\S]*\}/)
      if (!anyJson) return await knowledgeFallback(t, ANTHRO, res)
      const data2 = JSON.parse(anyJson[0])
      const filtered2 = Object.fromEntries(Object.entries(data2).filter(([,v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)))
      return res.status(200).json({ ticker: t, ...filtered2, aiLoaded: true, updatedAt: new Date().toISOString() })
    }

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
