export default async function handler(req, res) {
  const { ticker = 'OTLK' } = req.query
  const FMP = process.env.FMP_API_KEY
  const results = { ticker }

  const endpoints = [
    `https://financialmodelingprep.com/stable/quote?symbol=${ticker}`,
    `https://financialmodelingprep.com/stable/profile?symbol=${ticker}`,
    `https://financialmodelingprep.com/stable/income-statement?symbol=${ticker}&period=quarter&limit=1`,
    `https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${ticker}&period=quarter&limit=1`,
    `https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${ticker}&period=quarter&limit=1`,
    `https://financialmodelingprep.com/stable/analyst-estimates?symbol=${ticker}&limit=2`,
    `https://financialmodelingprep.com/stable/price-target-consensus?symbol=${ticker}`,
    `https://financialmodelingprep.com/stable/sec-filings?symbol=${ticker}&formType=8-K&limit=3`,
  ]

  for (const url of endpoints) {
    const key = url.split('/stable/')[1].split('?')[0]
    try {
      const r = await fetch(`${url}&apikey=${FMP}`)
      const text = await r.text()
      let data
      try { data = JSON.parse(text) } catch { data = text.slice(0,150) }
      results[key] = { status: r.status, ok: r.ok, sample: Array.isArray(data) ? data[0] : data }
    } catch(e) {
      results[key] = { error: e.message }
    }
  }

  res.status(200).json(results)
}
