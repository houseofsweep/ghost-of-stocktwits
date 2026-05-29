// /pages/api/stock.js
// Full stock deep dive using Financial Modeling Prep API + Claude AI for SEC/warrant data

const FMP = process.env.FMP_API_KEY
const BASE = 'https://financialmodelingprep.com/api'

async function fmp(path) {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE}${path}${sep}apikey=${FMP}`)
  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data) ? data[0] || null : data
}

async function fmpArr(path) {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE}${path}${sep}apikey=${FMP}`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

function fmtNum(n) {
  if (!n && n !== 0) return null
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e9)  return `${sign}$${(abs/1e9).toFixed(1)}B`
  if (abs >= 1e6)  return `${sign}$${(abs/1e6).toFixed(1)}M`
  if (abs >= 1e3)  return `${sign}$${(abs/1e3).toFixed(0)}K`
  return `${sign}$${abs.toFixed(2)}`
}

function fmtCap(n) {
  if (!n) return null
  if (n >= 1e12) return `$${(n/1e12).toFixed(1)}T`
  if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n/1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

export default async function handler(req, res) {
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })
  const t = ticker.toUpperCase()

  try {
    // Fire all FMP requests in parallel
    const [
      profile,
      quote,
      ratios,
      analysts,
      earnings,
      cashflow,
      balanceSheet,
      secFilings,
    ] = await Promise.all([
      fmp(`/v3/profile/${t}`),
      fmp(`/v3/quote/${t}`),
      fmp(`/v3/ratios-ttm/${t}`),
      fmpArr(`/v3/analyst-estimates/${t}?limit=4`),
      fmpArr(`/v3/historical/earning_calendar/${t}?limit=8`),
      fmpArr(`/v3/cash-flow-statement/${t}?period=quarter&limit=4`),
      fmpArr(`/v3/balance-sheet-statement/${t}?period=quarter&limit=2`),
      fmpArr(`/v3/sec_filings/${t}?type=8-K&limit=10`),
    ])

    if (!profile && !quote) {
      return res.status(404).json({ error: 'Ticker not found' })
    }

    // ── Price & company ──────────────────────────────────────────────────────
    const price     = quote?.price || profile?.price || null
    const marketCap = quote?.marketCap || profile?.mktCap || null
    const companyName = profile?.companyName || null
    const sector    = profile?.sector || null
    const industry  = profile?.industry || null
    const week52High = quote?.yearHigh || null
    const week52Low  = quote?.yearLow || null
    const avgVolume  = quote?.avgVolume || null
    const description = profile?.description || null

    // ── Earnings ─────────────────────────────────────────────────────────────
    // Next earnings date
    const futureEarnings = earnings.filter(e => new Date(e.date) >= new Date())
    const nextEarnings = futureEarnings[0] || null
    const earningsDate = nextEarnings?.date || null
    const earningsDaysOut = earningsDate
      ? Math.round((new Date(earningsDate) - new Date()) / 86400000)
      : null

    // EPS & revenue estimates from analyst estimates
    const nextQtr = analysts[0] || null
    const epsEstimate = nextQtr?.estimatedEpsAvg ?? null
    const epsLow = nextQtr?.estimatedEpsLow ?? null
    const epsHigh = nextQtr?.estimatedEpsHigh ?? null
    const revenueEstimate = nextQtr?.estimatedRevenueAvg ?? null

    // Analyst targets
    const targetConsensus = profile?.dcfDiff ? null : null
    const targetMean = analysts.length > 0
      ? analysts.slice(0,4).reduce((s,a) => s + (a?.estimatedEpsAvg||0), 0) / analysts.slice(0,4).length
      : null

    // Price targets from separate endpoint
    const [priceTargetRes] = await Promise.all([
      fmpArr(`/v3/price-target-consensus/${t}`)
    ])
    const ptData = Array.isArray(priceTargetRes) ? priceTargetRes[0] : priceTargetRes
    const targetLow  = ptData?.priceTargetLow ?? null
    const targetHigh = ptData?.priceTargetHigh ?? null
    const targetMeanPT = ptData?.priceTargetAverage ?? null
    const analystCount = ptData?.numAnalysts ?? null

    // Recommendation
    const [recRes] = await Promise.all([
      fmpArr(`/v3/analyst-stock-recommendations/${t}?limit=5`)
    ])
    const latestRec = recRes[0] || null
    const recommendation = latestRec?.analystRatingsStrongBuy > 0 ? 'Strong Buy'
      : latestRec?.analystRatingsBuy > 0 ? 'Buy'
      : latestRec?.analystRatingsHold > 0 ? 'Hold'
      : latestRec?.analystRatingsSell > 0 ? 'Sell'
      : null

    // ── Balance sheet & burn ─────────────────────────────────────────────────
    const latestBS  = balanceSheet[0] || null
    const cashRaw   = latestBS?.cashAndCashEquivalents ?? latestBS?.cashAndShortTermInvestments ?? null
    const cash      = fmtNum(cashRaw)

    const latestCF  = cashflow[0] || null
    const cfOps     = latestCF?.operatingCashFlow ?? null
    const quarterlyBurnRaw = cfOps && cfOps < 0 ? Math.abs(cfOps) : null
    const quarterlyBurn = fmtNum(quarterlyBurnRaw)
    const runwayQtrs = cashRaw && quarterlyBurnRaw ? cashRaw / quarterlyBurnRaw : null
    const runwayMonths = runwayQtrs ? Math.round(runwayQtrs * 3) : null
    const runway = runwayQtrs ? `${runwayQtrs.toFixed(1)} qtrs` : null

    // ── Short interest ───────────────────────────────────────────────────────
    const shortArr = await fmpArr(`/v4/short-float?symbol=${t}`)
    const shortData = shortArr[0] || null
    const shortFloatRaw = shortData?.shortFloat ?? ratios?.shortRatio ?? null
    const shortFloat = shortFloatRaw ? `${(parseFloat(shortFloatRaw) * (shortFloatRaw < 1 ? 100 : 1)).toFixed(1)}%` : null

    // ── SEC filings — find capital raises ────────────────────────────────────
    // Look for 8-Ks mentioning offering/raise/warrant in last 6 months
    const raiseFilings = secFilings.filter(f =>
      f.type === '8-K' &&
      (f.description?.toLowerCase().includes('offering') ||
       f.description?.toLowerCase().includes('warrant') ||
       f.description?.toLowerCase().includes('placement') ||
       f.description?.toLowerCase().includes('financing'))
    ).slice(0, 3)

    // Use Claude AI to extract structured data from the SEC filing descriptions
    let secExtracted = null
    if (raiseFilings.length > 0 || secFilings.length > 0) {
      const filingsText = (raiseFilings.length > 0 ? raiseFilings : secFilings.slice(0, 5))
        .map(f => `${f.filingDate}: ${f.type} — ${f.description || f.form || ''} [${f.finalLink || f.link || ''}]`)
        .join('\n')

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
            max_tokens: 600,
            messages: [{
              role: 'user',
              content: `Extract capital raise and warrant data from these ${t} SEC 8-K filing descriptions. Return ONLY valid JSON, no markdown.

${filingsText}

JSON structure (null for missing):
{
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

        if (aiRes.ok) {
          const aiData = await aiRes.json()
          const text = (aiData.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
          const clean = text.replace(/```json|```/g, '').trim()
          const match = clean.match(/\{[\s\S]*\}/)
          if (match) secExtracted = JSON.parse(match[0])
        }
      } catch {}
    }

    // Most recent SEC 8-K link
    const latestSecLink = secFilings[0]?.finalLink || secFilings[0]?.link || null

    return res.status(200).json({
      ticker: t,
      companyName,
      sector,
      industry,
      description,

      price,
      marketCap: fmtCap(marketCap),
      marketCapRaw: marketCap,
      week52High,
      week52Low,
      avgVolume,

      earningsDate,
      earningsDaysOut,
      epsEstimate,
      epsLow,
      epsHigh,
      revenueEstimate,
      revenueEstimateFmt: fmtNum(revenueEstimate),

      cash,
      cashRaw,
      quarterlyBurn,
      quarterlyBurnRaw,
      runway,
      runwayMonths,

      targetLow,
      targetMean: targetMeanPT,
      targetHigh,
      analystCount,
      recommendation,

      shortFloat,
      shortFloatRaw,

      // SEC extracted data
      lastRaiseAmount:       secExtracted?.lastRaiseAmount ?? null,
      lastRaiseType:         secExtracted?.lastRaiseType ?? null,
      lastRaiseDate:         secExtracted?.lastRaiseDate ?? null,
      lastRaisePricePerShare:secExtracted?.lastRaisePricePerShare ?? null,
      raiseVsToday:          secExtracted?.raiseVsToday ?? null,
      leadInvestors:         secExtracted?.leadInvestors ?? null,
      warrantStrike:         secExtracted?.warrantStrike ?? null,
      warrantExpiry:         secExtracted?.warrantExpiry ?? null,
      warrantShares:         secExtracted?.warrantShares ?? null,
      dilutionNote:          secExtracted?.dilutionNote ?? null,
      keyCatalyst:           secExtracted?.keyCatalyst ?? null,
      secLink:               secExtracted?.secLink ?? latestSecLink,

      updatedAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error('Stock API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
