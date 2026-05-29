export default async function handler(req, res) {
  const FMP = process.env.FMP_API_KEY
  const tickers = ['OTLK', 'NUVB', 'IDYA', 'VRTX', 'REGN']
  const results = {}

  for (const t of tickers) {
    const r = await fetch(`https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${t}&period=quarter&limit=1&apikey=${FMP}`)
    const d = await r.json()
    const q = Array.isArray(d) ? d[0] : d
    results[t] = {
      operatingCashFlow: q?.operatingCashFlow,
      freeCashFlow: q?.freeCashFlow,
      reportedCurrency: q?.reportedCurrency,
      period: q?.period,
      date: q?.date,
    }
  }

  // Also check balance sheet
  const results2 = {}
  for (const t of ['OTLK', 'NUVB', 'VRTX']) {
    const r = await fetch(`https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${t}&period=quarter&limit=1&apikey=${FMP}`)
    const d = await r.json()
    const q = Array.isArray(d) ? d[0] : d
    results2[t] = {
      cash: q?.cashAndCashEquivalents,
      totalDebt: q?.totalDebt,
      totalAssets: q?.totalAssets,
    }
  }

  res.status(200).json({ cashFlow: results, balanceSheet: results2 })
}
