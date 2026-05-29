export default async function handler(req, res) {
  const { ticker = 'OTLK' } = req.query
  const FMP = process.env.FMP_API_KEY

  // Test SEC filings endpoint
  const r1 = await fetch(`https://financialmodelingprep.com/stable/sec-filings?symbol=${ticker}&formType=8-K&limit=5&apikey=${FMP}`)
  const d1 = await r1.json()

  // Test EDGAR direct
  const r2 = await fetch(`https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&forms=8-K&dateRange=custom&startdt=2025-01-01&enddt=2026-12-31`, {
    headers: { 'User-Agent': 'GhostOfStocktwits contact@ghost.com' }
  })
  const d2 = await r2.json()

  res.status(200).json({
    fmpFilings: { status: r1.status, data: d1 },
    edgarFilings: { status: r2.status, count: d2?.hits?.total?.value, sample: d2?.hits?.hits?.slice(0,3).map(h => ({ id: h._id, date: h._source?.file_date, desc: h._source?.period_of_report, link: h._source?.file_num })) }
  })
}
