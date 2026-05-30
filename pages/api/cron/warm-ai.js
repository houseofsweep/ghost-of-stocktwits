import { kv } from '@vercel/kv'
import { fetchAIData } from '../stockai'

export const config = { maxDuration: 300 } // 5 min max (Vercel Pro)

// Master list — your core watchlist + high-priority biotech
const TICKERS = [
  // Core watchlist (always warm)
  'NUVB','IDYA','SPRB','VSTM','RVMD','ATAI','OTLK','AMRZ','PTGX','RYTM',
  'RCKT','SAGE','ALNY','VRTX','SRPT','BMRN','FOLD','KRYS','RARE','BPMC',
  'IONS','ACAD','SNDX','VERA','PRTA','NUVL','VRDN','SRRK','LRMR','SMMT',
  'BEAM','NTLA','CRSP','EDIT','ARWR','RCUS','FULC','PRAX','KYMR','ARVN',
  'KURA','MRTX','REGN','INO',
  // Extended high-value biotech
  'GILD','BIIB','AMGN','MRNA','BNTX','NVAX','INCY','EXEL','ITCI','DNLI',
  'BLUE','FATE','ARCT','VERV','ATRA','DAWN','RLAY','OLMA','ANAB','AKRO',
  'ELVN','CLDX','CYCN','ADMA','MGNX','NKTR','XNCR','ZYME',
  // Speculative / community favorites
  'PURR','DFDV','ABVE',
]

export default async function handler(req, res) {
  // Security: require cron secret
  const secret = req.headers['x-cron-secret'] || req.query.secret
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const ANTHRO = process.env.ANTHROPIC_API_KEY
  if (!ANTHRO) return res.status(500).json({ error: 'No Anthropic key' })

  const results = { success: [], failed: [], skipped: [], total: TICKERS.length }
  const startTime = Date.now()
  const MAX_RUNTIME = 270_000 // stop at 4.5 min to avoid hitting 5 min limit

  for (const ticker of TICKERS) {
    // Bail out if approaching time limit
    if (Date.now() - startTime > MAX_RUNTIME) {
      results.skipped.push(...TICKERS.slice(TICKERS.indexOf(ticker)))
      break
    }

    try {
      // Check if already fresh in cache (< 20hr old — re-warm after 20hrs)
      let skipCache = false
      try {
        const cached = await kv.get(`stock:${ticker}`)
        if (cached && cached.cachedAt) {
          const age = Date.now() - new Date(cached.cachedAt).getTime()
          if (age < 20 * 60 * 60 * 1000) {
            results.skipped.push(ticker)
            skipCache = true
          }
        }
      } catch {}

      if (skipCache) continue

      // Fetch fresh AI data
      const data = await fetchAIData(ticker, ANTHRO)

      if (data) {
        data.cachedAt = new Date().toISOString()
        await kv.set(`stock:${ticker}`, data, { ex: 86400 })
        results.success.push(ticker)
        console.log(`✅ ${ticker} cached`)
      } else {
        results.failed.push(ticker)
        console.log(`❌ ${ticker} no data`)
      }
    } catch (err) {
      results.failed.push(ticker)
      console.log(`❌ ${ticker} error: ${err.message}`)
    }

    // Rate limit protection: 12s between calls (~5 calls/min, well under Anthropic limits)
    await sleep(12000)
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000)
  console.log(`Cron complete: ${results.success.length} cached, ${results.failed.length} failed, ${results.skipped.length} skipped in ${elapsed}s`)

  return res.status(200).json({
    ...results,
    elapsed: `${elapsed}s`,
    completedAt: new Date().toISOString()
  })
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
