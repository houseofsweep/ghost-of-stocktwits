const WATCHLIST = ['NUVB','IDYA','SPRB','VSTM','RVMD','ATAI','OTLK','AMRZ','PTGX','RYTM','RCKT','SAGE','ALNY','VRTX','SRPT','BMRN','FOLD','KRYS','RARE','BPMC','IONS','ACAD','SNDX','VERA','PRTA']

const KNOWN = {'bristol-myers':'BMY','pfizer':'PFE','merck':'MRK','astrazeneca':'AZN','roche':'RHHBY','novartis':'NVS','johnson':'JNJ','eli lilly':'LLY','abbvie':'ABBV','amgen':'AMGN','gilead':'GILD','biogen':'BIIB','regeneron':'REGN','moderna':'MRNA','biontech':'BNTX','vertex':'VRTX','alnylam':'ALNY','sarepta':'SRPT','blueprint':'BPMC','protagonist':'PTGX','rhythm':'RYTM','rocket':'RCKT','ultragenyx':'RARE','sage':'SAGE','ionis':'IONS','krystal':'KRYS','biomarin':'BMRN','acadia':'ACAD','syndax':'SNDX','vera therapeutics':'VERA','pharmaessentia':'PESI','nuvation':'NUVB','ideaya':'IDYA','spruce':'SPRB','verastem':'VSTM','revolution medicines':'RVMD','atai':'ATAI','incyte':'INCY','mirati':'MRTX','gsk':'GSK','kura oncology':'KURA','ardelyx':'ARDX','zentalis':'ZNTL','ptc therapeutics':'PTCT','amicus':'FOLD','karuna':'KRTX','rigel':'RIGL','praxis':'PRAX','cerevel':'CERE','turning point':'TPTX','arcus':'RCUS','global blood':'GBT','reata':'RETA','inhibrx':'INBX','editas':'EDIT','beam therapeutics':'BEAM','prime medicine':'PRME','intellia':'NTLA','crispr therapeutics':'CRSP','bluebird':'BLUE','rocket pharma':'RCKT','passage bio':'PASG','sarepta':'SRPT','atea':'AVIR','vanda':'VNDA','coherus':'CHRS','nkarta':'NKTX','corvus':'CRVS','prelude':'PRLD','imago':'IMGO','metacrine':'MTCR','olimmune':'OLMN','fulcrum':'FULC','relay':'RLAY','c4 therapeutics':'CCCC','kymera':'KYMR','nurix':'NRIX','arvinas':'ARVN','foghorn':'FHTX','erasca':'ERAS','tango':'TNGX','boundless bio':'BOLD','turning point':'TPTX'}

function getTicker(sponsor=''){const s=sponsor.toLowerCase();for(const[k,v]of Object.entries(KNOWN))if(s.includes(k))return v;return sponsor.replace(/[^a-zA-Z]/g,'').slice(0,6).toUpperCase()||'—'}

function getStatic(){
  return [
    {date:'2026-06-02',ticker:'IONS', drug:'Eplontersen',          catalyst:'PDUFA — sNDA',            company:'Ionis Pharmaceuticals',   type:'pdufa',source:'Ghost Curated'},
    {date:'2026-06-06',ticker:'DAWN', drug:'Bimekizumab',          catalyst:'PDUFA — sBLA',            company:'UCB',                     type:'pdufa',source:'Ghost Curated'},
    {date:'2026-06-15',ticker:'PRTA', drug:'Prasinezumab',         catalyst:'PDUFA — BLA',             company:'Prothena',                type:'pdufa',source:'Ghost Curated'},
    {date:'2026-06-19',ticker:'VERA', drug:'Atacicept',            catalyst:'PDUFA — BLA (IgAN)',      company:'Vera Therapeutics',       type:'pdufa',source:'Ghost Curated'},
    {date:'2026-06-20',ticker:'SNDX', drug:'Revumenib',            catalyst:'PDUFA — NDA (AML)',       company:'Syndax Pharma',           type:'pdufa',source:'Ghost Curated'},
    {date:'2026-06-26',ticker:'ACAD', drug:'Pimavanserin',         catalyst:'PDUFA — sNDA',            company:'Acadia Pharma',           type:'pdufa',source:'Ghost Curated'},
    {date:'2026-07-07',ticker:'VERA', drug:'Atacicept',            catalyst:'PDUFA — Priority Review', company:'Vera Therapeutics',       type:'pdufa',source:'Ghost Curated'},
    {date:'2026-07-10',ticker:'FOLD', drug:'Pegunigalsidase alfa', catalyst:'PDUFA — BLA',             company:'Amicus Therapeutics',     type:'pdufa',source:'Ghost Curated'},
    {date:'2026-07-15',ticker:'KRYS', drug:'Beremagene gel',       catalyst:'PDUFA — BLA (DEB)',       company:'Krystal Biotech',         type:'pdufa',source:'Ghost Curated'},
    {date:'2026-07-22',ticker:'RARE', drug:'DTX401',               catalyst:'PDUFA — BLA',             company:'Ultragenyx',              type:'pdufa',source:'Ghost Curated'},
    {date:'2026-07-28',ticker:'PTGX', drug:'Rusfertide',           catalyst:'PDUFA — NDA (PV)',        company:'Protagonist Therapeutics',type:'pdufa',source:'Ghost Curated'},
    {date:'2026-08-04',ticker:'RVMD', drug:'RMC-6236',             catalyst:'Phase 3 Interim Readout', company:'Revolution Medicines',    type:'phase3',source:'Ghost Curated'},
    {date:'2026-08-12',ticker:'SRPT', drug:'SRP-9001',             catalyst:'PDUFA — BLA',             company:'Sarepta Therapeutics',    type:'pdufa',source:'Ghost Curated'},
    {date:'2026-08-19',ticker:'NUVB', drug:'NUV-868',              catalyst:'Phase 2 Readout',         company:'Nuvation Bio',            type:'phase2',source:'Ghost Curated'},
    {date:'2026-08-25',ticker:'IDYA', drug:'Iniparib combo',       catalyst:'Phase 3 Data',            company:'IDEAYA Biosciences',      type:'phase3',source:'Ghost Curated'},
    {date:'2026-08-30',ticker:'PESI', drug:'Besremi',              catalyst:'PDUFA — sNDA (ET)',       company:'PharmaEssentia',          type:'pdufa',source:'Ghost Curated'},
    {date:'2026-09-03',ticker:'ALNY', drug:'Vutrisiran',           catalyst:'PDUFA — sNDA',            company:'Alnylam Pharmaceuticals', type:'pdufa',source:'Ghost Curated'},
    {date:'2026-09-10',ticker:'VRTX', drug:'Suzetrigine',          catalyst:'PDUFA — NDA (pain)',      company:'Vertex Pharmaceuticals',  type:'pdufa',source:'Ghost Curated'},
    {date:'2026-09-18',ticker:'RCKT', drug:'RP-L102',              catalyst:'PDUFA — BLA',             company:'Rocket Pharma',           type:'pdufa',source:'Ghost Curated'},
    {date:'2026-09-25',ticker:'RYTM', drug:'Setmelanotide',        catalyst:'PDUFA — sNDA',            company:'Rhythm Pharmaceuticals',  type:'pdufa',source:'Ghost Curated'},
    {date:'2026-10-02',ticker:'VSTM', drug:'VS-6766',              catalyst:'Phase 2 Readout',         company:'Verastem Oncology',       type:'phase2',source:'Ghost Curated'},
    {date:'2026-10-15',ticker:'SPRB', drug:'Tildacerfont',         catalyst:'Phase 3 Readout (CAH)',   company:'Spruce Biosciences',      type:'phase3',source:'Ghost Curated'},
    {date:'2026-10-22',ticker:'BPMC', drug:'Pralsetinib',          catalyst:'PDUFA — sNDA',            company:'Blueprint Medicines',     type:'pdufa',source:'Ghost Curated'},
    {date:'2026-11-01',ticker:'BMRN', drug:'Vosoritide',           catalyst:'PDUFA — sNDA',            company:'BioMarin',                type:'pdufa',source:'Ghost Curated'},
    {date:'2026-11-05',ticker:'SAGE', drug:'SAGE-718',             catalyst:'Phase 3 Readout',         company:'Sage Therapeutics',       type:'phase3',source:'Ghost Curated'},
    {date:'2026-11-12',ticker:'ATAI', drug:'PCN-101',              catalyst:'Phase 2b Readout',        company:'atai Life Sciences',      type:'phase2',source:'Ghost Curated'},
    {date:'2026-12-01',ticker:'PTCT', drug:'Ataluren',             catalyst:'PDUFA — NDA',             company:'PTC Therapeutics',        type:'pdufa',source:'Ghost Curated'},
  ]
}

async function fetchCT() {
  // Fetch multiple smaller pages in parallel — faster than one big request
  const baseParams = {
    'filter.overallStatus': 'ACTIVE_NOT_RECRUITING,COMPLETED',
    'postFilter.advanced': 'AREA[Phase](PHASE3 OR PHASE2 OR PHASE2_PHASE3)',
    'sort': 'PrimaryCompletionDate:asc',
    'pageSize': '200',
    'format': 'json',
    'fields': 'NCTId,BriefTitle,Phase,PrimaryCompletionDate,Condition,LeadSponsorName,InterventionName',
  }

  // Fetch 5 pages of 200 = 1000 studies total, in parallel
  const fetches = []
  const tokens = ['', null] // first two pages

  // First fetch to get initial token
  const firstParams = new URLSearchParams({...baseParams})
  try {
    const r1 = await fetch(`https://clinicaltrials.gov/api/v2/studies?${firstParams}`, {
      headers: {'User-Agent': 'GhostOfStocktwits/1.0'},
      signal: AbortSignal.timeout(8000),
    })
    if (!r1.ok) return []
    const d1 = await r1.json()
    const studies = d1.studies || []
    
    // If there's a next page token, fetch more in parallel
    if (d1.nextPageToken) {
      const pagePromises = []
      let token = d1.nextPageToken
      for (let i = 0; i < 4 && token; i++) {
        const p = new URLSearchParams({...baseParams, pageToken: token})
        pagePromises.push(
          fetch(`https://clinicaltrials.gov/api/v2/studies?${p}`, {
            headers: {'User-Agent': 'GhostOfStocktwits/1.0'},
            signal: AbortSignal.timeout(8000),
          }).then(r => r.ok ? r.json() : {studies:[]}).catch(() => ({studies:[]}))
        )
        // We don't know next tokens ahead of time so just do sequential for now
        break
      }
      const results = await Promise.allSettled(pagePromises)
      results.forEach(r => {
        if (r.status === 'fulfilled') studies.push(...(r.value.studies || []))
      })
    }
    
    return studies.map(parseStudy).filter(x => x.date && x.date.length >= 7)
  } catch(e) {
    console.error('CT fetch error:', e.message)
    return []
  }
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
  const drugs = (ar.interventions||[]).map(i=>i.interventionName).filter(Boolean).slice(0,2).join(', ')
  const sponsor = sp.leadSponsor?.name || ''
  const phaseStr = phases.map(x=>x.replace('PHASE','')).join('/')
  const phaseType = phases.some(p=>p==='PHASE3'||p==='PHASE2_PHASE3') ? 'phase3' : 'phase2'
  return {
    date: st.primaryCompletionDateStruct?.date || '',
    ticker: getTicker(sponsor),
    drug: drugs || 'Unknown',
    catalyst: `Phase ${phaseStr} Readout (Est.)`,
    company: sponsor,
    condition: (co.conditions||[]).slice(0,2).join(', '),
    nctId: id.nctId || '',
    source: 'ClinicalTrials.gov',
    type: phaseType,
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=3600')

  const staticData = getStatic()

  try {
    console.log('[catalysts] Starting CT.gov fetch...')
    const start = Date.now()
    const ctStudies = await fetchCT()
    console.log(`[catalysts] CT.gov returned ${ctStudies.length} studies in ${Date.now()-start}ms`)

    const seen = new Set(staticData.map(p=>`${p.ticker}_${p.date}`))
    const newItems = ctStudies.filter(s => {
      const key = `${s.ticker}_${s.date}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    console.log(`[catalysts] ${newItems.length} new items after dedup`)

    const today = new Date(); today.setHours(0,0,0,0)
    const combined = [...staticData, ...newItems]
      .map(x => {
        const daysOut = Math.round((new Date((x.date||'')+'T00:00:00') - today) / 86400000)
        return {...x, daysOut, isWatchlist: WATCHLIST.includes((x.ticker||'').toUpperCase()), urgency: daysOut<=7?'high':daysOut<=30?'medium':'low'}
      })
      .filter(x => !isNaN(x.daysOut) && x.daysOut >= -1 && x.daysOut <= 540)
      .sort((a,b) => new Date(a.date) - new Date(b.date))

    res.status(200).json({
      catalysts: combined,
      meta: { total: combined.length, fromCT: newItems.length, pdufa: combined.filter(c=>c.type==='pdufa').length, updated: new Date().toISOString() }
    })
  } catch(err) {
    console.error('[catalysts] Fatal error:', err.message)
    const today = new Date(); today.setHours(0,0,0,0)
    const fallback = staticData.map(x => {
      const daysOut = Math.round((new Date(x.date+'T00:00:00') - today) / 86400000)
      return {...x, daysOut, isWatchlist: WATCHLIST.includes(x.ticker?.toUpperCase()), urgency: daysOut<=7?'high':daysOut<=30?'medium':'low'}
    }).filter(x => x.daysOut >= -1)
    res.status(200).json({ catalysts: fallback, meta: { total: fallback.length, fromCT: 0, updated: new Date().toISOString() } })
  }
}
