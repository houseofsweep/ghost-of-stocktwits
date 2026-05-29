// /pages/api/stock.js
// Fetches rich stock data for the deep dive panel

export default async function handler(req, res) {
  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker required' })

  const t = ticker.toUpperCase()

  try {
    // Fetch from Yahoo Finance (free, no key needed)
    const [quoteRes, statsRes] = await Promise.allSettled([
      fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${t}?modules=price,summaryDetail,defaultKeyStatistics,financialData,earningsTrend,calendarEvents,assetProfile`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }),
      fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${t}?modules=balanceSheetHistory,cashflowStatementHistory,incomeStatementHistory`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
    ])

    let quote = null, stats = null

    if (quoteRes.status === 'fulfilled' && quoteRes.value.ok) {
      const d = await quoteRes.value.json()
      quote = d?.quoteSummary?.result?.[0] || null
    }

    if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
      const d = await statsRes.value.json()
      stats = d?.quoteSummary?.result?.[0] || null
    }

    if (!quote) return res.status(404).json({ error: 'Ticker not found' })

    const price      = quote.price || {}
    const fin        = quote.financialData || {}
    const keyStats   = quote.defaultKeyStatistics || {}
    const summary    = quote.summaryDetail || {}
    const calendar   = quote.calendarEvents || {}
    const profile    = quote.assetProfile || {}
    const earningsTrend = quote.earningsTrend?.trend || []

    // Price & market cap
    const currentPrice = price.regularMarketPrice?.raw
    const marketCap    = price.marketCap?.raw
    const marketCapFmt = price.marketCap?.fmt

    // Sector detection
    const sector = profile.sector || price.sector || null
    const industry = profile.industry || null

    // Earnings
    const earningsDate = calendar.earnings?.earningsDate?.[0]?.raw
      ? new Date(calendar.earnings.earningsDate[0].raw * 1000).toISOString().split('T')[0]
      : null
    const earningsDaysOut = earningsDate
      ? Math.round((new Date(earningsDate) - new Date()) / 86400000)
      : null

    // EPS estimates
    const nextQtr = earningsTrend.find(t => t.period === '+1q') || earningsTrend[0] || {}
    const epsEstimate = nextQtr?.earningsEstimate?.avg?.raw ?? null
    const revenueEstimate = nextQtr?.revenueEstimate?.avg?.raw ?? null
    const revenueEstimateFmt = nextQtr?.revenueEstimate?.avg?.fmt ?? null

    // Balance sheet - cash & burn
    const cashRaw = fin.totalCash?.raw ?? null
    const cashFmt = fin.totalCash?.fmt ?? null
    const operatingCF = fin.operatingCashflow?.raw ?? null

    // Quarterly burn (from cash flow)
    let quarterlyBurn = null
    let runway = null
    try {
      const cfHistory = stats?.cashflowStatementHistory?.cashflowStatements || []
      if (cfHistory.length > 0) {
        const latestCF = cfHistory[0]?.totalCashFromOperatingActivities?.raw
        if (latestCF && latestCF < 0) {
          quarterlyBurn = Math.abs(latestCF)
          runway = cashRaw ? cashRaw / quarterlyBurn : null
        }
      }
    } catch {}

    // Analyst targets
    const targetLow    = fin.targetLowPrice?.raw ?? null
    const targetMean   = fin.targetMeanPrice?.raw ?? null
    const targetHigh   = fin.targetHighPrice?.raw ?? null
    const targetMedian = fin.targetMedianPrice?.raw ?? null
    const analystCount = fin.numberOfAnalystOpinions?.raw ?? null
    const recommendation = fin.recommendationKey ?? null

    // Short float & options data
    const shortPct = keyStats.shortPercentOfFloat?.raw ?? null
    const shortPctFmt = keyStats.shortPercentOfFloat?.fmt ?? null

    // 52 week
    const week52High = summary.fiftyTwoWeekHigh?.raw ?? null
    const week52Low  = summary.fiftyTwoWeekLow?.raw ?? null

    // Volume
    const avgVolume = price.averageDailyVolume3Month?.raw ?? null

    // Company info
    const companyName = price.longName || price.shortName || t
    const description = profile.longBusinessSummary || null
    const website     = profile.website || null

    // Format market cap nicely
    function fmtCap(n) {
      if (!n) return null
      if (n >= 1e12) return `$${(n/1e12).toFixed(1)}T`
      if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`
      if (n >= 1e6)  return `$${(n/1e6).toFixed(0)}M`
      return `$${n.toLocaleString()}`
    }

    function fmtNum(n) {
      if (!n) return null
      if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`
      if (n >= 1e6)  return `$${(n/1e6).toFixed(1)}M`
      if (n >= 1e3)  return `$${(n/1e3).toFixed(0)}K`
      return `$${n.toFixed(2)}`
    }

    // Now use AI to extract SEC 8-K data
    let secData = null
    try {
      secData = await fetchSECData(t)
    } catch {}

    return res.status(200).json({
      ticker: t,
      companyName,
      sector,
      industry,
      description,
      website,

      // Price
      price: currentPrice,
      marketCap: marketCapFmt || fmtCap(marketCap),
      marketCapRaw: marketCap,
      week52High,
      week52Low,
      avgVolume,

      // Earnings
      earningsDate,
      earningsDaysOut,
      epsEstimate,
      revenueEstimate,
      revenueEstimateFmt,

      // Balance sheet
      cash: cashFmt || fmtNum(cashRaw),
      cashRaw,
      quarterlyBurn: fmtNum(quarterlyBurn),
      quarterlyBurnRaw: quarterlyBurn,
      runway: runway ? `${runway.toFixed(1)} qtrs` : null,
      runwayMonths: runway ? Math.round(runway * 3) : null,

      // Analyst
      targetLow,
      targetMean,
      targetHigh,
      targetMedian,
      analystCount,
      recommendation: recommendation ? recommendation.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase()) : null,

      // Short / options
      shortFloat: shortPctFmt || (shortPct ? `${(shortPct*100).toFixed(1)}%` : null),
      shortFloatRaw: shortPct,

      // SEC data (capital raises, warrants, catalysts from 8-K)
      secData,

      updatedAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error('Stock API error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// Fetch and AI-parse recent 8-K filings from SEC EDGAR
async function fetchSECData(ticker) {
  try {
    // Get CIK from SEC EDGAR
    const searchRes = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&dateRange=custom&startdt=${getDateStr(-180)}&enddt=${getDateStr(0)}&forms=8-K`,
      { headers: { 'User-Agent': 'GhostOfStocktwits contact@ghostofstocktwits.com' } }
    )
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const hits = searchData.hits?.hits || []
    if (hits.length === 0) return null

    // Get the 3 most recent 8-K filings text
    const recentFilings = hits.slice(0, 3)
    let combinedText = ''

    for (const hit of recentFilings) {
      const src = hit._source || {}
      const snippet = src.file_date + ' ' + (src.period_of_report || '') + ' ' + (src.display_names || '') + ' ' + (src.form_type || '')
      combinedText += snippet + '\n'

      // Try to get filing document text
      try {
        const accNo = hit._id?.replace(/[^0-9]/g, '') || ''
        if (accNo.length >= 18) {
          const formatted = `${accNo.slice(0,10)}-${accNo.slice(10,12)}-${accNo.slice(12)}`
          const docRes = await fetch(
            `https://www.sec.gov/Archives/edgar/data/${src.entity_id || ''}/`,
            { headers: { 'User-Agent': 'GhostOfStocktwits contact@ghostofstocktwits.com' } }
          )
        }
      } catch {}
    }

    if (!combinedText.trim()) return null

    // Use Claude to extract structured data from SEC filings
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Extract structured financial data from these recent SEC 8-K filing snippets for ${ticker}. Return ONLY valid JSON, no markdown, no explanation.

Filing data:
${combinedText}

Return this exact JSON structure (use null for missing fields):
{
  "lastRaiseAmount": null,
  "lastRaiseType": null,
  "lastRaiseDate": null,
  "lastRaisePricePerShare": null,
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

    if (!aiRes.ok) return null
    const aiData = await aiRes.json()
    const text = aiData.content?.[0]?.text || ''
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      return null
    }
  } catch {
    return null
  }
}

function getDateStr(daysOffset) {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().split('T')[0]
}
