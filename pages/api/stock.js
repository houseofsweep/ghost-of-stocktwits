const FMP = process.env.FMP_API_KEY
const BASE = 'https://financialmodelingprep.com/stable'

async function get(path) {
  const sep = path.includes('?') ? '&' : '?'
  try {
    const r = await fetch(`${BASE}${path}${sep}apikey=${FMP}`)
    if (!r.ok) return null
    const d = await r.json()
    if (d?.['Error Message'] || d?.error) return null
    return Array.isArray(d) ? (d[0] || null) : d
  } catch { return null }
}

async function getArr(path) {
  const sep = path.includes('?') ? '&' : '?'
  try {
    const r = await fetch(`${BASE}${path}${sep}apikey=${FMP}`)
    if (!r.ok) return []
    const d = await r.json()
    if (!Array.isArray(d)) return []
    return d
  } catch { return [] }
}

function fmt(n) {
  if (n == null) return null
  // FMP sometimes returns values in full dollars, sometimes scaled
  // Normalize: if abs value > 1e11 for a single company metric, likely needs /1000
  let v = n
  if (Math.abs(v) > 5e11) v = v / 1000  // normalize trillion-scale to billions
  const a = Math.abs(v), s = v < 0 ? '-' : ''
  if (a >= 1e9) return `${s}$${(a/1e9).toFixed(1)}B`
  if (a >= 1e6) return `${s}$${(a/1e6).toFixed(1)}M`
  if (a >= 1e3) return `${s}$${(a/1e3).toFixed(0)}K`
  return `${s}$${a.toFixed(2)}`
}

function normalizeRaw(n, marketCapRaw) {
  if (n == null) return null
  // FMP bug: some small-cap tickers return values 1,000,000x too large
  // Detect by comparing to market cap — cash/burn can't be 1000x bigger than market cap
  if (marketCapRaw && Math.abs(n) > marketCapRaw * 500) {
    return n / 1000000
  }
  return n
}

function fmtCap(n) {
  if (!n) return null
  if (n >= 1e12) return `$${(n/1e12).toFixed(1)}T`
  if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n/1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=600')
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })
  const t = ticker.toUpperCase()

  try {
    const today = new Date(); today.setHours(0,0,0,0)
    const end120 = new Date(); end120.setDate(end120.getDate()+120)
    const todayStr = today.toISOString().split('T')[0]
    const endStr = end120.toISOString().split('T')[0]

    const [profile, quote, cf, bs, pt, earningsCal] = await Promise.all([
      get(`/profile?symbol=${t}`),
      get(`/quote?symbol=${t}`),
      getArr(`/cash-flow-statement?symbol=${t}&period=quarter&limit=4`),
      getArr(`/balance-sheet-statement?symbol=${t}&period=quarter&limit=2`),
      get(`/price-target-consensus?symbol=${t}`),
      getArr(`/earnings-calendar?from=${todayStr}&to=${endStr}`),
    ])

    if (!profile && !quote) return res.status(404).json({ error: 'Ticker not found' })

    // Price & company
    const price      = quote?.price ?? profile?.price ?? null
    const marketCap  = quote?.marketCap ?? profile?.mktCap ?? null
    const week52High = quote?.yearHigh ?? (profile?.range ? parseFloat(profile.range.split('-')[1]) : null)
    const week52Low  = quote?.yearLow  ?? (profile?.range ? parseFloat(profile.range.split('-')[0]) : null)

    // Balance sheet — cash
    const latestBS   = bs[0] || null
    const cashRaw    = normalizeRaw(latestBS?.cashAndCashEquivalents ?? latestBS?.cashAndShortTermInvestments ?? null, marketCap)
    const totalDebt  = normalizeRaw(latestBS?.totalDebt ?? null, marketCap)

    // Cash flow — burn rate
    const latestCF   = cf[0] || null
    const prevCF     = cf[1] || null
    // Use operating cash flow for burn — negative = cash burn
    const opCF       = normalizeRaw(latestCF?.operatingCashFlow ?? null, marketCap)
    const capEx      = normalizeRaw(latestCF?.capitalExpenditure ?? 0, marketCap)
    // Quarterly burn = abs(operating CF) if negative
    const burnRaw    = opCF && opCF < 0 ? Math.abs(opCF) : null
    const runway     = cashRaw && burnRaw ? cashRaw / burnRaw : null
    const runwayMos  = runway ? Math.round(runway * 3) : null

    // Free cash flow
    const fcf        = normalizeRaw(latestCF?.freeCashFlow ?? null, marketCap)

    // Earnings from calendar
    const nextEarnings = earningsCal.find(e => e.symbol === t && new Date(e.date+'T00:00:00') >= today)
    const earningsDate = nextEarnings?.date ?? null
    const earningsDaysOut = earningsDate
      ? Math.round((new Date(earningsDate+'T00:00:00') - today) / 86400000)
      : null
    const epsEstimated = nextEarnings?.epsEstimated ?? null
    const revenueEstimated = nextEarnings?.revenueEstimated ?? null

    // Analyst price targets
    const targetLow    = pt?.priceTargetLow ?? null
    const targetHigh   = pt?.priceTargetHigh ?? null
    const targetMean   = pt?.priceTargetAverage ?? null
    const targetMedian = pt?.priceTargetMedian ?? null

    // Use Claude AI for: EPS whisper, analyst count/rec, short float, SEC 8-K data
    // (endpoints not available on Starter)
    let aiData = {}
    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user',
            content: `Search SEC EDGAR, Finviz, Barchart, and recent news for ${t} stock. Find ALL of the following and return ONLY a JSON object, no markdown, no extra text.

Search specifically for:
1. SEC EDGAR: search https://efts.sec.gov/LATEST/search-index?q=%22${t}%22&forms=8-K for recent 8-K filings - get the direct filing URLs
2. Short float % from Finviz or Barchart
3. IV Rank from Barchart
4. EPS whisper number (different from consensus) from EarningsWhispers
5. Capital raise details from most recent 8-K (amount, type, price per share, investors)
6. Warrant details from 8-K filings
7. Prescription data if commercial pharma (TRx, NRx, trend)
8. Key catalyst one-liner

Return ONLY this JSON (null for anything not found):
{
  "epsWhisper": null,
  "analystCount": null,
  "recommendation": null,
  "shortFloat": null,
  "shortFloatSource": null,
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
}

For secFilings return array of: {"date": "2026-01-15", "type": "8-K", "description": "...", "url": "https://..."}
For catalogCatalysts return array of NEW catalysts found in SEC filings not already known: {"date": "2026-08-01", "type": "pdufa|phase3|nda|earnings|readout", "description": "..."}`
          }]
        })
      })

      if (aiRes.ok) {
        const raw = await aiRes.json()
        let text = (raw.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')

        // Follow up if tool was used
        if (!text && (raw.content||[]).some(b=>b.type==='tool_use')) {
          const toolResults = (raw.content||[])
            .filter(b=>b.type==='tool_use')
            .map(b=>({ type:'tool_result', tool_use_id:b.id, content:'done' }))
          const f2 = await fetch('https://api.anthropic.com/v1/messages', {
            method:'POST',
            headers:{ 'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01' },
            body: JSON.stringify({
              model:'claude-sonnet-4-6', max_tokens:800,
              tools:[{type:'web_search_20250305',name:'web_search'}],
              messages:[
                {role:'user',content:`Search ${t} stock data, return ONLY JSON with: epsWhisper, analystCount, recommendation, shortFloat, ivRank, lastRaiseAmount, lastRaiseType, lastRaiseDate, lastRaisePricePerShare, raiseVsToday, leadInvestors, warrantStrike, warrantExpiry, warrantShares, dilutionNote, keyCatalyst, secLink`},
                {role:'assistant',content:raw.content},
                {role:'user',content:toolResults}
              ]
            })
          })
          if (f2.ok) {
            const fd = await f2.json()
            text = (fd.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
          }
        }

        if (text) {
          const clean = text.replace(/```json|```/g,'').trim()
          const match = clean.match(/\{[\s\S]*\}/)
          if (match) aiData = JSON.parse(match[0])
        }
      }
    } catch {}

    return res.status(200).json({
      ticker: t,
      companyName:  profile?.companyName ?? null,
      sector:       profile?.sector ?? null,
      industry:     profile?.industry ?? null,
      description:  profile?.description ?? null,
      website:      profile?.website ?? null,
      ceo:          profile?.ceo ?? null,
      employees:    profile?.fullTimeEmployees ?? null,
      exchange:     profile?.exchange ?? null,

      price,
      marketCap:    fmtCap(marketCap),
      marketCapRaw: marketCap,
      week52High,
      week52Low,
      avgVolume:    quote?.avgVolume ?? profile?.volAvg ?? null,
      beta:         profile?.beta ?? null,
      change:       quote?.change ?? null,
      changePct:    quote?.changePercentage ?? null,
      dayHigh:      quote?.dayHigh ?? null,
      dayLow:       quote?.dayLow  ?? null,

      // Earnings
      earningsDate,
      earningsDaysOut,
      epsEstimated,
      epsEstimatedFmt: epsEstimated != null ? `${epsEstimated >= 0?'+':''}${Number(epsEstimated).toFixed(2)}` : null,
      revenueEstimated,
      revenueEstimateFmt: revenueEstimated ? fmt(revenueEstimated) : null,

      // Balance sheet
      cash:         fmt(cashRaw),
      cashRaw,
      totalDebt:    fmt(totalDebt),
      quarterlyBurn: fmt(burnRaw),
      quarterlyBurnRaw: burnRaw,
      freeCashFlow: fmt(fcf),
      runway:       runway ? `${runway.toFixed(1)} qtrs` : null,
      runwayMonths: runwayMos,

      // Analyst targets
      targetLow,
      targetMean,
      targetHigh,
      targetMedian,

      // From Claude AI
      epsWhisper:    aiData.epsWhisper    ?? null,
      analystCount:  aiData.analystCount  ?? null,
      recommendation:aiData.recommendation?? null,
      shortFloat:    aiData.shortFloat    ?? null,
      ivRank:        aiData.ivRank        ?? null,
      lastRaiseAmount:       aiData.lastRaiseAmount        ?? null,
      lastRaiseType:         aiData.lastRaiseType          ?? null,
      lastRaiseDate:         aiData.lastRaiseDate          ?? null,
      lastRaisePricePerShare:aiData.lastRaisePricePerShare ?? null,
      raiseVsToday:          aiData.raiseVsToday           ?? null,
      leadInvestors:         aiData.leadInvestors          ?? null,
      warrantStrike:         aiData.warrantStrike          ?? null,
      warrantExpiry:         aiData.warrantExpiry          ?? null,
      warrantShares:         aiData.warrantShares          ?? null,
      dilutionNote:          aiData.dilutionNote           ?? null,
      keyCatalyst:           aiData.keyCatalyst            ?? null,
      secLink:               aiData.secLink                ?? null,
      secFilings:            aiData.secFilings             ?? [],
      catalogCatalysts:      aiData.catalogCatalysts       ?? [],
      rxDrugName:            aiData.rxDrugName             ?? null,
      rxIndication:          aiData.rxIndication           ?? null,
      rxTRx:                 aiData.rxTRx                  ?? null,
      rxNRx:                 aiData.rxNRx                  ?? null,
      rxTrend:               aiData.rxTrend                ?? null,
      rxMarketShare:         aiData.rxMarketShare          ?? null,
      rxEarningsImplication: aiData.rxEarningsImplication  ?? null,
      shortFloatSource:      aiData.shortFloatSource       ?? null,

      updatedAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error('Stock API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
