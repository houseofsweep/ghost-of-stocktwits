// Separate endpoint for AI-powered data (warrants, capital raise, short float, SEC filings)
// Runs independently so FMP data shows immediately while this loads async

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800')
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })
  const t = ticker.toUpperCase()

  const ANTHRO = process.env.ANTHROPIC_API_KEY

  try {
    const messages = [{
      role: 'user',
      content: `Search for ${t} stock. Find these specific items and return ONLY a JSON object, no markdown:

1. Search "${t} SEC 8-K warrant offering 2025 2026" for capital raise details
2. Search "site:finviz.com ${t}" or "${t} short float finviz" for short interest
3. Search "${t} IV rank options barchart" for IV rank
4. Search "${t} warrant strike price expiry" for warrant details

Return ONLY this JSON (null for missing):
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
  "rxDrugName": null,
  "rxIndication": null,
  "rxTRx": null,
  "rxNRx": null,
  "rxTrend": null,
  "rxMarketShare": null,
  "rxEarningsImplication": null,
  "keyCatalyst": null,
  "secFilings": [],
  "catalogCatalysts": []
}`
    }]

    let finalText = ''
    let currentMessages = [...messages]

    // Loop through tool use turns
    for (let i = 0; i < 6; i++) {
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
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: currentMessages
        })
      })

      if (!r.ok) break
      const d = await r.json()
      const content = d.content || []

      // Grab any text
      const text = content.filter(b => b.type === 'text').map(b => b.text).join('')
      if (text) finalText = text

      // If done, break
      if (d.stop_reason === 'end_turn') break

      // If tool use, continue conversation
      if (d.stop_reason === 'tool_use') {
        currentMessages.push({ role: 'assistant', content })
        const toolResults = content
          .filter(b => b.type === 'tool_use')
          .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: 'done' }))
        currentMessages.push({ role: 'user', content: toolResults })
      } else {
        break
      }
    }

    if (!finalText) return res.status(200).json({ ticker: t, noData: true })

    // Parse JSON
    const clean = finalText.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return res.status(200).json({ ticker: t, noData: true, raw: finalText.slice(0,200) })

    const data = JSON.parse(match[0])
    return res.status(200).json({ ticker: t, ...data, updatedAt: new Date().toISOString() })

  } catch (err) {
    console.error('StockAI error:', err)
    return res.status(500).json({ error: err.message })
  }
}
