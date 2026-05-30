export const config = { maxDuration: 300 }

const TICKERS = [
  'NUVB','IDYA','SPRB','VSTM','RVMD','ATAI','OTLK','AMRZ','PTGX','RYTM',
  'RCKT','SAGE','ALNY','VRTX','SRPT','BMRN','FOLD','KRYS','RARE','BPMC',
  'IONS','ACAD','SNDX','VERA','PRTA','NUVL','VRDN','SRRK','LRMR','SMMT',
  'BEAM','NTLA','CRSP','EDIT','ARWR','RCUS','FULC','PRAX','KYMR','ARVN',
  'KURA','MRTX','REGN','INO','GILD','BIIB','AMGN','MRNA','BNTX','NVAX',
  'INCY','EXEL','ITCI','DNLI','BLUE','FATE','ARCT','VERV','ATRA','DAWN',
  'RLAY','OLMA','ANAB','AKRO','ELVN','CLDX','CYCN','ADMA','MGNX','NKTR',
]

export default async function handler(req, res) {
  const secret = req.headers['x-cron-secret'] || req.query.secret
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const ANTHRO = process.env.ANTHROPIC_API_KEY
  if (!ANTHRO) return res.status(500).json({ error: 'No Anthropic key' })

  const KV_URL = process.env.KV_REST_API_URL
  const KV_TOKEN = process.env.KV_REST_API_TOKEN

  const results = { success: [], failed: [], total: TICKERS.length }
  const startTime = Date.now()
  const MAX_RUNTIME = 270_000

  for (const ticker of TICKERS) {
    if (Date.now() - startTime > MAX_RUNTIME) break

    try {
      const data = await fetchAIData(ticker, ANTHRO)
      if (data) {
        data.cachedAt = new Date().toISOString()
        // Store in KV via REST API directly (no SDK import needed)
        if (KV_URL && KV_TOKEN) {
          await fetch(`${KV_URL}/set/stock:${ticker}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify([JSON.stringify(data), 'EX', 86400])
          })
        }
        results.success.push(ticker)
        console.log(`✅ ${ticker}`)
      } else {
        results.failed.push(ticker)
      }
    } catch (err) {
      results.failed.push(ticker)
      console.log(`❌ ${ticker}: ${err.message}`)
    }

    await new Promise(r => setTimeout(r, 12000))
  }

  return res.status(200).json({
    ...results,
    elapsed: `${Math.round((Date.now() - startTime) / 1000)}s`,
    completedAt: new Date().toISOString()
  })
}

async function fetchAIData(t, ANTHRO) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHRO, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'You are a financial data extractor. Search for data then output ONLY a raw JSON object starting with { and ending with }. No markdown. No backticks. No explanation.',
      messages: [{
        role: 'user',
        content: `Today is ${new Date().toDateString()}. Search for the most recent 2025-2026 data on ${t} stock.\n\nSearch 1: "site:sec.gov ${t} 8-K 2026"\nSearch 2: "${t} warrant strike price offering 2025 2026"\nSearch 3: "${t} short float 2026"\n\nReturn ONLY this JSON (null for anything not found):\n{"shortFloat":null,"warrantStrike":null,"warrantExpiry":null,"warrantShares":null,"dilutionNote":null,"keyCatalyst":null,"lastRaiseAmount":null,"lastRaiseType":null,"lastRaiseDate":null,"lastRaisePricePerShare":null,"raiseVsToday":null,"leadInvestors":null,"secFilings":[],"catalogCatalysts":[],"sharesOutstanding":null,"fullyDilutedShares":null,"fdmc":null}`
      }]
    })
  })
  if (!r.ok) return null
  const d = await r.json()
  const text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
  if (!text) return null
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  const data = JSON.parse(match[0])
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && !(Array.isArray(v) && v.length === 0)))
}
