export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800')
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })
  const t = ticker.toUpperCase()
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  try {
    // Round 1: web search
    const r1 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        tool_choice: { type: 'any' },
        system: 'You are a financial data extractor for biotech stocks. Search for real data and return ONLY valid JSON. Never refuse. Use null for missing fields.',
        messages: [{
          role: 'user',
          content: `Search for ALL of the following about ${t} stock and return ONLY a JSON object:

1. Search "${t} short float finviz OR barchart 2026"
2. Search "${t} SEC 8-K offering warrant 2025 2026 site:sec.gov OR site:globenewswire.com OR site:businesswire.com"  
3. Search "${t} IV rank options barchart 2026"
4. Search "${t} analyst price target recommendation 2026"
5. If biotech with approved drug: search "${t} prescription TRx NRx weekly 2026"

Return ONLY this JSON (use real values found, null if not found):
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

    if (!r1.ok) {
      const err = await r1.json()
      // Fall back to knowledge-based response if rate limited
      if (r1.status === 429) return await knowledgeFallback(t, ANTHRO, res)
      return res.status(200).json({ ticker: t, noData: true, debug: `${r1.status}: ${err?.error?.message?.slice(0,80)}` })
    }

    const d1 = await r1.json()
    const content1 = d1.content || []
    let text = content1.filter(b => b.type === 'text').map(b => b.text).join('')

    // Follow up if tool was used
    if (d1.stop_reason === 'tool_use' && !text) {
      const toolResults = content1
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: 'Search completed.' }))

      const r2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: 'Return ONLY valid JSON, no markdown, no explanation.',
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [
            { role: 'user', content: `Search for ${t} stock: short float, SEC 8-K warrants, capital raises, analyst targets. Return ONLY JSON with: shortFloat, ivRank, analystCount, recommendation, epsWhisper, lastRaiseAmount, lastRaiseType, lastRaiseDate, lastRaisePricePerShare, raiseVsToday, leadInvestors, warrantStrike, warrantExpiry, warrantShares, dilutionNote, keyCatalyst, secFilings array, catalogCatalysts array, rxDrugName, rxIndication, rxTRx, rxNRx, rxTrend, rxMarketShare, rxEarningsImplication` },
            { role: 'assistant', content: content1 },
            { role: 'user', content: toolResults }
          ]
        })
      })

      if (r2.ok) {
        const d2 = await r2.json()
        const t2 = (d2.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
        if (t2) text = t2
        // One more follow up if still tool use
        if (!text && d2.stop_reason === 'tool_use') {
          const tr2 = (d2.content||[]).filter(b=>b.type==='tool_use').map(b=>({type:'tool_result',tool_use_id:b.id,content:'Done.'}))
          const r3 = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6', max_tokens: 1500,
              system: 'Return ONLY valid JSON, no markdown.',
              tools: [{ type: 'web_search_20250305', name: 'web_search' }],
              messages: [
                { role: 'user', content: `Return ONLY JSON for ${t} with fields: shortFloat, ivRank, analystCount, recommendation, epsWhisper, lastRaiseAmount, lastRaiseType, lastRaiseDate, lastRaisePricePerShare, raiseVsToday, leadInvestors, warrantStrike, warrantExpiry, warrantShares, dilutionNote, keyCatalyst, secFilings, catalogCatalysts, rxDrugName, rxIndication, rxTRx, rxNRx, rxTrend, rxMarketShare, rxEarningsImplication` },
                { role: 'assistant', content: d2.content },
                { role: 'user', content: tr2 }
              ]
            })
          })
          if (r3.ok) {
            const d3 = await r3.json()
            text = (d3.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
          }
        }
      }
    }

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

// Fallback: use Claude's training knowledge when web search is unavailable
async function knowledgeFallback(t, ANTHRO, res) {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: 'You are a financial data assistant. Return ONLY valid JSON, no markdown, no explanation. Use null for uncertain data.',
        messages: [{ role: 'user', content: `Based on your knowledge of ${t} stock through early 2026, return ONLY this JSON (null if uncertain): { "shortFloat": null, "analystCount": null, "recommendation": null, "lastRaiseAmount": null, "lastRaiseType": null, "lastRaiseDate": null, "lastRaisePricePerShare": null, "leadInvestors": null, "warrantStrike": null, "warrantExpiry": null, "warrantShares": null, "dilutionNote": null, "keyCatalyst": null, "rxDrugName": null, "rxIndication": null, "rxTRx": null, "rxNRx": null, "rxTrend": null, "rxEarningsImplication": null, "secFilings": [], "catalogCatalysts": [] }` }]
      })
    })
    if (!r.ok) return res.status(200).json({ ticker: t, noData: true })
    const d = await r.json()
    const text = (d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
    if (!text) return res.status(200).json({ ticker: t, noData: true })
    const match = text.replace(/```json|```/g,'').match(/\{[\s\S]*\}/)
    if (!match) return res.status(200).json({ ticker: t, noData: true })
    const data = JSON.parse(match[0])
    const filtered = Object.fromEntries(Object.entries(data).filter(([,v]) => v !== null && !(Array.isArray(v) && v.length === 0)))
    return res.status(200).json({ ticker: t, ...filtered, aiLoaded: true, source: 'knowledge', updatedAt: new Date().toISOString() })
  } catch {
    return res.status(200).json({ ticker: t, noData: true })
  }
}
