export const config = { maxDuration: 30 }

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

    // AI data loaded separately via /api/stockai
    return res.status(200).json({
      ticker: t,
      companyName:  profile?.companyName ?? null,
      sector:       profile?.sector ?? null,
      industry:     profile?.industry ?? null,
      description:  profile?.description ?? null,
      website:      profile?.website ?? null,
      ceo:          profile?.ceo ?? null,
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
      earningsDate,
      earningsDaysOut,
      epsEstimated,
      epsEstimatedFmt: epsEstimated != null ? `${epsEstimated >= 0?'+':''}${Number(epsEstimated).toFixed(2)}` : null,
      revenueEstimated,
      revenueEstimateFmt: revenueEstimated ? fmt(revenueEstimated) : null,
      cash:         fmt(cashRaw),
      cashRaw,
      totalDebt:    fmt(totalDebt),
      quarterlyBurn: fmt(burnRaw),
      quarterlyBurnRaw: burnRaw,
      freeCashFlow: fmt(fcf),
      runway:       runway ? `${runway.toFixed(1)} qtrs` : null,
      runwayMonths: runwayMos,
      targetLow,
      targetMean,
      targetHigh,
      targetMedian,
      updatedAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error('Stock API error:', err)
    return res.status(500).json({ error: err.message })
  }
}
