import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { getSession } from '../lib/session'

const DEFAULT_WATCHLIST = ['NUVB','IDYA','SPRB','VSTM','RVMD','ATAI','OTLK','AMRZ']
const DISCORD_INVITE = 'https://discord.gg/WnBaWq7GUs'

export async function getServerSideProps({ req, res }) {
  const session = await getSession(req, res)
  return { props: { initialUser: session.user || null } }
}

export default function Home({ initialUser }) {
  const [user, setUser]             = useState(initialUser)
  const [catalysts, setCatalysts]   = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [search, setSearch]         = useState('')
  const [timeFilter, setTimeFilter] = useState('upcoming')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy]         = useState('date')
  const [sortDir, setSortDir]       = useState('asc')
  const [meta, setMeta]             = useState(null)
  const [showPast, setShowPast]     = useState(false)
  const [myStars, setMyStars]       = useState([])
  const [starFilter, setStarFilter] = useState(false)
  const [addingTicker, setAddingTicker] = useState(false)
  const [newTicker, setNewTicker]   = useState('')

  // Load personal stars from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ghost_my_stars')
      if (saved) setMyStars(JSON.parse(saved))
      else setMyStars(DEFAULT_WATCHLIST)
    } catch { setMyStars(DEFAULT_WATCHLIST) }
  }, [])

  // Load catalyst data
  useEffect(() => {
    if (user?.isMember) {
      setDataLoading(true)
      fetch('/api/catalysts')
        .then(r => r.json())
        .then(data => {
          setCatalysts(data.catalysts || [])
          setMeta(data.meta || null)
        })
        .catch(console.error)
        .finally(() => setDataLoading(false))
    }
  }, [user?.isMember])

  // Save stars to localStorage
  const saveStars = (stars) => {
    setMyStars(stars)
    try { localStorage.setItem('ghost_my_stars', JSON.stringify(stars)) } catch {}
  }

  const toggleStar = (ticker) => {
    const t = ticker.toUpperCase()
    const updated = myStars.includes(t)
      ? myStars.filter(s => s !== t)
      : [...myStars, t]
    saveStars(updated)
  }

  const addTicker = () => {
    const t = newTicker.trim().toUpperCase()
    if (t && !myStars.includes(t)) saveStars([...myStars, t])
    setNewTicker('')
    setAddingTicker(false)
  }

  // Enrich catalysts with personal star data
  const enriched = useMemo(() => catalysts.map(c => ({
    ...c,
    isMystar: myStars.includes((c.ticker || '').toUpperCase()),
  })), [catalysts, myStars])

  // Filtered & sorted
  const filtered = useMemo(() => {
    let list = [...enriched]

    // Past vs upcoming toggle
    if (showPast) {
      list = list.filter(c => c.daysOut < 0)
      list.sort((a, b) => new Date(b.date) - new Date(a.date)) // newest past first
      return list
    } else {
      list = list.filter(c => c.daysOut >= 0)
    }

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.ticker?.toLowerCase().includes(q) ||
        c.drug?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.condition?.toLowerCase().includes(q) ||
        c.catalyst?.toLowerCase().includes(q)
      )
    }

    if (timeFilter === 'week')  list = list.filter(c => c.daysOut <= 7)
    if (timeFilter === 'month') list = list.filter(c => c.daysOut <= 30)
    if (timeFilter === '90')    list = list.filter(c => c.daysOut <= 90)
    if (typeFilter !== 'all')   list = list.filter(c => c.type === typeFilter)
    if (starFilter)             list = list.filter(c => c.isMystar)

    list.sort((a, b) => {
      let valA = sortBy === 'date' ? new Date(a.date) : (a[sortBy] || '')
      let valB = sortBy === 'date' ? new Date(b.date) : (b[sortBy] || '')
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [enriched, search, timeFilter, typeFilter, sortBy, sortDir, showPast, starFilter])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  if (!user)          return <LandingPage invite={DISCORD_INVITE} />
  if (!user.isMember) return <NotMemberPage user={user} invite={DISCORD_INVITE} />

  const upcoming  = enriched.filter(c => c.daysOut >= 0)
  const past      = enriched.filter(c => c.daysOut < 0)
  const myStarHits = upcoming.filter(c => c.isMystar)

  return (
    <>
      <Head>
        <title>Ghost of Stocktwits — Biotech Catalyst Calendar</title>
        <meta name="description" content="The most comprehensive biotech catalyst calendar for serious traders." />
      </Head>

      <div style={s.app}>
        {/* Header */}
        <header style={s.header}>
          <div style={s.headerInner}>
            <div style={s.brand}>
              <span style={{fontSize:32}}>👻</span>
              <div>
                <div style={s.brandName}>Ghost of Stocktwits</div>
                <div style={s.brandSub}>Biotech Catalyst Calendar</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              {meta && <div style={s.updateBadge}>Updated {new Date(meta.updated).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>}
              <div style={s.userInfo}>
                <img src={user.avatar} alt={user.username} style={s.avatar} />
                <span style={s.username}>{user.username}</span>
              </div>
              <a href="/api/auth/logout" style={s.logoutBtn}>Logout</a>
            </div>
          </div>
        </header>

        <main style={s.main}>
          {/* Stats */}
          <div style={s.statsRow}>
            {[
              {label:'🔴 This Week',  count: upcoming.filter(c=>c.daysOut<=7).length,  color:'#ef4444'},
              {label:'🟡 This Month', count: upcoming.filter(c=>c.daysOut<=30).length, color:'#eab308'},
              {label:'🟢 90 Days',    count: upcoming.filter(c=>c.daysOut<=90).length, color:'#22c55e'},
              {label:'⭐ My Stars',   count: myStarHits.length,                        color:'#f59e0b'},
              {label:'📋 Total',      count: upcoming.length,                          color:'#6366f1'},
              {label:'📁 Past',       count: past.length,                              color:'#6e7681'},
            ].map(stat => (
              <div
                key={stat.label}
                style={{...s.statCard, cursor: stat.label === '📁 Past' ? 'pointer' : 'default', border: showPast && stat.label === '📁 Past' ? '1px solid #6366f1' : '1px solid #21262d'}}
                onClick={stat.label === '📁 Past' ? () => setShowPast(p => !p) : undefined}
              >
                <div style={{...s.statCount, color: stat.color}}>{stat.count}</div>
                <div style={s.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* My Stars Manager */}
          <div style={s.starsBar}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <span style={{fontSize:13,color:'#8b949e',fontWeight:600}}>⭐ My Stars:</span>
              {myStars.map(t => (
                <span key={t} style={s.starChip}>
                  {t}
                  <button onClick={() => toggleStar(t)} style={s.chipRemove} title="Remove">×</button>
                </span>
              ))}
              {addingTicker ? (
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <input
                    autoFocus
                    value={newTicker}
                    onChange={e => setNewTicker(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') addTicker(); if (e.key === 'Escape') setAddingTicker(false) }}
                    placeholder="TICKER"
                    style={s.tickerInput}
                    maxLength={8}
                  />
                  <button onClick={addTicker} style={s.addBtn}>Add</button>
                  <button onClick={() => setAddingTicker(false)} style={s.cancelBtn}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setAddingTicker(true)} style={s.addStarBtn}>+ Add Ticker</button>
              )}
            </div>
          </div>

          {/* Past Banner */}
          {showPast && (
            <div style={s.pastBanner}>
              📁 Showing past catalysts — <button onClick={() => setShowPast(false)} style={s.backBtn}>← Back to Upcoming</button>
            </div>
          )}

          {/* Filters */}
          {!showPast && (
            <div style={s.filtersRow}>
              <input
                type="text"
                placeholder="🔍  Search ticker, drug, condition..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={s.searchInput}
              />
              <div style={s.filterGroup}>
                {[{v:'upcoming',l:'Upcoming'},{v:'week',l:'This Week'},{v:'month',l:'This Month'},{v:'90',l:'90 Days'}].map(f => (
                  <button key={f.v} onClick={() => setTimeFilter(f.v)} style={timeFilter===f.v ? s.filterBtnActive : s.filterBtn}>{f.l}</button>
                ))}
              </div>
              <div style={s.filterGroup}>
                {[{v:'all',l:'All Types'},{v:'pdufa',l:'PDUFA'},{v:'phase3',l:'Phase 3'},{v:'phase2',l:'Phase 2'},{v:'conference',l:'Conference'}].map(f => (
                  <button key={f.v} onClick={() => setTypeFilter(f.v)} style={typeFilter===f.v ? s.filterBtnActive : s.filterBtn}>{f.l}</button>
                ))}
              </div>
              <button
                onClick={() => setStarFilter(p => !p)}
                style={starFilter ? {...s.filterBtnActive, background:'rgba(245,158,11,0.2)', borderColor:'#f59e0b', color:'#f59e0b'} : s.filterBtn}
              >⭐ My Stars Only</button>
            </div>
          )}

          <div style={s.resultsLine}>
            {dataLoading ? '⏳ Loading 500+ catalysts...' : `Showing ${filtered.length} ${showPast ? 'past' : 'upcoming'} catalysts`}
          </div>

          {/* Table */}
          {dataLoading ? (
            <div style={s.loadingBox}>
              <div style={s.spinner} />
              <div style={{color:'#8b949e',marginTop:16}}>Loading catalyst data...</div>
            </div>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}></th>
                    {[['date','Date'],['daysOut','Days'],['ticker','Ticker'],['drug','Drug / Asset'],['catalyst','Catalyst'],['type','Type'],['condition','Condition'],['source','Source']].map(([col, label]) => (
                      <th key={col} onClick={() => toggleSort(col)} style={{...s.th, cursor:'pointer'}}>{label}{sortBy===col?(sortDir==='asc'?' ↑':' ↓'):''}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} style={{textAlign:'center',padding:'48px',color:'#8b949e'}}>No catalysts found.</td></tr>
                  ) : filtered.map((c, i) => (
                    <CatalystRow key={`${c.ticker}_${c.date}_${i}`} c={c} onToggleStar={toggleStar} isStarred={c.isMystar} isPast={showPast} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={s.footer}>
            Data: CatalystAlert.io • Ghost Curated PDUFA Dates • ClinicalTrials.gov<br/>
            <span style={{color:'#6e7681'}}>⭐ = Your personal starred tickers &nbsp;|&nbsp; Click ⭐ on any row to star/unstar &nbsp;|&nbsp; Click 📁 Past to see previous catalysts</span>
          </div>
        </main>
      </div>
    </>
  )
}

// ─── Catalyst Row ─────────────────────────────────────────────────────────────
function CatalystRow({ c, onToggleStar, isStarred, isPast }) {
  const urgColor = isPast ? '#6e7681' : c.urgency==='high' ? '#ef4444' : c.urgency==='medium' ? '#eab308' : '#22c55e'
  const daysLabel = isPast
    ? `${Math.abs(c.daysOut)}d ago`
    : c.daysOut===0 ? 'TODAY' : c.daysOut===1 ? '1d' : `${c.daysOut}d`
  const dateStr = new Date(c.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
  const typeBg = c.type==='pdufa' ? 'rgba(99,102,241,0.2)' : c.type==='phase3' ? 'rgba(239,68,68,0.15)' : c.type==='conference' ? 'rgba(96,165,250,0.15)' : 'rgba(34,197,94,0.15)'
  const typeColor = c.type==='pdufa' ? '#818cf8' : c.type==='phase3' ? '#f87171' : c.type==='conference' ? '#60a5fa' : '#4ade80'
  const tickerColor = isStarred ? '#f59e0b' : '#58a6ff'
  const nctLink = c.nctId ? `https://clinicaltrials.gov/study/${c.nctId}` : null
  const rowBg = isStarred ? 'rgba(245,158,11,0.06)' : 'transparent'

  return (
    <tr style={{borderBottom:'1px solid #21262d', background:rowBg, borderLeft: isStarred ? '3px solid #f59e0b' : '3px solid transparent'}}>
      <td style={{...s.td, padding:'8px 10px'}}>
        <button
          onClick={() => onToggleStar(c.ticker)}
          style={{background:'none',border:'none',cursor:'pointer',fontSize:14,opacity: isStarred ? 1 : 0.3, transition:'opacity 0.2s'}}
          title={isStarred ? 'Remove from My Stars' : 'Add to My Stars'}
        >⭐</button>
      </td>
      <td style={{...s.td, fontWeight:500, whiteSpace:'nowrap', color: isPast ? '#6e7681' : '#f0f6fc'}}>{dateStr}</td>
      <td style={{...s.td, color:urgColor, fontWeight:700, whiteSpace:'nowrap'}}>{daysLabel}</td>
      <td style={{...s.td, fontWeight:700}}>
        {nctLink
          ? <a href={nctLink} target="_blank" rel="noreferrer" style={{color:tickerColor, textDecoration:'none'}}>{c.ticker}</a>
          : <span style={{color:tickerColor}}>{c.ticker}</span>
        }
      </td>
      <td style={{...s.td, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={c.drug}>{c.drug || '—'}</td>
      <td style={{...s.td, color:'#8b949e', fontSize:13, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={c.catalyst}>{c.catalyst || '—'}</td>
      <td style={s.td}>
        <span style={{...s.typeBadge, background:typeBg, color:typeColor}}>{c.type==='pdufa'?'PDUFA':c.type==='phase3'?'Phase 3':c.type==='conference'?'Conference':'Phase 2'}</span>
      </td>
      <td style={{...s.td, color:'#6e7681', fontSize:12, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={c.condition}>{c.condition || '—'}</td>
      <td style={{...s.td, color:'#6e7681', fontSize:11, whiteSpace:'nowrap'}}>{c.source || '—'}</td>
    </tr>
  )
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
function LandingPage({ invite }) {
  return (
    <>
      <Head><title>Ghost of Stocktwits — Biotech Catalyst Calendar</title></Head>
      <div style={s.landing}>
        <div style={s.hero}>
          <span style={{fontSize:72}}>👻</span>
          <h1 style={s.heroTitle}>Ghost of Stocktwits</h1>
          <p style={s.heroSub}>The most comprehensive biotech catalyst calendar for serious traders.</p>
          <p style={s.heroDesc}>500+ PDUFA dates · Phase 3 readouts · FDA decisions · ADCOM meetings<br/>All in one place. Personal starred tickers. Past & upcoming. Members only.</p>
          <a href="/api/auth/login" style={s.loginBtn}>
            <svg width="20" height="20" viewBox="0 0 71 55" fill="#fff" style={{marginRight:10}}>
              <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.7a40.8 40.8 0 0 0-1.8 3.7 54 54 0 0 0-16.3 0A39.5 39.5 0 0 0 25.6.7 58.4 58.4 0 0 0 11 4.9C1.6 19.2-.9 33 .3 46.6a59.1 59.1 0 0 0 18 9.1 44.5 44.5 0 0 0 3.8-6.2 38.3 38.3 0 0 1-6-2.9l1.5-1.1a42.1 42.1 0 0 0 36.1 0l1.5 1.1a38.3 38.3 0 0 1-6 2.9 44.1 44.1 0 0 0 3.8 6.2 58.9 58.9 0 0 0 18-9 54 54 0 0 0-9.9-41.7zM23.7 38.2c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2s-2.9 7.2-6.4 7.2zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2s-2.9 7.2-6.4 7.2z"/>
            </svg>
            Login with Discord
          </a>
          <p style={{marginTop:16,fontSize:13,color:'#6e7681'}}>Members only. Not a member? <a href={invite} target="_blank" rel="noreferrer" style={{color:'#58a6ff'}}>Join here →</a></p>
        </div>
        <div style={s.featuresRow}>
          {[
            {icon:'📅',title:'500+ Catalysts',desc:'PDUFA dates, Phase 2/3 readouts, conferences — the most complete calendar available.'},
            {icon:'⭐',title:'Personal Stars',desc:'Star your own tickers. Your watchlist saves automatically and filters the calendar.'},
            {icon:'📁',title:'Past Catalysts',desc:'Never miss context. Browse all historical catalysts with one click.'},
            {icon:'🔒',title:'Members Only',desc:'Exclusive to Ghost of Stocktwits Discord members. Login with Discord instantly.'},
          ].map(f => (
            <div key={f.title} style={s.featureCard}>
              <div style={{fontSize:32,marginBottom:12}}>{f.icon}</div>
              <div style={{fontWeight:700,marginBottom:6,fontSize:16}}>{f.title}</div>
              <div style={{color:'#8b949e',fontSize:14,lineHeight:1.5}}>{f.desc}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:13,color:'#6e7681'}}>© 2026 Ghost of Stocktwits · <a href={invite} style={{color:'#58a6ff'}}>Join Discord</a></div>
      </div>
    </>
  )
}

// ─── Not Member Page ──────────────────────────────────────────────────────────
function NotMemberPage({ user, invite }) {
  return (
    <>
      <Head><title>Ghost of Stocktwits — Join to Access</title></Head>
      <div style={{...s.landing,justifyContent:'center',alignItems:'center',minHeight:'100vh'}}>
        <div style={{textAlign:'center',maxWidth:480,padding:40}}>
          <div style={{fontSize:64,marginBottom:16}}>👻</div>
          <h2 style={{fontSize:28,fontWeight:800,marginBottom:12}}>You're not in the server yet</h2>
          <p style={{color:'#8b949e',marginBottom:32}}>Hey <strong style={{color:'#f0f6fc'}}>{user.username}</strong> — join Ghost of Stocktwits to unlock the full catalyst calendar.</p>
          <a href={invite} target="_blank" rel="noreferrer" style={s.loginBtn}>Join Ghost of Stocktwits →</a>
          <div style={{marginTop:20}}><a href="/api/auth/logout" style={{color:'#6e7681',fontSize:13}}>← Use a different account</a></div>
        </div>
      </div>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  app: {minHeight:'100vh',background:'#0d1117'},
  header: {background:'#161b22',borderBottom:'1px solid #21262d',position:'sticky',top:0,zIndex:100},
  headerInner: {maxWidth:1500,margin:'0 auto',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10},
  brand: {display:'flex',alignItems:'center',gap:12},
  brandName: {fontWeight:800,fontSize:18,color:'#f0f6fc',fontFamily:'sans-serif'},
  brandSub: {fontSize:12,color:'#8b949e'},
  updateBadge: {fontSize:12,color:'#4ade80',background:'rgba(34,197,94,0.1)',padding:'4px 10px',borderRadius:20,border:'1px solid rgba(34,197,94,0.2)'},
  userInfo: {display:'flex',alignItems:'center',gap:8},
  avatar: {width:32,height:32,borderRadius:'50%',border:'2px solid #30363d'},
  username: {fontSize:14,fontWeight:600,color:'#f0f6fc'},
  logoutBtn: {fontSize:13,color:'#8b949e',background:'transparent',border:'1px solid #30363d',padding:'5px 14px',borderRadius:6,cursor:'pointer',textDecoration:'none'},
  main: {maxWidth:1500,margin:'0 auto',padding:'24px'},
  statsRow: {display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'},
  statCard: {background:'#161b22',borderRadius:10,padding:'14px 20px',flex:'1 1 100px',textAlign:'center',transition:'border-color 0.2s'},
  statCount: {fontSize:26,fontWeight:800,lineHeight:1},
  statLabel: {fontSize:11,color:'#8b949e',marginTop:4},
  starsBar: {background:'#161b22',border:'1px solid #21262d',borderRadius:10,padding:'10px 16px',marginBottom:12},
  starChip: {display:'inline-flex',alignItems:'center',gap:4,background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)',color:'#f59e0b',borderRadius:20,padding:'3px 10px',fontSize:12,fontWeight:700},
  chipRemove: {background:'none',border:'none',color:'#f59e0b',cursor:'pointer',fontSize:14,padding:'0 2px',lineHeight:1},
  tickerInput: {background:'#0d1117',border:'1px solid #6366f1',borderRadius:6,padding:'6px 10px',color:'#f0f6fc',fontSize:13,width:80,outline:'none'},
  addBtn: {background:'rgba(99,102,241,0.2)',border:'1px solid #6366f1',color:'#818cf8',borderRadius:6,padding:'6px 12px',fontSize:12,cursor:'pointer',fontWeight:600},
  cancelBtn: {background:'transparent',border:'1px solid #30363d',color:'#6e7681',borderRadius:6,padding:'6px 12px',fontSize:12,cursor:'pointer'},
  addStarBtn: {background:'rgba(245,158,11,0.1)',border:'1px dashed rgba(245,158,11,0.4)',color:'#f59e0b',borderRadius:20,padding:'3px 12px',fontSize:12,cursor:'pointer',fontWeight:600},
  pastBanner: {background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,padding:'10px 16px',marginBottom:12,color:'#818cf8',fontSize:14},
  backBtn: {background:'none',border:'none',color:'#818cf8',cursor:'pointer',fontSize:14,textDecoration:'underline'},
  filtersRow: {display:'flex',gap:10,marginBottom:10,flexWrap:'wrap',alignItems:'center'},
  searchInput: {background:'#161b22',border:'1px solid #21262d',borderRadius:8,padding:'9px 14px',color:'#f0f6fc',fontSize:14,width:260},
  filterGroup: {display:'flex',gap:6,flexWrap:'wrap'},
  filterBtn: {background:'#161b22',border:'1px solid #21262d',borderRadius:6,padding:'7px 14px',color:'#8b949e',fontSize:13,cursor:'pointer'},
  filterBtnActive: {background:'rgba(99,102,241,0.2)',border:'1px solid #6366f1',borderRadius:6,padding:'7px 14px',color:'#818cf8',fontSize:13,cursor:'pointer',fontWeight:600},
  resultsLine: {fontSize:13,color:'#6e7681',marginBottom:10},
  tableWrap: {overflowX:'auto',background:'#161b22',borderRadius:12,border:'1px solid #21262d'},
  table: {width:'100%',borderCollapse:'collapse',fontSize:14},
  th: {padding:'12px 16px',textAlign:'left',fontSize:11,fontWeight:600,color:'#8b949e',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid #21262d',whiteSpace:'nowrap',background:'#0d1117',userSelect:'none'},
  td: {padding:'10px 16px',verticalAlign:'middle'},
  typeBadge: {display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:600},
  loadingBox: {display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px',background:'#161b22',borderRadius:12,border:'1px solid #21262d'},
  spinner: {width:40,height:40,border:'3px solid #21262d',borderTop:'3px solid #6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'},
  footer: {marginTop:24,padding:'16px 0',borderTop:'1px solid #21262d',fontSize:12,color:'#8b949e',textAlign:'center',lineHeight:1.8},
  landing: {minHeight:'100vh',background:'#0d1117',display:'flex',flexDirection:'column',alignItems:'center',padding:'0 24px 60px'},
  hero: {textAlign:'center',padding:'80px 0 48px',maxWidth:640},
  heroTitle: {fontSize:48,fontWeight:900,background:'linear-gradient(135deg, #f0f6fc, #818cf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:16},
  heroSub: {fontSize:20,fontWeight:600,color:'#f0f6fc',marginBottom:12},
  heroDesc: {fontSize:15,color:'#8b949e',lineHeight:1.7,marginBottom:32},
  loginBtn: {display:'inline-flex',alignItems:'center',background:'#5865f2',color:'#fff',border:'none',borderRadius:8,padding:'14px 32px',fontSize:16,fontWeight:700,cursor:'pointer',textDecoration:'none'},
  featuresRow: {display:'flex',gap:16,flexWrap:'wrap',maxWidth:1000,width:'100%',marginBottom:48,justifyContent:'center'},
  featureCard: {background:'#161b22',border:'1px solid #21262d',borderRadius:12,padding:'24px',flex:'1 1 200px',maxWidth:240},
}
