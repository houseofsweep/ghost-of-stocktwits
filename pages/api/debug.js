export default async function handler(req, res) {
  const { ticker = 'OTLK' } = req.query
  const FMP = process.env.FMP_API_KEY
  const ANTHRO = process.env.ANTHROPIC_API_KEY

  const results = {
    fmpKeyExists: !!FMP,
    fmpKeyPrefix: FMP ? FMP.slice(0,6) + '...' : 'MISSING',
    anthropicKeyExists: !!ANTHRO,
  }

  // Try FMP call
  try {
    const r = await fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${FMP}`)
    results.fmpStatus = r.status
    results.fmpOk = r.ok
    if (r.ok) {
      const d = await r.json()
      results.fmpSample = d[0]?.companyName || d[0] || d
    } else {
      results.fmpError = await r.text()
    }
  } catch(e) {
    results.fmpException = e.message
  }

  res.status(200).json(results)
}
