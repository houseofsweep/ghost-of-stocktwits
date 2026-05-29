export default async function handler(req, res) {
  const { ticker = 'OTLK' } = req.query
  const FMP = process.env.FMP_API_KEY
  const r = await fetch(`https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${ticker}&period=quarter&limit=2&apikey=${FMP}`)
  const d = await r.json()
  res.status(200).json({ status: r.status, data: d })
}
