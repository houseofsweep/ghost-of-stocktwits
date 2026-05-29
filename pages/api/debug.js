export default async function handler(req, res) {
  const FMP = process.env.FMP_API_KEY
  const results = {}

  // Test free endpoints that don't require symbol as premium param
  const tests = [
    // Earnings calendar - date range based, should be free
    `https://financialmodelingprep.com/stable/earnings-calendar?from=2026-05-29&to=2026-08-30`,
    // Economic calendar
    `https://financialmodelingprep.com/stable/economic-calendar?from=2026-05-29&to=2026-06-30`,
    // FDA calendar / biotech specific
    `https://financialmodelingprep.com/stable/fda-calendar`,
    // IPO calendar
    `https://financialmodelingprep.com/stable/ipo-calendar?from=2026-05-29&to=2026-07-30`,
    // Biotech catalyst
    `https://financialmodelingprep.com/stable/bio-catalyst-calendar`,
  ]

  for (const url of tests) {
    const key = url.split('/stable/')[1].split('?')[0]
    try {
      const r = await fetch(`${url}&apikey=${FMP}`)
      const text = await r.text()
      let data
      try { data = JSON.parse(text) } catch { data = text.slice(0,200) }
      const sample = Array.isArray(data) ? { count: data.length, first: data[0] } : data
      results[key] = { status: r.status, ok: r.ok, sample }
    } catch(e) {
      results[key] = { error: e.message }
    }
  }

  res.status(200).json(results)
}
