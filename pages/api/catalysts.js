const WATCHLIST = ['NUVB','IDYA','SPRB','VSTM','RVMD','ATAI','OTLK','AMRZ']

const STATIC_PDUFA = [
  { date: '2026-06-02', ticker: 'IONS',  drug: 'Eplontersen',         catalyst: 'PDUFA — sNDA',            company: 'Ionis Pharmaceuticals' },
  { date: '2026-06-06', ticker: 'DAWN',  drug: 'Bimekizumab',         catalyst: 'PDUFA — sBLA',            company: 'UCB' },
  { date: '2026-06-15', ticker: 'PRTA',  drug: 'Prasinezumab',        catalyst: 'PDUFA — BLA',             company: 'Prothena' },
  { date: '2026-06-20', ticker: 'SNDX',  drug: 'Revumenib',           catalyst: 'PDUFA — NDA (AML)',       company: 'Syndax Pharma' },
  { date: '2026-06-26', ticker: 'ACAD',  drug: 'Pimavanserin',        catalyst: 'PDUFA — sNDA',            company: 'Acadia Pharma' },
  { date: '2026-07-01', ticker: 'BMRN',  drug: 'Vosoritide',          catalyst: 'PDUFA — sNDA',            company: 'BioMarin' },
  { date: '2026-07-10', ticker: 'FOLD',  drug: 'Pegunigalsidase alfa', catalyst: 'PDUFA — BLA',             company: 'Amicus Therapeutics' },
  { date: '2026-07-15', ticker: 'KRYS',  drug: 'Beremagene gel',      catalyst: 'PDUFA — BLA (DEB)',       company: 'Krystal Biotech' },
  { date: '2026-07-22', ticker: 'RARE',  drug: 'DTX401',              catalyst: 'PDUFA — BLA',             company: 'Ultragenyx' },
  { date: '2026-07-28', ticker: 'PTGX',  drug: 'Rusfertide',          catalyst: 'PDUFA — NDA (PV)',        company: 'Protagonist Therapeutics' },
  { date: '2026-08-04', ticker: 'RVMD',  drug: 'RMC-6236',            catalyst: 'Phase 3 Interim Readout', company: 'Revolution Medicines' },
  { date: '2026-08-12', ticker: 'SRPT',  drug: 'SRP-9001',            catalyst: 'PDUFA — BLA',             company: 'Sarepta Therapeutics' },
  { date: '2026-08-19', ticker: 'NUVB',  drug: 'NUV-868',             catalyst: 'Phase 2 Readout',         company: 'Nuvation Bio' },
  { date: '2026-08-25', ticker: 'IDYA',  drug: 'Iniparib combo',      catalyst: 'Phase 3 Data',            company: 'IDEAYA Biosciences' },
  { date: '2026-09-03', ticker: 'ALNY',  drug: 'Vutrisiran',          catalyst: 'PDUFA — sNDA',            company: 'Alnylam Pharmaceuticals' },
  { date: '2026-09-10', ticker: 'VRTX',  drug: 'Suzetrigine',         catalyst: 'PDUFA — NDA (pain)',      company: 'Vertex Pharmaceuticals' },
  { date: '2026-09-18', ticker: 'RCKT',  drug: 'RP-L102',             catalyst: 'PDUFA — BLA',             company: 'Rocket Pharma' },
  { date: '2026-09-25', ticker: 'RYTM',  drug: 'Setmelanotide',       catalyst: 'PDUFA — sNDA',            company: 'Rhythm Pharmaceuticals' },
  { date: '2026-10-02', ticker: 'VSTM',  drug: 'VS-6766',             catalyst: 'Phase 2 Readout',         company: 'Verastem Oncology' },
  { date: '2026-10-15', ticker: 'SPRB',  drug: 'Tildacerfont',        catalyst: 'Phase 3 Readout (CAH)',   company: 'Spruce Biosciences' },
  { date: '2026-10-22', ticker: 'BPMC',  drug: 'Pralsetinib',         catalyst: 'PDUFA — sNDA',            company: 'Blueprint Medicines' },
  { date: '2026-11-05', ticker: 'SAGE',  drug: 'SAGE-718',            catalyst: 'Phase 3 Readout',         company: 'Sage Therapeutics' },
  { date: '2026-11-12', ticker: 'ATAI',  drug: 'PCN-101',             catalyst: 'Phase 2b Readout',        company: 'atai Life Sciences' },
  { date: '2026-11-20', ticker: 'ARCT',  drug: 'ARCT-032',            catalyst: 'Phase 3 Readout',         company: 'Arctus Therapeutics' },
]

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')

  try {
    const ctData = await fetchClinicalTrials().catch(() => [])

    const all = [
      ...STATIC_PDUFA.map(p => ({ ...p, source: 'Ghost Curated', type: 'PDUFA' })),
      ...ctData,
    ]

    const seen = new Set()
    const unique = all.filter(item => {
      const key = `${item.ticker}_${item.date}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    unique.sort((a, b) => new Date(a.date) - new Date(b.date))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const enriched = unique
      .map(item => {
        const dt = new Date(item.date)
        const daysOut = Math.round((dt - today) / (1000 * 60 * 60 * 24))
        return {
          ...item,
          daysOut,
          isWatchlist: WATCHLIST.includes(item.ticker?.toUpperCase()),
          urgency: daysOut <= 7 ? 'high' : daysOut <= 30 ? 'medium' : 'low',
        }
      })
      .filter(item => item.daysOut >= -1 && item.daysOut <= 365)

    res.status(200).json({
      catalysts: enriched,
      meta: {
        total: enriched.length,
        sources: { clinicalTrials: ctData.length, manual: STATIC_PDUFA.length },
        updated: new Date().toISOString(),
      }
    })
  } catch (err) {
    console.error('Catalyst API error:', err)
    res.status(500).json({ catalysts: [], error: 'Failed to fetch catalyst data' })
  }
}

async function fetchClinicalTrials() {
  const params = new URLSearchParams({
    'query.term': 'oncology OR hematology OR rare disease OR autoimmune',
    'postFilter.advanced': 'AREA[Phase](PHASE3 OR PHASE2)',
    'filter.overallStatus': 'ACTIVE_NOT_RECRUITING,COMPLETED',
    'sort': 'PrimaryCompletionDate:asc',
    'pageSize': '50',
    'format': 'json',
    'fields': 'NCTId,BriefTitle,OverallStatus,Phase,PrimaryCompletionDate,Condition,LeadSponsorName,InterventionName'
  })

  const response = await fetch(`https://clinicaltrials.gov/api/v2/studies?${params}`, {
    headers: { 'User-Agent': 'GhostOfStocktwits/1.0' },
    signal: AbortSignal.timeout(8000),
  })

  if (!response.ok) return []
  const data = await response.json()
  const studies = data.studies || []

  return studies.map(s => {
    const proto = s.protocolSection || {}
    const idMod     = proto.identificationModule || {}
    const statusMod = proto.statusModule || {}
    const designMod = proto.designModule || {}
    const sponsorMod = proto.sponsorCollaboratorsModule || {}
    const condMod   = proto.conditionsModule || {}
    const armsMod   = proto.armsInterventionsModule || {}

    const completionDate = statusMod.primaryCompletionDateStruct?.date || ''
    const phases = designMod.phases || []
    const conditions = (condMod.conditions || []).slice(0, 2).join(', ')
    const interventions = (armsMod.interventions || []).map(i => i.interventionName).slice(0, 2).join(', ')
    const sponsor = sponsorMod.leadSponsor?.name || ''
    const ticker = extractTicker(sponsor) || sponsor.slice(0, 6).toUpperCase().replace(/\s/g, '')

    return {
      date: completionDate,
      ticker,
      drug: interventions || 'Unknown',
      catalyst: `Phase ${phases.map(p => p.replace('PHASE', '')).join('/')} Readout`,
      company: sponsor,
      condition: conditions,
      nctId: idMod.nctId || '',
      title: idMod.briefTitle || '',
      source: 'ClinicalTrials.gov',
      type: 'Trial Readout',
    }
  }).filter(item => item.date && item.date.length >= 7)
}

const KNOWN_TICKERS = {
  'Bristol-Myers Squibb': 'BMY', 'Pfizer': 'PFE', 'Merck': 'MRK',
  'AstraZeneca': 'AZN', 'Roche': 'RHHBY', 'Novartis': 'NVS',
  'Johnson & Johnson': 'JNJ', 'Eli Lilly': 'LLY', 'AbbVie': 'ABBV',
  'Amgen': 'AMGN', 'Gilead': 'GILD', 'Biogen': 'BIIB',
  'Regeneron': 'REGN', 'Moderna': 'MRNA', 'BioNTech': 'BNTX',
  'Vertex': 'VRTX', 'Alnylam': 'ALNY', 'Sarepta': 'SRPT',
  'Blueprint': 'BPMC', 'Protagonist': 'PTGX', 'Rhythm': 'RYTM',
  'Rocket': 'RCKT', 'Ultragenyx': 'RARE', 'Sage': 'SAGE',
}

function extractTicker(sponsor) {
  for (const [name, ticker] of Object.entries(KNOWN_TICKERS)) {
    if (sponsor.toLowerCase().includes(name.toLowerCase())) return ticker
  }
  return null
}
