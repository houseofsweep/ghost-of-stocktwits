export default async function handler(req, res) {
  const { ticker = 'OTLK' } = req.query
  const FMP = process.env.FMP_API_KEY
  const results = {}

  const endpoints = [
    `https://financialmodelingprep.com/stable/profile?symbol=${ticker}`,
    `https://financialmodelingprep.com/stable/quote?symbol=${ticker}`,
    `https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${ticker}&period=quarter&limit=2`,
    `https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${ticker}&period=quarter&limit=2`,
    `https://financialmodelingprep.com/stable/analyst-estimates?symbol=${ticker}&limit=2`,
    `https://financialmodelingprep.com/stable/price-target-consensus?symbol=${ticker}`,
    `https://financialmodelingprep.com/stable/analyst-stock-recommendations?symbol=${ticker}&limit=3`,
    `https://financialmodelingprep.com/stable/sec-filings?symbol=${ticker}&formType=8-K&limit=5`,
    `https://financialmodelingprep.com/stable/short-float?symbol=${ticker}`,
  ]

  for (const url of endpoints) {
    const key = url.split('/stable/')[1].split('?')[0]
    try {
      const r = await fetch(`${url}&apikey=${FMP}`)
      const text = await r.text()
      let data
      try { data = JSON.parse(text) } catch { data = text.slice(0,150) }
      const sample = Array.isArray(data) ? { count: data.length, first: data[0] } : data
      results[key] = { status: r.status, ok: r.ok, sample }
    } catch(e) {
      results[key] = { error: e.message }
    }
  }

  res.status(200).json(results)
}
