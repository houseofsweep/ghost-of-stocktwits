export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
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
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: 'You are a financial data extractor. Search for data and output ONLY a raw JSON object. No markdown. No backticks. No explanation. Start your response with { and end with }.',
        messages: [{
          role: 'user',
          content: `Today is May 29, 2026. Search for the following about ${t} stock. USE ONLY DATA FROM 2025 OR 2026:

Search 1: "${t} SEC 8-K 2026 warrant offering site:sec.gov OR site:globenewswire.com OR site:businesswire.com"
Search 2: "${t} short float May 2026"  
Search 3: "${t} warrant strike price 2026"

Return ONLY this JSON with real 2025-2026 values (null if not found in 2025-2026):
{"shortFloat":null,"ivRank":null,"analystCount":null,"recommendation":null,"epsWhisper":null,"lastRaiseAmount":null,"lastRaiseType":null,"lastRaiseDate":null,"lastRaisePricePerShare":null,"raiseVsToday":null,"leadInvestors":null,"warrantStrike":null,"warrantExpiry":null,"warrantShares":null,"dilutionNote":null,"keyCatalyst":null,"rxDrugName":null,"rxIndication":null,"rxTRx":null,"rxNRx":null,"rxTrend":null,"rxMarketShare":null,"rxEarningsImplication":null,"secFilings":[],"catalogCatalysts":[],"sharesOutstanding":null,"fullyDilutedShares":null,"fdmc":null,"fdmcNote":null}`
        }]
      })
    })

    if (!r.ok) {
      const err = await r.json()
      if (r.status === 429) return await fallback(t, ANTHRO, res)
      return res.status(200).json({ ticker: t, noData: true, debug: `${r.status}: ${err?.error?.message?.slice(0,80)}` })
    }

    const d = await r.json()
    const text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
    if (!text) return await fallback(t, ANTHRO, res)

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return await fallback(t, ANTHRO, res)

    const data = JSON.parse(jsonMatch[0])
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
    )
    return res.status(200).json({ ticker: t, ...filtered, aiLoaded: true, updatedAt: new Date().toISOString() })

  } catch (err) {
    return await fallback(t, ANTHRO, res)
  }
}

async function fallback(t, ANTHRO, res) {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: 'Output ONLY raw JSON starting with { and ending with }. No markdown.',
        messages: [{ role: 'user', content: `What do you know about ${t} stock warrants, capital raises, short float, and key catalyst as of early 2026? Return ONLY JSON: {"shortFloat":null,"warrantStrike":null,"warrantExpiry":null,"warrantShares":null,"lastRaiseAmount":null,"lastRaiseType":null,"lastRaiseDate":null,"leadInvestors":null,"dilutionNote":null,"keyCatalyst":null,"sharesOutstanding":null,"fullyDilutedShares":null,"fdmc":null}` }]
      })
    })
    if (!r.ok) return res.status(200).json({ ticker: t, noData: true })
    const d = await r.json()
    const text = (d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return res.status(200).json({ ticker: t, noData: true })
    const data = JSON.parse(match[0])
    const filtered = Object.fromEntries(Object.entries(data).filter(([,v]) => v !== null && !(Array.isArray(v) && v.length === 0)))
    return res.status(200).json({ ticker: t, ...filtered, aiLoaded: true, source: 'knowledge', updatedAt: new Date().toISOString() })
  } catch {
    return res.status(200).json({ ticker: t, noData: true })
  }
}
