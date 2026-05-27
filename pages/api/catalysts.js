const WATCHLIST = ['NUVB','IDYA','SPRB','VSTM','RVMD','ATAI','OTLK','AMRZ','PTGX','RYTM','RCKT','SAGE','ALNY','VRTX','SRPT','BMRN','FOLD','KRYS','RARE','BPMC','IONS','ACAD','SNDX','VERA','PRTA']

const STATIC_PDUFA = [
  {date:'2026-06-02',ticker:'IONS', drug:'Eplontersen',          cat:'PDUFA — sNDA',            co:'Ionis Pharmaceuticals',   type:'pdufa'},
  {date:'2026-06-06',ticker:'DAWN', drug:'Bimekizumab',          cat:'PDUFA — sBLA',            co:'UCB',                     type:'pdufa'},
  {date:'2026-06-15',ticker:'PRTA', drug:'Prasinezumab',         cat:'PDUFA — BLA',             co:'Prothena',                type:'pdufa'},
  {date:'2026-06-19',ticker:'VERA', drug:'Atacicept',            cat:'PDUFA — BLA (IgAN)',      co:'Vera Therapeutics',       type:'pdufa'},
  {date:'2026-06-20',ticker:'SNDX', drug:'Revumenib',            cat:'PDUFA — NDA (AML)',       co:'Syndax Pharma',           type:'pdufa'},
  {date:'2026-06-26',ticker:'ACAD', drug:'Pimavanserin',         cat:'PDUFA — sNDA',            co:'Acadia Pharma',           type:'pdufa'},
  {date:'2026-07-07',ticker:'VERA', drug:'Atacicept',            cat:'PDUFA — Priority Review', co:'Vera Therapeutics',       type:'pdufa'},
  {date:'2026-07-10',ticker:'FOLD', drug:'Pegunigalsidase alfa', cat:'PDUFA — BLA',             co:'Amicus Therapeutics',     type:'pdufa'},
  {date:'2026-07-15',ticker:'KRYS', drug:'Beremagene gel',       cat:'PDUFA — BLA (DEB)',       co:'Krystal Biotech',         type:'pdufa'},
  {date:'2026-07-22',ticker:'RARE', drug:'DTX401',               cat:'PDUFA — BLA',             co:'Ultragenyx',              type:'pdufa'},
  {date:'2026-07-28',ticker:'PTGX', drug:'Rusfertide',           cat:'PDUFA — NDA (PV)',        co:'Protagonist Therapeutics',type:'pdufa'},
  {date:'2026-08-04',ticker:'RVMD', drug:'RMC-6236',             cat:'Phase 3 Interim Readout', co:'Revolution Medicines',    type:'phase3'},
  {date:'2026-08-12',ticker:'SRPT', drug:'SRP-9001',             cat:'PDUFA — BLA',             co:'Sarepta Therapeutics',    type:'pdufa'},
  {date:'2026-08-19',ticker:'NUVB', drug:'NUV-868',              cat:'Phase 2 Readout',         co:'Nuvation Bio',            type:'phase2'},
  {date:'2026-08-25',ticker:'IDYA', drug:'Iniparib combo',       cat:'Phase 3 Data',            co:'IDEAYA Biosciences',      type:'phase3'},
  {date:'2026-08-30',ticker:'PESI', drug:'Besremi',              cat:'PDUFA — sNDA (ET)',       co:'PharmaEssentia',          type:'pdufa'},
  {date:'2026-09-03',ticker:'ALNY', drug:'Vutrisiran',           cat:'PDUFA — sNDA',            co:'Alnylam Pharmaceuticals', type:'pdufa'},
  {date:'2026-09-10',ticker:'VRTX', drug:'Suzetrigine',          cat:'PDUFA — NDA (pain)',      co:'Vertex Pharmaceuticals',  type:'pdufa'},
  {date:'2026-09-18',ticker:'RCKT', drug:'RP-L102',              cat:'PDUFA — BLA',             co:'Rocket Pharma',           type:'pdufa'},
  {date:'2026-09-25',ticker:'RYTM', drug:'Setmelanotide',        cat:'PDUFA — sNDA',            co:'Rhythm Pharmaceuticals',  type:'pdufa'},
  {date:'2026-10-02',ticker:'VSTM', drug:'VS-6766',              cat:'Phase 2 Readout',         co:'Verastem Oncology',       type:'phase2'},
  {date:'2026-10-15',ticker:'SPRB', drug:'Tildacerfont',         cat:'Phase 3 Readout (CAH)',   co:'Spruce Biosciences',      type:'phase3'},
  {date:'2026-10-22',ticker:'BPMC', drug:'Pralsetinib',          cat:'PDUFA — sNDA',            co:'Blueprint Medicines',     type:'pdufa'},
  {date:'2026-11-01',ticker:'BMRN', drug:'Vosoritide',           cat:'PDUFA — sNDA',            co:'BioMarin',                type:'pdufa'},
  {date:'2026-11-05',ticker:'SAGE', drug:'SAGE-718',             cat:'Phase 3 Readout',         co:'Sage Therapeutics',       type:'phase3'},
  {date:'2026-11-12',ticker:'ATAI', drug:'PCN-101',              cat:'Phase 2b Readout',        co:'atai Life Sciences',      type:'phase2'},
  {date:'2026-12-01',ticker:'PTCT', drug:'Ataluren',             cat:'PDUFA — NDA',             co:'PTC Therapeutics',        type:'pdufa'},
]

const KNOWN = {
  'bristol-myers':'BMY','pfizer':'PFE','merck':'MRK','astrazeneca':'AZN',
  'roche':'RHHBY','novartis':'NVS','johnson':'JNJ','eli lilly':'LLY',
  'abbvie':'ABBV','amgen':'AMGN','gilead':'GILD','biogen':'BIIB',
  'regeneron':'REGN','moderna':'MRNA','biontech':'BNTX','vertex':'VRTX',
  'alnylam':'ALNY','sarepta':'SRPT','blueprint':'BPMC','protagonist':'PTGX',
  'rhythm':'RYTM','rocket':'RCKT','ultragenyx':'RARE','sage':'SAGE',
  'ionis':'IONS','krystal':'KRYS','biomarin':'BMRN','acadia':'ACAD',
  'syndax':'SNDX','vera therapeutics':'VERA','pharmaessentia':'PESI',
  'nuvation':'NUVB','ideaya':'IDYA','spruce':'SPRB','verastem':'VSTM',
  'revolution medicines':'RVMD','atai':'ATAI','incyte':'INCY',
  'mirati':'MRTX','gsk':'GSK','kura oncology':'KURA','ardelyx':'ARDX',
  'zentalis':'ZNTL','ptc therapeutics':'PTCT','amicus':'FOLD',
  'karuna':'KRTX','rigel':'RIGL','praxis':'PRAX','cerevel':'CERE',
  'turning point':'TPTX','arcus':'RCUS','translate bio':'TBIO',
  'autolus':'AUTL','onconova':'ONTX','neos therapeutics':'NEOS',
  'diffusion':'DFFN','global blood':'GBT','reata':'RETA',
}

function getTicker(sponsor = '') {
  const s = sponsor.toLowerCase()
  for (const [k, v] of Object.entries(KNOWN)) {
    if (s.includes(k)) return v
  }
  return sponsor.replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() || '—'
}

function enrichItem(item) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dt = new Date((item.date || '') + 'T00:00:00')
  const daysOut = Math.round((dt - today) / 86400000)
  return {
    ...item,
    daysOut,
    isWatchlist: WATCHLIST.includes((item.ticker || '').toUpperCase()),
    urgency: daysOut <= 7 ? 'high' : daysOut <= 30 ? 'medium' : 'low',
  }
}

async function fetchClinicalTrials() {
  const allStudies = []
  let pageToken = ''
  let pages = 0

  do {
    const params = new URLSearchParams({
      'filter.overallStatus': 'ACTIVE_NOT_RECRUITING,COMPLETED',
      'postFilter.advanced': 'AREA[Phase](PHASE3 OR PHASE2 OR PHASE2_PHASE3)',
      'sort': 'PrimaryCompletionDate:asc',
      'pageSize': '1000',
      'format': 'json',
      'fields': 'NCTId,BriefTitle,Phase,PrimaryCompletionDate,Condition,LeadSponsorName,InterventionName,OverallStatus',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`https://clinicaltrials.gov/api/v2/studies?${params}`, {
      headers: { 'User-Agent': 'GhostOfStocktwits/1.0 (Biotech Catalyst Calendar)' },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) break

    const data = await res.json()
    const studies = data.studies || []
    allStudies.push(...studies)
    pageToken = data.nextPageToken || ''
    pages++

    if (pages >= 5) break // up to 5000 studies
  } while (pageToken)

  return allStudies.map(s => {
    const p = s.protocolSection || {}
    const id = p.identificationModule || {}
    const st = p.statusModule || {}
    const de = p.designModule || {}
    const sp = p.sponsorCollaboratorsModule || {}
    const co = p.conditionsModule || {}
    const ar = p.armsInterventionsModule || {}
    const phases = de.phases || []
    const drugs = (ar.interventions || []).map(i => i.interventionName).filter(Boolean).slice(0, 2).join(', ')
    const sponsor = sp.leadSponsor?.name || ''
    const phaseStr = phases.map(x => x.replace('PHASE', '')).join('/')
    const phaseType = phases.some(p => p === 'PHASE3' || p === 'PHASE2_PHASE3') ? 'phase3' : 'phase2'

    return {
      date: st.primaryCompletionDateStruct?.date || '',
      ticker: getTicker(sponsor),
      drug: drugs || 'Unknown',
      cat: `Phase ${phaseStr} Readout (Est.)`,
      co: sponsor,
      condition: (co.conditions || []).slice(0, 2).join(', '),
      nctId: id.nctId || '',
      source: 'ClinicalTrials.gov',
      type: phaseType,
    }
  }).filter(x => x.date && x.date.length >= 7)
}

export default async function handler(req, res) {
  // Cache for 2 hours on Vercel edge
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=3600')

  try {
    // Fetch ClinicalTrials server-side (no CORS issues here)
    const ctStudies = await fetchClinicalTrials().catch(err => {
      console.error('ClinicalTrials fetch failed:', err.message)
      return []
    })

    // Merge and deduplicate
    const seen = new Set(STATIC_PDUFA.map(p => `${p.ticker}_${p.date}`))
    const ctFiltered = ctStudies.filter(s => {
      const key = `${s.ticker}_${s.date}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const combined = [
      ...STATIC_PDUFA.map(p => ({ ...p, source: 'Ghost Curated' })),
      ...ctFiltered,
    ]

    // Enrich and filter
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const enriched = combined
      .map(enrichItem)
      .filter(x => !isNaN(x.daysOut) && x.daysOut >= -1 && x.daysOut <= 540)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    res.status(200).json({
      catalysts: enriched,
      meta: {
        total: enriched.length,
        pdufa: enriched.filter(c => c.type === 'pdufa').length,
        trials: enriched.filter(c => c.type !== 'pdufa').length,
        fromCT: ctFiltered.length,
        updated: new Date().toISOString(),
      }
    })
  } catch (err) {
    console.error('Catalyst API error:', err)
    // Fallback to static data only
    const enriched = STATIC_PDUFA
      .map(p => ({ ...p, source: 'Ghost Curated' }))
      .map(enrichItem)
      .filter(x => x.daysOut >= -1)
    res.status(200).json({ catalysts: enriched, meta: { total: enriched.length, updated: new Date().toISOString() } })
  }
}
