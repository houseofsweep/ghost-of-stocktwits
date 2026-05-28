import fs from 'fs'
import path from 'path'

const WATCHLIST = ['NUVB','IDYA','SPRB','VSTM','RVMD','ATAI','OTLK','AMRZ','PTGX','RYTM','RCKT','SAGE','ALNY','VRTX','SRPT','BMRN','FOLD','KRYS','RARE','BPMC','IONS','ACAD','SNDX','VERA','PRTA','NUVL','VRDN','ASND','DNLI','RGNX','TVTX','BEAM','NTLA','CRSP','EDIT','ARWR','RCUS','FULC','PRAX','KYMR','ARVN','KURA','MRTX','REGN','INO']

const STATIC_PDUFA = [
  {date:'2026-06-02',ticker:'IONS', drug:'Eplontersen',              catalyst:'PDUFA — sNDA',                company:'Ionis Pharmaceuticals',     type:'pdufa',source:'Ghost Curated'},
  {date:'2026-06-06',ticker:'DAWN', drug:'Bimekizumab',              catalyst:'PDUFA — sBLA',                company:'UCB',                       type:'pdufa',source:'Ghost Curated'},
  {date:'2026-06-10',ticker:'CAMR', drug:'Oclaiz (CAM2029)',          catalyst:'PDUFA — NDA (acromegaly)',    company:'Camurus',                   type:'pdufa',source:'Ghost Curated'},
  {date:'2026-06-15',ticker:'PRTA', drug:'Prasinezumab',             catalyst:'PDUFA — BLA',                 company:'Prothena',                  type:'pdufa',source:'Ghost Curated'},
  {date:'2026-06-19',ticker:'VERA', drug:'Atacicept',                catalyst:'PDUFA — BLA (IgAN)',          company:'Vera Therapeutics',         type:'pdufa',source:'Ghost Curated'},
  {date:'2026-06-20',ticker:'SNDX', drug:'Revumenib',                catalyst:'PDUFA — NDA (AML)',           company:'Syndax Pharma',             type:'pdufa',source:'Ghost Curated'},
  {date:'2026-06-26',ticker:'ACAD', drug:'Pimavanserin',             catalyst:'PDUFA — sNDA',                company:'Acadia Pharmaceuticals',    type:'pdufa',source:'Ghost Curated'},
  {date:'2026-06-30',ticker:'VRDN', drug:'Veligrotug',               catalyst:'PDUFA — BLA (thyroid eye)',   company:'Viridian Therapeutics',     type:'pdufa',source:'Ghost Curated'},
  {date:'2026-07-07',ticker:'VERA', drug:'Atacicept',                catalyst:'PDUFA — Priority Review',     company:'Vera Therapeutics',         type:'pdufa',source:'Ghost Curated'},
  {date:'2026-07-10',ticker:'FOLD', drug:'Pegunigalsidase alfa',     catalyst:'PDUFA — BLA',                 company:'Amicus Therapeutics',       type:'pdufa',source:'Ghost Curated'},
  {date:'2026-07-15',ticker:'KRYS', drug:'Beremagene gel',           catalyst:'PDUFA — BLA (DEB)',           company:'Krystal Biotech',           type:'pdufa',source:'Ghost Curated'},
  {date:'2026-07-22',ticker:'RARE', drug:'DTX401',                   catalyst:'PDUFA — BLA',                 company:'Ultragenyx',                type:'pdufa',source:'Ghost Curated'},
  {date:'2026-07-28',ticker:'PTGX', drug:'Rusfertide',               catalyst:'PDUFA — NDA (PV)',            company:'Protagonist Therapeutics',  type:'pdufa',source:'Ghost Curated'},
  {date:'2026-08-04',ticker:'RVMD', drug:'RMC-6236',                 catalyst:'Phase 3 Interim Readout',     company:'Revolution Medicines',      type:'phase3',source:'Ghost Curated'},
  {date:'2026-08-12',ticker:'SRPT', drug:'SRP-9001',                 catalyst:'PDUFA — BLA',                 company:'Sarepta Therapeutics',      type:'pdufa',source:'Ghost Curated'},
  {date:'2026-08-19',ticker:'NUVB', drug:'NUV-868',                  catalyst:'Phase 2 Readout',             company:'Nuvation Bio',              type:'phase2',source:'Ghost Curated'},
  {date:'2026-08-25',ticker:'IDYA', drug:'Iniparib combo',           catalyst:'Phase 3 Data',                company:'IDEAYA Biosciences',        type:'phase3',source:'Ghost Curated'},
  {date:'2026-08-30',ticker:'PESI', drug:'Besremi (ropeginterferon)',catalyst:'PDUFA — sBLA (ET)',            company:'PharmaEssentia',            type:'pdufa',source:'Ghost Curated'},
  {date:'2026-09-03',ticker:'ALNY', drug:'Vutrisiran',               catalyst:'PDUFA — sNDA',                company:'Alnylam Pharmaceuticals',   type:'pdufa',source:'Ghost Curated'},
  {date:'2026-09-10',ticker:'VRTX', drug:'Suzetrigine',              catalyst:'PDUFA — NDA (acute pain)',    company:'Vertex Pharmaceuticals',    type:'pdufa',source:'Ghost Curated'},
  {date:'2026-09-18',ticker:'NUVL', drug:'Zidesamtinib',             catalyst:'PDUFA — NDA (ROS1+ NSCLC)',   company:'Nuvalent',                  type:'pdufa',source:'Ghost Curated'},
  {date:'2026-09-18',ticker:'RCKT', drug:'RP-L102',                  catalyst:'PDUFA — BLA',                 company:'Rocket Pharma',             type:'pdufa',source:'Ghost Curated'},
  {date:'2026-09-25',ticker:'RYTM', drug:'Setmelanotide',            catalyst:'PDUFA — sNDA',                company:'Rhythm Pharmaceuticals',    type:'pdufa',source:'Ghost Curated'},
  {date:'2026-10-02',ticker:'VSTM', drug:'VS-6766',                  catalyst:'Phase 2 Readout',             company:'Verastem Oncology',         type:'phase2',source:'Ghost Curated'},
  {date:'2026-10-15',ticker:'SPRB', drug:'Tildacerfont',             catalyst:'Phase 3 Readout (CAH)',        company:'Spruce Biosciences',        type:'phase3',source:'Ghost Curated'},
  {date:'2026-10-22',ticker:'BPMC', drug:'Pralsetinib',              catalyst:'PDUFA — sNDA',                company:'Blueprint Medicines',       type:'pdufa',source:'Ghost Curated'},
  {date:'2026-10-30',ticker:'INO',  drug:'INO-3107',                 catalyst:'PDUFA — BLA (RRP)',            company:'INOVIO Pharmaceuticals',    type:'pdufa',source:'Ghost Curated'},
  {date:'2026-11-01',ticker:'BMRN', drug:'Vosoritide',               catalyst:'PDUFA — sNDA',                company:'BioMarin',                  type:'pdufa',source:'Ghost Curated'},
  {date:'2026-11-05',ticker:'SAGE', drug:'SAGE-718',                 catalyst:'Phase 3 Readout',             company:'Sage Therapeutics',         type:'phase3',source:'Ghost Curated'},
  {date:'2026-11-12',ticker:'ATAI', drug:'PCN-101',                  catalyst:'Phase 2b Readout',            company:'atai Life Sciences',        type:'phase2',source:'Ghost Curated'},
  {date:'2026-12-01',ticker:'PTCT', drug:'Ataluren',                 catalyst:'PDUFA — NDA',                 company:'PTC Therapeutics',          type:'pdufa',source:'Ghost Curated'},
  {date:'2026-06-01',ticker:'MRTX', drug:'Adagrasib',                catalyst:'Phase 2 Readout (NSCLC)',     company:'Mirati Therapeutics',       type:'phase2',source:'Ghost Curated'},
  {date:'2026-06-01',ticker:'REGN', drug:'Dupixent',                 catalyst:'Phase 3 Readout (COPD)',      company:'Regeneron',                 type:'phase3',source:'Ghost Curated'},
  {date:'2026-07-15',ticker:'BEAM', drug:'BEAM-101',                 catalyst:'Phase 1/2 Data (SCD)',        company:'Beam Therapeutics',         type:'phase2',source:'Ghost Curated'},
  {date:'2026-07-20',ticker:'NTLA', drug:'NTLA-2001',                catalyst:'Phase 1 Data (ATTR)',         company:'Intellia Therapeutics',     type:'phase2',source:'Ghost Curated'},
  {date:'2026-07-25',ticker:'CRSP', drug:'CTX001',                   catalyst:'Phase 3 Long-term Data',      company:'CRISPR Therapeutics',       type:'phase3',source:'Ghost Curated'},
  {date:'2026-08-01',ticker:'ARWR', drug:'ARO-APOC3',                catalyst:'Phase 3 Readout (TG)',        company:'Arrowhead Pharma',          type:'phase3',source:'Ghost Curated'},
  {date:'2026-08-10',ticker:'EDIT', drug:'EBT-101',                  catalyst:'Phase 1/2 Data (HIV)',        company:'Editas Medicine',           type:'phase2',source:'Ghost Curated'},
  {date:'2026-08-15',ticker:'RCUS', drug:'Zimberelimab',             catalyst:'Phase 3 Readout (NSCLC)',     company:'Arcus Biosciences',         type:'phase3',source:'Ghost Curated'},
  {date:'2026-09-01',ticker:'KURA', drug:'Ziftomenib',               catalyst:'Phase 2 Readout (AML)',        company:'Kura Oncology',             type:'phase2',source:'Ghost Curated'},
  {date:'2026-09-15',ticker:'ARDX', drug:'Tenapanor',                catalyst:'Phase 3 Readout (IBS-C)',     company:'Ardelyx',                   type:'phase3',source:'Ghost Curated'},
  {date:'2026-09-20',ticker:'PRAX', drug:'Ulixacaltamide',           catalyst:'Phase 3 Readout (ET tremor)', company:'Praxis Precision Medicine', type:'phase3',source:'Ghost Curated'},
  {date:'2026-10-01',ticker:'FULC', drug:'Losmapimod',               catalyst:'Phase 3 Readout (FSHD)',      company:'Fulcrum Therapeutics',      type:'phase3',source:'Ghost Curated'},
  {date:'2026-10-10',ticker:'KYMR', drug:'KT-474',                   catalyst:'Phase 2 Readout (AD/HS)',     company:'Kymera Therapeutics',       type:'phase2',source:'Ghost Curated'},
  {date:'2026-10-20',ticker:'ARVN', drug:'ARV-766',                  catalyst:'Phase 2 Readout (mCRPC)',     company:'Arvinas',                   type:'phase2',source:'Ghost Curated'},
]

function enrichItem(item, today) {
  const daysOut = Math.round((new Date((item.date || '') + 'T00:00:00') - today) / 86400000)
  return {
    ...item,
    daysOut,
    isWatchlist: WATCHLIST.includes((item.ticker || '').toUpperCase()),
    urgency: daysOut <= 7 ? 'high' : daysOut <= 30 ? 'medium' : 'low',
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800')

  const today = new Date(); today.setHours(0, 0, 0, 0)

  // Load ClinicalTrials.gov data from auto-updated file
  let ctStudies = []
  try {
    const trialsPath = path.join(process.cwd(), 'data', 'trials.json')
    if (fs.existsSync(trialsPath)) {
      const raw = fs.readFileSync(trialsPath, 'utf8')
      const parsed = JSON.parse(raw)
      ctStudies = parsed.studies || []
      console.log(`Loaded ${ctStudies.length} studies from trials.json (fetched: ${parsed.fetched})`)
    }
  } catch (err) {
    console.error('Error loading trials.json:', err.message)
  }

  // Deduplicate — static PDUFA takes priority over CT data
  const seen = new Set(STATIC_PDUFA.map(p => `${p.ticker}_${p.date}`))
  const newCT = ctStudies.filter(s => {
    const key = `${s.ticker}_${s.date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const combined = [
    ...STATIC_PDUFA,
    ...newCT,
  ]

  const enriched = combined
    .map(x => enrichItem(x, today))
    .filter(x => !isNaN(x.daysOut) && x.daysOut >= -1 && x.daysOut <= 540)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  res.status(200).json({
    catalysts: enriched,
    meta: {
      total: enriched.length,
      pdufa: enriched.filter(c => c.type === 'pdufa').length,
      phase3: enriched.filter(c => c.type === 'phase3').length,
      phase2: enriched.filter(c => c.type === 'phase2').length,
      fromCT: newCT.length,
      updated: new Date().toISOString(),
    }
  })
}
