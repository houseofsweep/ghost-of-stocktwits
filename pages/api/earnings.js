// Auto-fetches live earnings calendar from FMP free tier
// Returns enriched earnings events ready to merge into catalyst feed

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800')
  
  const FMP = process.env.FMP_API_KEY
  const today = new Date().toISOString().split('T')[0]
  const end = new Date()
  end.setDate(end.getDate() + 120)
  const endDate = end.toISOString().split('T')[0]

  try {
    const r = await fetch(
      `https://financialmodelingprep.com/stable/earnings-calendar?from=${today}&to=${endDate}&apikey=${FMP}`
    )
    if (!r.ok) return res.status(500).json({ error: 'FMP earnings failed' })
    
    const data = await r.json()
    if (!Array.isArray(data)) return res.status(500).json({ error: 'Bad response' })

    const todayTs = new Date(); todayTs.setHours(0,0,0,0)

    const earnings = data
      .filter(e => e.symbol && e.date)
      .map(e => {
        const daysOut = Math.round((new Date(e.date + 'T00:00:00') - todayTs) / 86400000)
        const epsStr = e.epsEstimated != null ? `EPS est: ${e.epsEstimated >= 0 ? '+' : ''}${e.epsEstimated}` : ''
        const revStr = e.revenueEstimated != null ? `Rev est: $${(e.revenueEstimated/1e6).toFixed(0)}M` : ''
        const detail = [epsStr, revStr].filter(Boolean).join(' · ')
        
        return {
          date: e.date,
          ticker: e.symbol,
          drug: 'Earnings',
          catalyst: `Earnings Report${detail ? ' — ' + detail : ''}`,
          company: e.symbol,
          condition: detail,
          nctId: '',
          type: 'earnings',
          source: 'FMP Earnings Calendar',
          daysOut,
          epsEstimated: e.epsEstimated ?? null,
          revenueEstimated: e.revenueEstimated ?? null,
          urgency: daysOut <= 7 ? 'high' : daysOut <= 30 ? 'medium' : 'low',
          isWatchlist: false,
        }
      })
      .filter(e => e.daysOut >= 0 && e.daysOut <= 120)
      .sort((a,b) => new Date(a.date) - new Date(b.date))

    res.status(200).json({ earnings, count: earnings.length, updatedAt: new Date().toISOString() })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
}
