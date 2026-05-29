export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800')
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })
  const t = ticker.toUpperCase()
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  try {
    // Use web search to find SEC 8-K data
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHRO,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        tool_choice: { type: 'auto' },
        system: `You are a financial data extractor. When asked about a stock, search for its recent SEC 8-K filings, warrant details, capital raises, and short interest. Always return ONLY a valid JSON object with no markdown, no explanation, no preamble. Never refuse. If you cannot find data, use null.`,
        messages: [{
          role: 'user',
          content: `Search for ${t} stock data and return ONLY this JSON object with real data (null if not found):
{
  "shortFloat": "7.2%",
  "ivRank": 45,
  "analystCount": 3,
  "recommendation": "Buy",
  "epsWhisper": -0.09,
  "lastRaiseAmount": "$5M",
  "lastRaiseType": "Registered Direct Offering",
  "lastRaiseDate": "2026-04-23",
  "lastRaisePricePerShare": "0.31",
  "raiseVsToday": "above",
  "leadInvestors": "Institutional investors",
  "warrantStrike": "0.31",
  "warrantExpiry": "2031-04-23",
  "warrantShares": "16,129,033",
  "dilutionNote": "Warrants exercisable upon stockholder approval",
  "keyCatalyst": "FDA BLA decision expected following appeal resolution",
  "secFilings": [{"date":"2026-04-23","type":"8-K","description":"Registered Direct Offering","url":"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${t}&type=8-K"}],
  "catalogCatalysts": [],
  "rxDrugName": null,
  "rxIndication": null,
  "rxTRx": null,
  "rxNRx": null,
  "rxTrend": null,
  "rxMarketShare": null,
  "rxEarningsImplication": null
}`
        }]
      })
    })

    if (!r.ok) {
      const err = await r.text()
      return res.status(200).json({ ticker: t, noData: true, debug: `API ${r.status}: ${err.slice(0,100)}` })
    }

    const raw = await r.json()
    const allContent = raw.content || []
    const stopReason = raw.stop_reason

    // Collect all text blocks
    let text = allContent.filter(b => b.type === 'text').map(b => b.text).join('')

    // If tool was used, do ONE follow-up turn
    if (stopReason === 'tool_use' && !text) {
      const toolResults = allContent
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: 'Search results retrieved.' }))

      const r2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: `You are a financial data extractor. Return ONLY valid JSON, no markdown, no explanation.`,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [
            { role: 'user', content: `Search for ${t} stock SEC 8-K filings, warrants, capital raises, short float. Return ONLY JSON with: shortFloat, ivRank, analystCount, recommendation, epsWhisper, lastRaiseAmount, lastRaiseType, lastRaiseDate, lastRaisePricePerShare, raiseVsToday, leadInvestors, warrantStrike, warrantExpiry, warrantShares, dilutionNote, keyCatalyst, secFilings array, catalogCatalysts array, rxDrugName, rxIndication, rxTRx, rxNRx, rxTrend, rxMarketShare, rxEarningsImplication. Use null for missing.` },
            { role: 'assistant', content: allContent },
            { role: 'user', content: toolResults }
          ]
        })
      })

      if (r2.ok) {
        const d2 = await r2.json()
        const t2 = (d2.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
        if (t2) text = t2
      }
    }

    if (!text) return res.status(200).json({ ticker: t, noData: true, debug: `stopReason:${stopReason} contentTypes:${allContent.map(b=>b.type).join(',')}` })

    // Parse JSON from response
    const clean = text.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return res.status(200).json({ ticker: t, noData: true, debug: 'no JSON found', raw: text.slice(0, 300) })

    const data = JSON.parse(match[0])
    return res.status(200).json({ ticker: t, ...data, aiLoaded: true, updatedAt: new Date().toISOString() })

  } catch (err) {
    return res.status(200).json({ ticker: t, noData: true, debug: err.message })
  }
}
