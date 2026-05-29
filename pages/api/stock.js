// Stock deep dive panel
// Free tier: FMP profile (price, market cap, sector, description)
// + Claude AI web search for earnings estimates, cash, analyst targets, SEC data

const FMP = process.env.FMP_API_KEY

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=900')
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })
  const t = ticker.toUpperCase()

  try {
    // FMP profile is free — gets us price, market cap, sector, description
    const profileRes = await fetch(
      `https://financialmodelingprep.com/stable/profile?symbol=${t}&apikey=${FMP}`
    )
    let profile = null
    if (profileRes.ok) {
      const d = await profileRes.json()
      profile = Array.isArray(d) ? d[0] : d
      if (profile?.['Error Message']) profile = null
    }

    // Claude AI web search for everything else
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search for current financial data on ${t} stock and return ONLY a JSON object, no markdown, no explanation.

Search for: next earnings date, EPS estimate, EPS whisper, revenue estimate, cash on hand, quarterly burn rate, cash runway, analyst price targets (low/mean/high), analyst count, consensus rating (Buy/Hold/Sell), short float %, IV rank, last capital raise (amount/type/date/price/investors), warrant details (strike/expiry/shares), dilution risk, key upcoming catalyst.

Return this exact JSON (null for missing):
{
  "earningsDate": null,
  "earningsDaysOut": null,
  "epsEstimate": null,
  "epsWhisper": null,
  "revenueEstimate": null,
  "revenueEstimateFmt": null,
  "cash": null,
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
  "secLink": null
}`
        }]
      })
    })

    let aiData = {}
    if (aiRes.ok) {
      const raw = await aiRes.json()
      // Handle multi-turn tool use
      let text = (raw.content || []).filter(b => b.type === 'text').map(b => b.text).join('')

      // If tool was used but no text yet, do follow-up
      if (!text && (raw.content || []).some(b => b.type === 'tool_use')) {
        const toolResults = (raw.content || [])
          .filter(b => b.type === 'tool_use')
          .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: 'Search completed' }))

        const followUp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1200,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages: [
              { role: 'user', content: `Search for ${t} stock financial data and return ONLY JSON with: earningsDate, earningsDaysOut, epsEstimate, epsWhisper, revenueEstimate, revenueEstimateFmt, cash, quarterlyBurn, runway, runwayMonths, targetLow, targetMean, targetHigh, analystCount, recommendation, shortFloat, ivRank, lastRaiseAmount, lastRaiseType, lastRaiseDate, lastRaisePricePerShare, raiseVsToday, leadInvestors, warrantStrike, warrantExpiry, warrantShares, dilutionNote, keyCatalyst, secLink. Use null for missing.` },
              { role: 'assistant', content: raw.content },
              { role: 'user', content: toolResults }
            ]
          })
        })

        if (followUp.ok) {
          const fd = await followUp.json()
          text = (fd.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
        }
      }

      if (text) {
        try {
          const clean = text.replace(/```json|```/g, '').trim()
          const match = clean.match(/\{[\s\S]*\}/)
          if (match) aiData = JSON.parse(match[0])
        } catch {}
      }
    }

    return res.status(200).json({
      ticker: t,
      // From FMP profile (free)
      companyName: profile?.companyName || null,
      sector: profile?.sector || null,
      industry: profile?.industry || null,
      description: profile?.description || null,
      website: profile?.website || null,
      price: profile?.price || null,
      marketCap: profile ? formatCap(profile.mktCap) : null,
      marketCapRaw: profile?.mktCap || null,
      week52High: profile?.range ? parseFloat(profile.range.split('-')[1]) : null,
      week52Low: profile?.range ? parseFloat(profile.range.split('-')[0]) : null,
      avgVolume: profile?.volAvg || null,
      beta: profile?.beta || null,
      // From Claude AI search
      ...aiData,
      updatedAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error('Stock API error:', err)
    return res.status(500).json({ error: err.message })
  }
}

function formatCap(n) {
  if (!n) return null
  if (n >= 1e12) return `$${(n/1e12).toFixed(1)}T`
  if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n/1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}
