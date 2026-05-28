// scripts/fetch-trials.js
// Runs daily via GitHub Actions — fetches ClinicalTrials.gov data
// and saves to data/trials.json for the Next.js API to read

const fs = require('fs')
const path = require('path')
const https = require('https')

const KNOWN_TICKERS = {
  'bristol-myers': 'BMY', 'pfizer': 'PFE', 'merck': 'MRK', 'astrazeneca': 'AZN',
  'roche': 'RHHBY', 'novartis': 'NVS', 'johnson': 'JNJ', 'eli lilly': 'LLY',
  'abbvie': 'ABBV', 'amgen': 'AMGN', 'gilead': 'GILD', 'biogen': 'BIIB',
  'regeneron': 'REGN', 'moderna': 'MRNA', 'biontech': 'BNTX', 'vertex': 'VRTX',
  'alnylam': 'ALNY', 'sarepta': 'SRPT', 'blueprint': 'BPMC', 'protagonist': 'PTGX',
  'rhythm': 'RYTM', 'rocket': 'RCKT', 'ultragenyx': 'RARE', 'sage': 'SAGE',
  'ionis': 'IONS', 'krystal': 'KRYS', 'biomarin': 'BMRN', 'acadia': 'ACAD',
  'syndax': 'SNDX', 'vera therapeutics': 'VERA', 'pharmaessentia': 'PESI',
  'nuvation': 'NUVB', 'ideaya': 'IDYA', 'spruce': 'SPRB', 'verastem': 'VSTM',
  'revolution medicines': 'RVMD', 'atai': 'ATAI', 'incyte': 'INCY',
  'mirati': 'MRTX', 'gsk': 'GSK', 'kura oncology': 'KURA', 'ardelyx': 'ARDX',
  'zentalis': 'ZNTL', 'ptc therapeutics': 'PTCT', 'karuna': 'KRTX',
  'relay therapeutics': 'RLAY', 'c4 therapeutics': 'CCCC', 'kymera': 'KYMR',
  'arvinas': 'ARVN', 'foghorn': 'FHTX', 'erasca': 'ERAS', 'tango': 'TNGX',
  'nurix': 'NRIX', 'beam therapeutics': 'BEAM', 'intellia': 'NTLA',
  'crispr therapeutics': 'CRSP', 'editas': 'EDIT', 'arrowhead': 'ARWR',
  'arcus': 'RCUS', 'fulcrum': 'FULC', 'praxis': 'PRAX', 'nuvalent': 'NUVL',
  'viridian': 'VRDN', 'ascendis': 'ASND', 'denali': 'DNLI', 'regenxbio': 'RGNX',
  'travere': 'TVTX', 'aquestive': 'AQST', 'inovio': 'INO', 'camurus': 'CAMR',
  'boundless bio': 'BOLD', 'turning point': 'TPTX', 'global blood': 'GBT',
  'sanofi': 'SNY', 'argenx': 'ARGX', 'daiichi': 'DSNKY', 'immedica': 'IMMP',
}

function getTicker(sponsor = '') {
  const s = sponsor.toLowerCase()
  for (const [k, v] of Object.entries(KNOWN_TICKERS)) {
    if (s.includes(k)) return v
  }
  return sponsor.replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() || '—'
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'GhostOfStocktwits/1.0 (Biotech Catalyst Calendar; contact@ghostofstocktwits.com)',
        'Accept': 'application/json',
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)) }
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

async function fetchPage(pageToken = '') {
  const params = new URLSearchParams({
    'filter.overallStatus': 'ACTIVE_NOT_RECRUITING,COMPLETED',
    'postFilter.advanced': 'AREA[Phase](PHASE3 OR PHASE2 OR PHASE2_PHASE3)',
    'sort': 'PrimaryCompletionDate:asc',
    'pageSize': '1000',
    'format': 'json',
    'fields': [
      'NCTId', 'BriefTitle', 'Phase', 'PrimaryCompletionDate',
      'Condition', 'LeadSponsorName', 'InterventionName', 'OverallStatus',
      'EnrollmentCount', 'StartDate', 'StudyType'
    ].join(','),
  })
  if (pageToken) params.set('pageToken', pageToken)

  const url = `https://clinicaltrials.gov/api/v2/studies?${params}`
  console.log(`Fetching: ${url.slice(0, 100)}...`)
  return fetchUrl(url)
}

function parseStudy(s) {
  const p = s.protocolSection || {}
  const id = p.identificationModule || {}
  const st = p.statusModule || {}
  const de = p.designModule || {}
  const sp = p.sponsorCollaboratorsModule || {}
  const co = p.conditionsModule || {}
  const ar = p.armsInterventionsModule || {}

  const phases = de.phases || []
  const drugs = (ar.interventions || [])
    .map(i => i.interventionName)
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  const sponsor = sp.leadSponsor?.name || ''
  const phaseStr = phases.map(x => x.replace('PHASE', '')).join('/')
  const phaseType = phases.some(p => p === 'PHASE3' || p === 'PHASE2_PHASE3') ? 'phase3' : 'phase2'
  const conditions = (co.conditions || []).slice(0, 3).join(', ')

  return {
    date: st.primaryCompletionDateStruct?.date || '',
    ticker: getTicker(sponsor),
    drug: drugs || 'Unknown',
    catalyst: `Phase ${phaseStr} Readout`,
    company: sponsor,
    condition: conditions,
    nctId: id.nctId || '',
    title: id.briefTitle || '',
    source: 'ClinicalTrials.gov',
    type: phaseType,
    enrollment: de.enrollmentInfo?.count || 0,
    status: st.overallStatus || '',
  }
}

async function main() {
  console.log('🔬 Ghost of Stocktwits — Catalyst Fetcher')
  console.log(`📅 ${new Date().toISOString()}`)
  console.log('Fetching from ClinicalTrials.gov...\n')

  const allStudies = []
  let pageToken = ''
  let pages = 0

  do {
    try {
      const data = await fetchPage(pageToken)
      const studies = data.studies || []
      console.log(`Page ${pages + 1}: ${studies.length} studies`)
      allStudies.push(...studies)
      pageToken = data.nextPageToken || ''
      pages++

      // Small delay to be respectful to the API
      await new Promise(r => setTimeout(r, 500))

      if (pages >= 10) {
        console.log('Reached page limit (10,000 studies max)')
        break
      }
    } catch (err) {
      console.error(`Error on page ${pages + 1}: ${err.message}`)
      break
    }
  } while (pageToken)

  console.log(`\nTotal studies fetched: ${allStudies.length}`)

  // Parse and filter
  const parsed = allStudies
    .map(parseStudy)
    .filter(x => x.date && x.date.length >= 7)

  // Only keep future dates (next 18 months)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() + 18)

  const filtered = parsed.filter(x => {
    const dt = new Date(x.date + 'T00:00:00')
    return dt >= today && dt <= cutoff
  })

  console.log(`Filtered to ${filtered.length} upcoming studies`)

  // Deduplicate by NCT ID
  const seen = new Set()
  const unique = filtered.filter(x => {
    if (!x.nctId || seen.has(x.nctId)) return false
    seen.add(x.nctId)
    return true
  })

  console.log(`${unique.length} unique studies after dedup`)

  // Save to data directory
  const dataDir = path.join(__dirname, '..', 'data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)

  const output = {
    fetched: new Date().toISOString(),
    count: unique.length,
    studies: unique,
  }

  const outputPath = path.join(dataDir, 'trials.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\n✅ Saved ${unique.length} studies to data/trials.json`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
