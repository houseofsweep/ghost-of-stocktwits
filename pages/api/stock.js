// /pages/api/stock.js
// Uses Claude AI with web search to pull full stock deep dive data

export default async function handler(req, res) {
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })

  const t = ticker.toUpperCase()

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Research the stock ${t} right now and return ONLY a valid JSON object with no markdown, no explanation, no preamble. Search for current data.

Return exactly this JSON structure (use null for any field you cannot find):
{
  "companyName": null,
  "sector": null,
  "industry": null,
  "price": null,
  "marketCap": null,
  "marketCapRaw": null,
  "earningsDate": null,
  "earningsDaysOut": null,
  "epsEstimate": null,
  "epsWhisper": null,
  "revenueEstimate": null,
  "revenueEstimateFmt": null,
  "cash": null,
  "cashRaw": null,
  "quarterlyBurn": null,
  "runway": null,
  "runwayMonths": null,
  "targetLow": null,
  "targetMean": null,
  "targetHigh": null,
  "analystCount": null,
  "recommendation": null,
  "shortFloat": null,
  "ivRank": null,
  "week52High": null,
  "week52Low": null,
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
  "rxSource": null,
  "rxEarningsImplication": null,
  "keyCatalyst": null,
  "secLink": null
}`
        }]
      })
    })

    if (!aiRes.ok) {
      const err = await aiRes.text()
      console.error('AI API error:', err)
      return res.status(500).json({ error: 'AI API failed' })
    }

    const aiData = await aiRes.json()

    // Extract text from response (may have tool use blocks)
    let text = ''
    for (const block of aiData.content || []) {
      if (block.type === 'text') text += block.text
    }

    // If we got tool use but no final text, do a follow-up
    const hasToolUse = (aiData.content || []).some(b => b.type === 'tool_use')
    if (hasToolUse && !text.trim()) {
      // Build follow-up with tool results
      const toolResults = (aiData.content || [])
        .filter(b => b.type === 'tool_use')
        .map(b => ({
          type: 'tool_result',
          tool_use_id: b.id,
          content: 'Search completed'
        }))

      const followUp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [
            { role: 'user', content: `Research ${t} stock and return ONLY JSON with these fields: companyName, sector, price, marketCap, earningsDate, earningsDaysOut, epsEstimate, epsWhisper, revenueEstimate, cash, quarterlyBurn, runway, runwayMonths, targetLow, targetMean, targetHigh, analystCount, recommendation, shortFloat, ivRank, week52High, week52Low, lastRaiseAmount, lastRaiseType, lastRaiseDate, lastRaisePricePerShare, raiseVsToday, leadInvestors, warrantStrike, warrantExpiry, warrantShares, dilutionNote, rxDrugName, rxIndication, rxTRx, rxNRx, rxTrend, rxMarketShare, rxEarningsImplication, keyCatalyst, secLink. Use null for missing fields. Return ONLY the JSON object.` },
            { role: 'assistant', content: aiData.content },
            { role: 'user', content: toolResults }
          ]
        })
      })

      if (followUp.ok) {
        const followData = await followUp.json()
        for (const block of followData.content || []) {
          if (block.type === 'text') text += block.text
        }
      }
    }

    if (!text.trim()) {
      return res.status(404).json({ error: 'No data returned' })
    }

    // Parse JSON from response
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return res.status(500).json({ error: 'Could not parse response' })
      const data = JSON.parse(jsonMatch[0])
      return res.status(200).json({ ticker: t, ...data, updatedAt: new Date().toISOString() })
    } catch (parseErr) {
      console.error('Parse error:', parseErr, 'Text:', text.slice(0, 200))
      return res.status(500).json({ error: 'JSON parse failed' })
    }

  } catch (err) {
    console.error('Stock API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
