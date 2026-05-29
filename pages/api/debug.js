export default async function handler(req, res) {
  const { ticker = 'OTLK' } = req.query
  const FMP = process.env.FMP_API_KEY

  const results = { ticker }

  // Test new stable endpoints
  const endpoints = [
    `/stable/profile?symbol=${ticker}`,
    `/stable/quote?symbol=${ticker}`,
    `/stable/analyst-estimates?symbol=${ticker}&limit=2`,
    `/stable/key-metrics?symbol=${ticker}&limit=1`,
  ]

  for (const ep of endpoints) {
    try {
      const r = await fetch(`https://financialmodelingprep.com/api${ep}&apikey=${FMP}`)
      const text = await r.text()
      let data
      try { data = JSON.parse(text) } catch { data = text.slice(0,100) }
      results[ep.split('?')[0]] = { status: r.status, sample: Array.isArray(data) ? data[0] : data }
    } catch(e) {
      results[ep.split('?')[0]] = { error: e.message }
    }
  }

  res.status(200).json(results)
}
