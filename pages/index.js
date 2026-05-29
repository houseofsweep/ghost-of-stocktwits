import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Head from 'next/head'
import { getSession } from '../lib/session'

const DEFAULT_WATCHLIST = ['NUVB','IDYA','SPRB','VSTM','RVMD','ATAI','OTLK','AMRZ']
const DISCORD_INVITE = 'https://discord.gg/HkY9F7eNJz'

const EVENT_TYPES = {
  pdufa:        { label: 'PDUFA',          color: '#ef4444', bg: 'rgba(239,68,68,0.18)',    icon: '💊' },
  adcom:        { label: 'AdCom',          color: '#f59e0b', bg: 'rgba(245,158,11,0.18)',   icon: '🏛️' },
  nda_filing:   { label: 'NDA Filing',     color: '#60a5fa', bg: 'rgba(96,165,250,0.18)',   icon: '📋' },
  bla_filing:   { label: 'BLA Filing',     color: '#818cf8', bg: 'rgba(129,140,248,0.18)',  icon: '📋' },
  intl_reg:     { label: "Int'l Regulatory",color:'#a78bfa', bg: 'rgba(167,139,250,0.18)', icon: '🌍' },
  phase3:       { label: 'Phase 3',        color: '#f87171', bg: 'rgba(239,68,68,0.13)',    icon: '🔬' },
  phase23:      { label: 'Phase 2/3',      color: '#fb923c', bg: 'rgba(251,146,60,0.15)',   icon: '🔬' },
  phase2:       { label: 'Phase 2',        color: '#4ade80', bg: 'rgba(34,197,94,0.13)',    icon: '🔬' },
  phase12:      { label: 'Phase 1/2',      color: '#86efac', bg: 'rgba(134,239,172,0.13)',  icon: '🔬' },
  phase1:       { label: 'Phase 1',        color: '#a3e635', bg: 'rgba(163,230,53,0.13)',   icon: '🔬' },
  preclinical:  { label: 'Preclinical',    color: '#6ee7b7', bg: 'rgba(110,231,183,0.13)',  icon: '🧫' },
  ind:          { label: 'IND',            color: '#5eead4', bg: 'rgba(94,234,212,0.13)',   icon: '📄' },
  readout:      { label: 'Data Readout',   color: '#34d399', bg: 'rgba(52,211,153,0.13)',   icon: '📊' },
  trial_start:  { label: 'Trial Start',    color: '#38bdf8', bg: 'rgba(56,189,248,0.13)',   icon: '🚀' },
  conference:   { label: 'Conference',     color: '#7dd3fc', bg: 'rgba(125,211,252,0.13)',  icon: '🎤' },
  presentation: { label: 'Presentation',   color: '#a78bfa', bg: 'rgba(167,139,250,0.13)', icon: '📎' },
  earnings:     { label: 'Earnings',       color: '#fbbf24', bg: 'rgba(251,191,36,0.13)',   icon: '💰' },
  publication:  { label: 'Publication',    color: '#f0abfc', bg: 'rgba(240,171,252,0.13)',  icon: '📰' },
  patent:       { label: 'Patent Expiry',  color: '#fca5a5', bg: 'rgba(252,165,165,0.13)', icon: '⏱️' },
  partnership:  { label: 'Partnership',    color: '#6ee7b7', bg: 'rgba(110,231,183,0.13)', icon: '🤝' },
  ipo:          { label: 'IPO/Offering',   color: '#fde68a', bg: 'rgba(253,230,138,0.13)', icon: '📈' },
  approved:     { label: 'Approved',       color: '#4ade80', bg: 'rgba(74,222,128,0.18)',   icon: '✅' },
  nda:          { label: 'NDA',            color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',   icon: '📋' },
  bla:          { label: 'BLA',            color: '#818cf8', bg: 'rgba(129,140,248,0.15)',  icon: '📋' },
}

function inferType(item) {
  const cat = (item.catalyst || item.cat || '').toLowerCase()
  const type = (item.type || '').toLowerCase()
  if (type === 'pdufa' || cat.includes('pdufa')) return 'pdufa'
  if (cat.includes('adcom') || cat.includes('advisory committee')) return 'adcom'
  if (cat.includes('nda filing') || cat.includes('nda submission')) return 'nda_filing'
  if (cat.includes('bla filing') || cat.includes('bla submission')) return 'bla_filing'
  if (cat.includes("int'l") || cat.includes('international regulatory') || cat.includes('ema ') || cat.includes('chmp')) return 'intl_reg'
  if (cat.includes('phase 3') || cat.includes('phase iii') || type === 'phase3') return 'phase3'
  if (cat.includes('phase 2/3') || cat.includes('phase ii/iii') || type === 'phase23') return 'phase23'
  if (cat.includes('phase 1/2') || cat.includes('phase i/ii') || type === 'phase12') return 'phase12'
  if (cat.includes('phase 2') || cat.includes('phase ii') || type === 'phase2') return 'phase2'
  if (cat.includes('phase 1') || cat.includes('phase i ') || type === 'phase1') return 'phase1'
  if (cat.includes('preclinical') || type === 'preclinical') return 'preclinical'
  if (cat.includes(' ind ') || cat.includes('ind filing') || type === 'ind') return 'ind'
  if (cat.includes('trial start') || cat.includes('trial initiat') || type === 'trial_start') return 'trial_start'
  if (cat.includes('conference') || cat.includes('asco') || cat.includes('esmo') || cat.includes('aha') || cat.includes('aacr') || cat.includes('ash ') || cat.includes('eha')) return 'conference'
  if (cat.includes('earnings')) return 'earnings'
  if (cat.includes('publication') || cat.includes('published')) return 'publication'
  if (cat.includes('patent expir') || type === 'patent') return 'patent'
  if (cat.includes('partnership') || cat.includes('collaboration') || type === 'partnership') return 'partnership'
  if (cat.includes('ipo') || cat.includes('offering') || type === 'ipo') return 'ipo'
  if (cat.includes('approved') || cat.includes('approval') || type === 'approved') return 'approved'
  if (cat.includes('nda') && !cat.includes('filing')) return 'nda'
  if (cat.includes('bla') && !cat.includes('filing')) return 'bla'
  if (cat.includes('presentation') || cat.includes('conference presentation')) return 'presentation'
  if (cat.includes('readout') || cat.includes('data') || cat.includes('results') || cat.includes('topline')) return 'readout'
  return type || 'readout'
}

function fmtMarketCap(raw) {
  if (!raw) return null
  if (raw >= 1e12) return `$${(raw/1e12).toFixed(1)}T`
  if (raw >= 1e9)  return `$${(raw/1e9).toFixed(1)}B`
  if (raw >= 1e6)  return `$${(raw/1e6).toFixed(0)}M`
  return `$${raw.toLocaleString()}`
}

export async function getServerSideProps({ req, res }) {
  const session = await getSession(req, res)
  return { props: { initialUser: session.user || null } }
}

export default function Home({ initialUser }) {
  const [user, setUser]                   = useState(initialUser)
  const [catalysts, setCatalysts]         = useState([])
  const [dataLoading, setDataLoading]     = useState(false)
  const [search, setSearch]               = useState('')
  const [timeFilter, setTimeFilter]       = useState('upcoming')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [sortBy, setSortBy]               = useState('date')
  const [sortDir, setSortDir]             = useState('asc')
  const [meta, setMeta]                   = useState(null)
  const [showPast, setShowPast]           = useState(false)
  const [myStars, setMyStars]             = useState([])
  const [starFilter, setStarFilter]       = useState(false)
  const [addingTicker, setAddingTicker]   = useState(false)
  const [newTicker, setNewTicker]         = useState('')
  const [typeDropOpen, setTypeDropOpen]   = useState(false)
  const [selectedCard, setSelectedCard]   = useState(null)
  const [stockData, setStockData]         = useState({})
  const [stockLoading, setStockLoading]   = useState(false)
  const dropRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setTypeDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const isCard = e.target.closest('[data-catalyst-card]')
        if (!isCard) setSelectedCard(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ghost_my_stars')
      if (saved) setMyStars(JSON.parse(saved))
      else setMyStars(DEFAULT_WATCHLIST)
    } catch { setMyStars(DEFAULT_WATCHLIST) }
  }, [])

  useEffect(() => {
    if (user?.isMember) {
      setDataLoading(true)
      fetch('/api/catalysts')
        .then(r => r.json())
        .then(data => { setCatalysts(data.catalysts || []); setMeta(data.meta || null) })
        .catch(console.error)
        .finally(() => setDataLoading(false))
    }
  }, [user?.isMember])

  const openCard = useCallback(async (catalyst) => {
    setSelectedCard(catalyst)
    const t = catalyst.ticker?.toUpperCase()
    if (!t) return
    // If we already have full data (with AI v2), don't reload
    if (stockData[t]?.aiLoaded && stockData[t]?.aiV === 3) return
    // If FMP data already loaded and AI is loading, don't restart
    if (stockData[t]?.aiLoading) return
    setStockLoading(true)
    try {
      // Load FMP data first (fast ~1s)
      const res = await fetch(`/api/stock?ticker=${t}`)
      if (res.ok) {
        const data = await res.json()
        setStockData(prev => ({ ...prev, [t]: { ...data, aiLoading: true } }))
        setStockLoading(false)
        // Then load AI data async (slow ~10-20s) without blocking panel
        fetch(`/api/stockai?ticker=${t}&v=3`)
          .then(r => r.ok ? r.json() : null)
          .then(aiData => {
            console.log('AI data received:', JSON.stringify(aiData).slice(0,300))
            if (aiData && !aiData.noData) {
              setStockData(prev => ({ ...prev, [t]: { ...prev[t], ...aiData, aiLoading: false, aiLoaded: true, aiV: 3 } }))
            } else {
              setStockData(prev => ({ ...prev, [t]: { ...prev[t], aiLoading: false, aiLoaded: true, aiDebug: aiData?.debug || aiData?.raw || 'noData' } }))
            }
          })
          .catch(e => {
            console.log('AI error:', e.message)
            setStockData(prev => ({ ...prev, [t]: { ...prev[t], aiLoading: false, aiLoaded: true } }))
          })
      } else {
        setStockLoading(false)
      }
    } catch {
      setStockLoading(false)
    }
  }, [stockData])

  const saveStars = (stars) => {
    setMyStars(stars)
    try { localStorage.setItem('ghost_my_stars', JSON.stringify(stars)) } catch {}
  }
  const toggleStar = (ticker) => {
    const t = ticker.toUpperCase()
    saveStars(myStars.includes(t) ? myStars.filter(s => s !== t) : [...myStars, t])
  }
  const addTicker = () => {
    const t = newTicker.trim().toUpperCase()
    if (t && !myStars.includes(t)) saveStars([...myStars, t])
    setNewTicker(''); setAddingTicker(false)
  }
  const toggleType = (type) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  const enriched = useMemo(() => catalysts.map(c => ({
    ...c,
    inferredType: inferType(c),
    isMystar: myStars.includes((c.ticker || '').toUpperCase()),
  })), [catalysts, myStars])

  const filtered = useMemo(() => {
    let list = [...enriched]
    if (showPast) {
      list = list.filter(c => c.daysOut < 0)
      list.sort((a, b) => new Date(b.date) - new Date(a.date))
      return list
    } else {
      list = list.filter(c => c.daysOut >= 0)
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.ticker?.toLowerCase().includes(q) ||
        c.drug?.toLowerCase().includes(q) ||
        c.condition?.toLowerCase().includes(q) ||
        c.catalyst?.toLowerCase().includes(q)
      )
    }
    if (timeFilter === 'week')  list = list.filter(c => c.daysOut <= 7)
    if (timeFilter === 'month') list = list.filter(c => c.daysOut <= 30)
    if (timeFilter === '90')    list = list.filter(c => c.daysOut <= 90)
    if (selectedTypes.length > 0) list = list.filter(c => selectedTypes.includes(c.inferredType))
    if (starFilter) list = list.filter(c => c.isMystar)
    list.sort((a, b) => {
      let valA = sortBy === 'date' ? new Date(a.date) : (a[sortBy] || '')
      let valB = sortBy === 'date' ? new Date(b.date) : (b[sortBy] || '')
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [enriched, search, timeFilter, selectedTypes, sortBy, sortDir, showPast, starFilter])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  if (!user)          return <LandingPage invite={DISCORD_INVITE} />
  if (!user.isMember) return <NotMemberPage user={user} invite={DISCORD_INVITE} />

  const upcoming    = enriched.filter(c => c.daysOut >= 0)
  const past        = enriched.filter(c => c.daysOut < 0)
  const myStarHits  = upcoming.filter(c => c.isMystar)
  const typeCounts  = useMemo(() => {
    const counts = {}
    upcoming.forEach(c => { const t = c.inferredType; counts[t] = (counts[t]||0)+1 })
    return counts
  }, [upcoming])

  const pduCount   = upcoming.filter(c => c.inferredType === 'pdufa').length
  const ph3Count   = upcoming.filter(c => ['phase3','phase23'].includes(c.inferredType)).length
  const weekCount  = upcoming.filter(c => c.daysOut <= 7).length

  // Group filtered by date sections
  const todayCats  = filtered.filter(c => c.daysOut === 0)
  const weekCats   = filtered.filter(c => c.daysOut > 0 && c.daysOut <= 7)
  const monthCats  = filtered.filter(c => c.daysOut > 7 && c.daysOut <= 30)
  const laterCats  = filtered.filter(c => c.daysOut > 30)

  const activeSd   = selectedCard ? stockData[selectedCard.ticker?.toUpperCase()] : null

  return (
    <>
      <Head>
        <title>Ghost of Stocktwits — Biotech Catalyst Calendar</title>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0c10; color: #e6edf3; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: #161b22; }
          ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          .cat-card:hover { background: rgba(48,54,61,0.6) !important; border-color: #30363d !important; }
          .cat-card { transition: all 0.15s ease; cursor: pointer; }
          @media (max-width: 768px) {
            .desktop-panel { display: none !important; }
            .mobile-panel-overlay { position: fixed; inset: 0; z-index: 999; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); }
            .mobile-panel-sheet { position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000; background: #0d1117; border-top: 1px solid #30363d; border-radius: 20px 20px 0 0; height: 88vh; overflow-y: auto; animation: slideUp 0.28s cubic-bezier(0.32,0.72,0,1); }
            .mobile-panel-handle { width: 36px; height: 4px; background: #30363d; border-radius: 2px; margin: 12px auto 4px; }
            .search-input-mobile { width: 100% !important; }
            .stats-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 6px !important; }
            .filters-row-wrap { flex-wrap: wrap !important; }
          }
          @media (min-width: 769px) {
            .mobile-panel-overlay, .mobile-panel-sheet { display: none !important; }
            .header-username { display: inline !important; }
          }
          @media (max-width: 768px) {
            .main-layout { display: block !important; }
            .desktop-panel { display: none !important; }
            .header-inner-wrap { padding: 8px 12px !important; }
            .brand-name { font-size: 14px !important; }
            .brand-sub { display: none; }
            .stat-card { padding: 8px 6px !important; }
            .filter-group-wrap { display: flex; overflow-x: auto; gap: 5px; padding-bottom: 2px; }
            .filter-group-wrap::-webkit-scrollbar { display: none; }
          }
          .panel-section { border-bottom: 1px solid #21262d; padding: 16px 20px; }
          .panel-section:last-child { border-bottom: none; }
          .data-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .data-row:last-child { margin-bottom: 0; }
          .data-label { font-size: 12px; color: #8b949e; font-weight: 500; }
          .data-value { font-size: 13px; color: #e6edf3; font-weight: 600; text-align: right; }
          .sec-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #58a6ff; background: rgba(88,166,255,0.1); border: 1px solid rgba(88,166,255,0.2); padding: 2px 8px; border-radius: 4px; text-decoration: none; }
          .sec-badge:hover { background: rgba(88,166,255,0.2); }
          .rec-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        `}</style>
      </Head>
      <div style={{ minHeight:'100vh', background:'#0a0c10', display: selectedCard ? 'grid' : 'block', gridTemplateColumns: selectedCard ? '1fr 420px' : undefined }} className="main-layout">

        {/* MAIN CONTENT */}
        <div style={{ minWidth: 0 }}>
          {/* Header */}
          <header style={s.header}>
            <div style={s.headerInner}>
              <div style={s.brand}>
                <span style={{ fontSize: 28 }}>👻</span>
                <div>
                  <div style={s.brandName}>Ghost of Stocktwits</div>
                  <div style={s.brandSub}>Biotech Catalyst Calendar</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {meta && <div style={s.updateBadge}>Updated {new Date(meta.updated).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>}
                <img src={user.avatar} alt={user.username} style={s.avatar} />
                <span style={{ ...s.username, display: 'none' }} className='header-username'>{user.username}</span>
                <a href="/api/auth/logout" style={s.logoutBtn}>Logout</a>
              </div>
            </div>
          </header>

          <main style={s.main}>
            {/* Stats bar */}
            <div style={s.statsRow}>
              {[
                { label: '📅 Total', count: upcoming.length, color: '#e6edf3' },
                { label: '🔥 This Week', count: weekCount, color: '#ef4444', filterFn: () => setTimeFilter('week') },
                { label: '💊 PDUFA', count: pduCount, color: '#ef4444', filterType: 'pdufa' },
                { label: '💰 Earnings', count: upcoming.filter(c => c.inferredType === 'earnings').length, color: '#fbbf24', filterType: 'earnings' },
                { label: '⭐ My Stars', count: myStarHits.length, color: '#f59e0b', filterFn: () => setStarFilter(p => !p) },
                { label: '📁 Past', count: past.length, color: '#6e7681', clickable: true },
              ].map(stat => (
                <div key={stat.label}
                  style={{ ...s.statCard, cursor: (stat.clickable || stat.filterType) ? 'pointer' : 'default',
                    border: (showPast && stat.clickable) || (stat.filterType && selectedTypes.includes(stat.filterType)) ? '1px solid #6366f1' : '1px solid #21262d' }}
                  onClick={stat.clickable ? () => setShowPast(p => !p) : stat.filterType ? () => toggleType(stat.filterType) : stat.filterFn ? stat.filterFn : undefined}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.count}</div>
                  <div style={{ fontSize: 11, color: '#8b949e', marginTop: 3 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Stars bar */}
            <div style={s.starsBar}>
              <span style={{ fontSize: 12, color: '#8b949e', fontWeight: 600, marginRight: 8 }}>⭐ Watchlist:</span>
              {myStars.map(t => (
                <span key={t} style={s.starChip}>
                  {t}
                  <button onClick={() => toggleStar(t)} style={s.chipRemove}>×</button>
                </span>
              ))}
              {addingTicker ? (
                <span style={{ display:'inline-flex', gap:4, alignItems:'center' }}>
                  <input autoFocus value={newTicker} onChange={e => setNewTicker(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key==='Enter') addTicker(); if (e.key==='Escape') setAddingTicker(false) }}
                    placeholder="TICKER" style={s.tickerInput} maxLength={8} />
                  <button onClick={addTicker} style={s.addBtn}>Add</button>
                  <button onClick={() => setAddingTicker(false)} style={s.cancelBtn}>Cancel</button>
                </span>
              ) : (
                <button onClick={() => setAddingTicker(true)} style={s.addStarBtn}>+ Add</button>
              )}
            </div>

            {/* Past banner */}
            {showPast && (
              <div style={s.pastBanner}>
                📁 Showing past catalysts — <button onClick={() => setShowPast(false)} style={s.backBtn}>← Back to Upcoming</button>
              </div>
            )}

            {/* Filters */}
            {!showPast && (
              <div style={s.filtersRow}>
                <input type="text" placeholder="🔍  Search ticker, drug, condition..."
                  value={search} onChange={e => setSearch(e.target.value)} style={s.searchInput} />

                <div style={s.filterGroup}>
                  {[{v:'upcoming',l:'All Upcoming'},{v:'week',l:'This Week'},{v:'month',l:'This Month'},{v:'90',l:'90 Days'}].map(f => (
                    <button key={f.v} onClick={() => setTimeFilter(f.v)}
                      style={timeFilter===f.v ? s.filterBtnActive : s.filterBtn}>{f.l}</button>
                  ))}
                </div>

                <div ref={dropRef} style={{ position:'relative' }}>
                  <button onClick={() => setTypeDropOpen(p => !p)}
                    style={{ ...s.filterBtn, ...(selectedTypes.length>0 ? {borderColor:'#6366f1',color:'#818cf8',background:'rgba(99,102,241,0.12)'} : {}), minWidth: 110 }}>
                    {selectedTypes.length === 0 ? 'All Types ▾' : `${selectedTypes.length} Type${selectedTypes.length>1?'s':''} ▾`}
                  </button>
                  {typeDropOpen && (
                    <div style={s.dropdown}>
                      <div style={s.dropHeader}>
                        <span style={{ fontSize:12, color:'#8b949e' }}>Filter by event type</span>
                        {selectedTypes.length > 0 && (
                          <button onClick={() => setSelectedTypes([])} style={s.clearBtn}>Clear all</button>
                        )}
                      </div>
                      <div style={{ maxHeight: 340, overflowY:'auto' }}>
                        {Object.entries(EVENT_TYPES).map(([key, def]) => (
                          <div key={key} onClick={() => toggleType(key)} style={s.dropItem}>
                            <div style={{ ...s.dropCheck, background: selectedTypes.includes(key) ? '#6366f1' : 'transparent', borderColor: selectedTypes.includes(key) ? '#6366f1' : '#30363d' }}>
                              {selectedTypes.includes(key) && <span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>✓</span>}
                            </div>
                            <span style={{ ...s.typeBadge, background:def.bg, color:def.color, marginRight:8 }}>{def.icon} {def.label}</span>
                            <span style={{ fontSize:11, color:'#6e7681', marginLeft:'auto' }}>{typeCounts[key]||0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => setStarFilter(p => !p)}
                  style={starFilter ? {...s.filterBtnActive, background:'rgba(245,158,11,0.15)',borderColor:'#f59e0b',color:'#f59e0b'} : s.filterBtn}>
                  ⭐ My Stars Only
                </button>
              </div>
            )}

            {/* Active type chips */}
            {selectedTypes.length > 0 && !showPast && (
              <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'#6e7681' }}>Filtered:</span>
                {selectedTypes.map(t => {
                  const def = EVENT_TYPES[t] || {}
                  return (
                    <span key={t} style={{ ...s.typeBadge, background:def.bg||'rgba(99,102,241,0.15)', color:def.color||'#818cf8', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4 }}
                      onClick={() => toggleType(t)}>
                      {def.label||t} ×
                    </span>
                  )
                })}
              </div>
            )}

            <div style={{ fontSize:12, color:'#6e7681', marginBottom:12 }}>
              {dataLoading ? '⏳ Loading...' : `Showing ${filtered.length} ${showPast?'past':'upcoming'} catalysts`}
            </div>

            {/* Cards */}
            {dataLoading ? (
              <div style={s.loadingBox}>
                <div style={s.spinner} />
                <div style={{ color:'#8b949e', marginTop:16 }}>Loading catalyst data...</div>
              </div>
            ) : showPast ? (
              <CatalystTable rows={filtered} onToggleStar={toggleStar} onClickRow={openCard} selectedId={selectedCard?.ticker+'_'+selectedCard?.date} isPast toggleSort={toggleSort} sortBy={sortBy} sortDir={sortDir} />
            ) : (
              <div>
                {filtered.length === 0 && (
                  <div style={{ textAlign:'center', padding:'60px', color:'#6e7681', fontSize:15 }}>No catalysts found.</div>
                )}
                {todayCats.length > 0 && <DateSection label="🔥 Today" cards={todayCats} onToggleStar={toggleStar} onClickCard={openCard} selectedTicker={selectedCard?.ticker} />}
                {weekCats.length > 0  && <DateSection label="📅 This Week" cards={weekCats} onToggleStar={toggleStar} onClickCard={openCard} selectedTicker={selectedCard?.ticker} />}
                {monthCats.length > 0 && <DateSection label="📆 This Month" cards={monthCats} onToggleStar={toggleStar} onClickCard={openCard} selectedTicker={selectedCard?.ticker} />}
                {laterCats.length > 0 && <DateSection label="🗓️ Later" cards={laterCats} onToggleStar={toggleStar} onClickCard={openCard} selectedTicker={selectedCard?.ticker} />}
              </div>
            )}

            {/* Mobile panel - bottom sheet */}
        {selectedCard && (
          <>
            <div className="mobile-panel-overlay" onClick={() => setSelectedCard(null)} />
            <div className="mobile-panel-sheet">
              <div className="mobile-panel-handle" />
              <StockPanel
                catalyst={selectedCard}
                stockData={stockData[selectedCard.ticker?.toUpperCase()]}
                loading={stockLoading && !stockData[selectedCard.ticker?.toUpperCase()]}
                onClose={() => setSelectedCard(null)}
                onToggleStar={toggleStar}
                isStarred={myStars.includes(selectedCard.ticker?.toUpperCase())}
              />
            </div>
          </>
        )}

        <div style={s.footer}>
              Data: CatalystAlert.io · ClinicalTrials.gov · SEC EDGAR · Yahoo Finance<br/>
              <span style={{ color:'#6e7681' }}>Not financial advice. ⭐ = starred tickers · Click any card for deep dive</span>
            </div>
          </main>
        </div>

        {/* DEEP DIVE PANEL */}
        {selectedCard && (
          <div ref={panelRef} style={s.panel} className="desktop-panel">
            <StockPanel
              catalyst={selectedCard}
              stockData={activeSd}
              loading={stockLoading && !activeSd}
              onClose={() => setSelectedCard(null)}
              onToggleStar={toggleStar}
              isStarred={myStars.includes(selectedCard.ticker?.toUpperCase())}
            />
          </div>
        )}
      </div>
    </>
  )
}

// ── DATE SECTION ──────────────────────────────────────────────────────────────
function DateSection({ label, cards, onToggleStar, onClickCard, selectedTicker }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', marginBottom: 10, display:'flex', alignItems:'center', gap:8 }}>
        {label}
        <span style={{ fontSize: 12, color: '#6e7681', fontWeight: 400 }}>{cards.length} events</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {cards.map((c, i) => (
          <CatalystCard key={`${c.ticker}_${c.date}_${i}`} c={c} onToggleStar={onToggleStar} onClickCard={onClickCard}
            isSelected={selectedTicker === c.ticker} />
        ))}
      </div>
    </div>
  )
}

// ── CATALYST CARD ─────────────────────────────────────────────────────────────
function CatalystCard({ c, onToggleStar, onClickCard, isSelected }) {
  const typeDef = EVENT_TYPES[c.inferredType] || { label: c.inferredType||'Readout', color:'#6e7681', bg:'rgba(110,118,129,0.15)', icon:'📊' }
  const urgColor = c.daysOut===0 ? '#ef4444' : c.daysOut<=7 ? '#f59e0b' : '#6e7681'
  const daysLabel = c.daysOut===0 ? 'Today' : c.daysOut===1 ? '1d' : `${c.daysOut}d`
  const dateStr = new Date(c.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})
  const nctLink = c.nctId ? `https://clinicaltrials.gov/study/${c.nctId}` : null
  const secLink = c.secUrl || null

  return (
    <div data-catalyst-card="true" className="cat-card" onClick={() => onClickCard(c)}
      style={{
        background: isSelected ? 'rgba(99,102,241,0.08)' : 'rgba(22,27,34,0.8)',
        border: isSelected ? '1px solid rgba(99,102,241,0.5)' : '1px solid #21262d',
        borderLeft: c.isMystar ? '3px solid #f59e0b' : isSelected ? '3px solid #6366f1' : '3px solid transparent',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}>

      {/* Date column */}
      <div style={{ textAlign:'center', minWidth: 48, paddingTop: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: urgColor }}>{daysLabel}</div>
        <div style={{ fontSize: 11, color: '#6e7681', marginTop: 2 }}>{dateStr}</div>
      </div>

      {/* Divider */}
      <div style={{ width: 2, alignSelf:'stretch', background: typeDef.color, opacity: 0.5, borderRadius: 2, flexShrink: 0 }} />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: c.isMystar ? '#f59e0b' : '#e6edf3' }}>{c.ticker}</span>
          <span style={{ ...s.typeBadge, background: typeDef.bg, color: typeDef.color, fontSize: 11 }}>
            {typeDef.icon} {typeDef.label}
          </span>
          {c.isMystar && <span style={{ fontSize: 10, color: '#f59e0b' }}>★ WATCHLIST</span>}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9', marginBottom: 4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {c.catalyst || c.drug || '—'}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          {c.drug && c.drug !== c.catalyst && (
            <span style={{ fontSize: 11, color: '#8b949e', display:'flex', alignItems:'center', gap:3 }}>
              <span style={{ opacity:.6 }}>🔗</span> {c.drug}
            </span>
          )}
          {c.condition && (
            <span style={{ fontSize: 11, color: '#6e7681' }}>• {c.condition.length > 40 ? c.condition.slice(0,40)+'…' : c.condition}</span>
          )}
        </div>

        {/* Bottom row: source links */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop: 8 }}>
          {nctLink && (
            <a href={nctLink} target="_blank" rel="noreferrer" className="sec-badge" onClick={e => e.stopPropagation()}>
              📄 ClinicalTrials
            </a>
          )}
          {secLink && (
            <a href={secLink} target="_blank" rel="noreferrer" className="sec-badge" onClick={e => e.stopPropagation()}>
              🏛️ SEC 8-K
            </a>
          )}
          <span style={{ fontSize: 11, color: '#6e7681', marginLeft:'auto' }}>{c.source||'—'}</span>
        </div>
      </div>

      {/* Star */}
      <button onClick={e => { e.stopPropagation(); onToggleStar(c.ticker) }}
        style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, opacity: c.isMystar ? 1 : 0.25, transition:'opacity 0.15s', flexShrink:0, paddingTop:2 }}>
        ⭐
      </button>
    </div>
  )
}

// ── TABLE VIEW (for past) ─────────────────────────────────────────────────────
function CatalystTable({ rows, onToggleStar, onClickRow, selectedId, isPast, toggleSort, sortBy, sortDir }) {
  return (
    <div style={{ overflowX:'auto', background:'#161b22', borderRadius:12, border:'1px solid #21262d' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr>
            <th style={s.th}></th>
            {[['date','Date'],['daysOut','Days'],['ticker','Ticker'],['drug','Drug'],['catalyst','Catalyst']].map(([col,label]) => (
              <th key={col} onClick={() => toggleSort(col)} style={{ ...s.th, cursor:'pointer' }}>
                {label}{sortBy===col?(sortDir==='asc'?' ↑':' ↓'):''}
              </th>
            ))}
            <th style={s.th}>Type</th>
            <th style={s.th}>Condition</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign:'center', padding:'48px', color:'#8b949e' }}>No catalysts found.</td></tr>
          ) : rows.map((c, i) => {
            const typeDef = EVENT_TYPES[c.inferredType] || { label: c.inferredType||'Readout', color:'#6e7681', bg:'rgba(110,118,129,0.15)', icon:'📊' }
            const daysLabel = isPast ? `${Math.abs(c.daysOut)}d ago` : c.daysOut===0 ? 'TODAY' : `${c.daysOut}d`
            const dateStr = new Date(c.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
            const nctLink = c.nctId ? `https://clinicaltrials.gov/study/${c.nctId}` : null
            return (
              <tr key={`${c.ticker}_${c.date}_${i}`} onClick={() => onClickRow(c)}
                style={{ borderBottom:'1px solid #21262d', background: c.isMystar ? 'rgba(245,158,11,0.04)':'transparent',
                  borderLeft: c.isMystar ? '3px solid #f59e0b':'3px solid transparent', cursor:'pointer' }}>
                <td style={{ padding:'8px 10px' }}>
                  <button onClick={e=>{e.stopPropagation();onToggleStar(c.ticker)}} style={{ background:'none',border:'none',cursor:'pointer',fontSize:13,opacity:c.isMystar?1:0.25 }}>⭐</button>
                </td>
                <td style={{ padding:'10px 12px', color:'#8b949e', whiteSpace:'nowrap' }}>{dateStr}</td>
                <td style={{ padding:'10px 12px', fontWeight:700, color: isPast?'#6e7681':'#ef4444', whiteSpace:'nowrap' }}>{daysLabel}</td>
                <td style={{ padding:'10px 12px', fontWeight:700 }}>
                  {nctLink ? <a href={nctLink} target="_blank" rel="noreferrer" style={{ color:'#58a6ff', textDecoration:'none' }} onClick={e=>e.stopPropagation()}>{c.ticker}</a>
                    : <span style={{ color:'#58a6ff' }}>{c.ticker}</span>}
                </td>
                <td style={{ padding:'10px 12px', color:'#8b949e', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.drug||'—'}</td>
                <td style={{ padding:'10px 12px', color:'#6e7681', fontSize:12, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.catalyst||'—'}</td>
                <td style={{ padding:'10px 12px' }}>
                  <span style={{ ...s.typeBadge, background:typeDef.bg, color:typeDef.color, fontSize:11, whiteSpace:'nowrap' }}>{typeDef.icon} {typeDef.label}</span>
                </td>
                <td style={{ padding:'10px 12px', color:'#6e7681', fontSize:11, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.condition||'—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── STOCK DEEP DIVE PANEL ────────────────────────────────────────────────────
function StockPanel({ catalyst, stockData: sd, loading, onClose, onToggleStar, isStarred }) {
  const typeDef = EVENT_TYPES[catalyst.inferredType] || { label:'Readout', color:'#6e7681', bg:'rgba(110,118,129,0.15)', icon:'📊' }

  const recColor = (rec) => {
    if (!rec) return '#8b949e'
    const r = rec.toLowerCase()
    if (r.includes('strong buy')) return '#22c55e'
    if (r.includes('buy')) return '#4ade80'
    if (r.includes('hold') || r.includes('neutral')) return '#f59e0b'
    if (r.includes('sell')) return '#ef4444'
    return '#8b949e'
  }

  const ivColor = (iv) => {
    if (!iv) return '#6e7681'
    if (iv < 30) return '#22c55e'
    if (iv < 60) return '#f59e0b'
    return '#ef4444'
  }

  const shortColor = (s) => {
    if (!s) return '#6e7681'
    const pct = parseFloat(s)
    if (pct < 10) return '#4ade80'
    if (pct < 20) return '#f59e0b'
    return '#ef4444'
  }

  const hasData = sd && Object.keys(sd).length > 2

  return (
    <div style={{ ...s.panelInner, animation:'slideIn 0.2s ease' }}>

      {/* ── HEADER ── */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #21262d', background:'#161b22', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => onToggleStar(catalyst.ticker)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, opacity: isStarred?1:0.25, transition:'all 0.15s', padding:0 }}>⭐</button>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:22, fontWeight:900, color:'#e6edf3' }}>${catalyst.ticker}</span>
                {sd?.sector && (
                  <span style={{ fontSize:10, fontWeight:600, background:'rgba(99,102,241,0.15)', color:'#818cf8', padding:'2px 8px', borderRadius:20, border:'1px solid rgba(99,102,241,0.25)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    {sd.sector}
                  </span>
                )}
              </div>
              <div style={{ fontSize:12, color:'#6e7681', marginTop:2 }}>{sd?.companyName || catalyst.company || '—'}</div>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:'rgba(110,118,129,0.1)', border:'1px solid #30363d', borderRadius:6, cursor:'pointer', color:'#8b949e', fontSize:14, padding:'4px 10px', lineHeight:1 }}>✕</button>
        </div>

        {/* Price bar */}
        {sd?.price && (
          <div style={{ display:'flex', alignItems:'baseline', gap:12, marginTop:14, paddingTop:14, borderTop:'1px solid #21262d' }}>
            <span style={{ fontSize:32, fontWeight:900, color:'#e6edf3', letterSpacing:'-0.02em' }}>${sd.price.toFixed(2)}</span>
            {sd.marketCap && (
              <span style={{ fontSize:13, color:'#6e7681' }}>
                MCap: <span style={{ color:'#8b949e', fontWeight:600 }}>{sd.marketCap}</span>
              </span>
            )}
            {sd.fdmc && (
              <span style={{ fontSize:13, color:'#6e7681' }}>
                FDMC: <span style={{ color:'#f59e0b', fontWeight:600 }}>{sd.fdmc}</span>
              </span>
            )}
            {sd.beta && (
              <span style={{ fontSize:13, color:'#6e7681' }}>
                β <span style={{ color:'#8b949e', fontWeight:600 }}>{parseFloat(sd.beta).toFixed(2)}</span>
              </span>
            )}
          </div>
        )}

        {/* 52w range bar */}
        {sd?.week52Low && sd?.week52High && sd?.price && (
          <div style={{ marginTop:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#6e7681', marginBottom:4 }}>
              <span>52W Low ${sd.week52Low}</span>
              <span>52W High ${sd.week52High}</span>
            </div>
            <div style={{ position:'relative', height:4, background:'#21262d', borderRadius:2 }}>
              <div style={{
                position:'absolute', left:0, top:0, height:'100%', borderRadius:2,
                width:`${Math.min(100,Math.max(0,((sd.price - sd.week52Low)/(sd.week52High - sd.week52Low))*100))}%`,
                background:'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── CATALYST CONTEXT ── */}
      <div style={{ padding:'12px 20px', borderBottom:'1px solid #21262d', background:'rgba(239,68,68,0.03)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ ...s.typeBadge, background:typeDef.bg, color:typeDef.color, fontSize:11 }}>
            {typeDef.icon} {typeDef.label}
          </span>
          <span style={{ fontSize:11, color:'#6e7681' }}>
            {catalyst.daysOut === 0 ? '🔥 Today' : `${catalyst.daysOut}d away`}
          </span>
        </div>
        <div style={{ fontSize:13, fontWeight:600, color:'#c9d1d9', lineHeight:1.4 }}>
          {catalyst.catalyst || catalyst.drug}
        </div>
        {catalyst.condition && (
          <div style={{ fontSize:11, color:'#6e7681', marginTop:4 }}>{catalyst.condition}</div>
        )}
        <div style={{ display:'flex', gap:6, marginTop:8 }}>
          {catalyst.nctId && (
            <a href={`https://clinicaltrials.gov/study/${catalyst.nctId}`} target="_blank" rel="noreferrer" className="sec-badge" onClick={e => e.stopPropagation()}>
              📄 ClinicalTrials
            </a>
          )}
        </div>
      </div>


      {loading ? (
        <div style={{ padding:'60px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
          <div style={s.spinner} />
          <div style={{ color:'#8b949e', fontSize:13, textAlign:'center' }}>
            Searching for {catalyst.ticker} data...
            <div style={{ fontSize:11, color:'#6e7681', marginTop:4 }}>This takes ~5 seconds</div>
          </div>
        </div>
      ) : sd ? (
        <div style={{ overflowY:'auto', flex:1 }}>

          {/* Earnings */}
          {(sd.earningsDate || sd.epsEstimate || sd.revenueEstimate) && (
            <div className="panel-section">
              <div style={s.sectionTitle}>💰 Earnings</div>
              {sd.earningsDate && (
                <div className="data-row">
                  <span className="data-label">Next Earnings</span>
                  <span className="data-value" style={{ color: sd.earningsDaysOut <= 14 ? '#ef4444' : '#e6edf3' }}>
                    {new Date(sd.earningsDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                    <span style={{ color:'#6e7681', fontWeight:400, marginLeft:6 }}>({sd.earningsDaysOut}d)</span>
                  </span>
                </div>
              )}
              {sd.epsEstimate != null && (
                <div className="data-row">
                  <span className="data-label">EPS Estimate</span>
                  <span className="data-value" style={{ color: sd.epsEstimate >= 0 ? '#4ade80' : '#ef4444' }}>
                    {sd.epsEstimate >= 0 ? '+' : ''}{sd.epsEstimate}
                  </span>
                </div>
              )}
              {sd.epsWhisper != null && sd.epsWhisper !== sd.epsEstimate && (
                <div className="data-row">
                  <span className="data-label">EPS Whisper</span>
                  <span className="data-value" style={{ color:'#f59e0b', fontWeight:700 }}>
                    {sd.epsWhisper >= 0 ? '+' : ''}{sd.epsWhisper}
                    <span style={{ fontSize:10, color:'#6e7681', marginLeft:4 }}>whisper</span>
                  </span>
                </div>
              )}
              {sd.revenueEstimate && (
                <div className="data-row">
                  <span className="data-label">Revenue Estimate</span>
                  <span className="data-value">{sd.revenueEstimateFmt || sd.revenueEstimate}</span>
                </div>
              )}
            </div>
          )}

          {/* Balance sheet */}
          {(sd.cash || sd.quarterlyBurn || sd.runway) && (
            <div className="panel-section">
              <div style={s.sectionTitle}>🏦 Balance Sheet</div>
              {sd.sharesOutstanding && (
                <div className="data-row">
                  <span className="data-label">Shares Outstanding</span>
                  <span className="data-value">{sd.sharesOutstanding}</span>
                </div>
              )}
              {sd.fullyDilutedShares && (
                <div className="data-row">
                  <span className="data-label">Fully Diluted (FDO)</span>
                  <span className="data-value" style={{ color:'#f59e0b' }}>{sd.fullyDilutedShares}</span>
                </div>
              )}
              {sd.fdmc && (
                <div className="data-row">
                  <span className="data-label">Fully Diluted MCap</span>
                  <span className="data-value" style={{ color:'#f59e0b', fontWeight:700 }}>{sd.fdmc}
                    {sd.fdmcNote && <span style={{ fontSize:10, color:'#6e7681', display:'block', fontWeight:400 }}>{sd.fdmcNote}</span>}
                  </span>
                </div>
              )}
              {sd.cash && (
                <div className="data-row">
                  <span className="data-label">Cash on Hand</span>
                  <span className="data-value" style={{ color:'#4ade80' }}>{sd.cash}</span>
                </div>
              )}
              {sd.quarterlyBurn && (
                <div className="data-row">
                  <span className="data-label">Burn Rate (Qtr)</span>
                  <span className="data-value" style={{ color:'#f59e0b' }}>{sd.quarterlyBurn}</span>
                </div>
              )}
              {sd.runway && (
                <div className="data-row">
                  <span className="data-label">Cash Runway</span>
                  <span className="data-value" style={{ color: sd.runwayMonths && sd.runwayMonths < 6 ? '#ef4444' : sd.runwayMonths && sd.runwayMonths < 12 ? '#f59e0b' : '#4ade80' }}>
                    {sd.runway}
                    {sd.runwayMonths && <span style={{ color:'#6e7681', fontWeight:400, marginLeft:4 }}>({sd.runwayMonths}mo)</span>}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Analyst sentiment */}
          {(sd.targetMean || sd.recommendation) && (
            <div className="panel-section">
              <div style={s.sectionTitle}>📊 Analyst Sentiment</div>
              {sd.recommendation && (
                <div className="data-row">
                  <span className="data-label">Consensus</span>
                  <span className="rec-badge" style={{ background:`${recColor(sd.recommendation)}22`, color:recColor(sd.recommendation), border:`1px solid ${recColor(sd.recommendation)}44` }}>
                    {sd.recommendation}
                  </span>
                </div>
              )}
              {sd.analystCount && (
                <div className="data-row">
                  <span className="data-label">Analysts Covering</span>
                  <span className="data-value">{sd.analystCount}</span>
                </div>
              )}
              {(sd.targetLow || sd.targetMean || sd.targetHigh) && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:11, color:'#8b949e', marginBottom:6 }}>Price Target Range</div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, color:'#6e7681' }}>Low: <span style={{ color:'#e6edf3', fontWeight:700 }}>${sd.targetLow?.toFixed(2)||'—'}</span></span>
                    <span style={{ fontSize:12, color:'#6e7681' }}>Mean: <span style={{ color:'#58a6ff', fontWeight:700 }}>${sd.targetMean?.toFixed(2)||'—'}</span></span>
                    <span style={{ fontSize:12, color:'#6e7681' }}>High: <span style={{ color:'#e6edf3', fontWeight:700 }}>${sd.targetHigh?.toFixed(2)||'—'}</span></span>
                  </div>
                  {sd.targetLow && sd.targetHigh && sd.price && (
                    <div style={{ position:'relative', height:8, background:'#21262d', borderRadius:4, overflow:'hidden' }}>
                      <div style={{
                        position:'absolute', left:0, top:0, height:'100%',
                        width:`${Math.min(100,Math.max(0,((sd.price-sd.targetLow)/(sd.targetHigh-sd.targetLow))*100))}%`,
                        background:'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)',
                        borderRadius:4
                      }} />
                      <div style={{
                        position:'absolute', top:'50%', transform:'translateY(-50%)',
                        left:`${Math.min(97,Math.max(1,((sd.price-sd.targetLow)/(sd.targetHigh-sd.targetLow))*100))}%`,
                        width:3, height:'120%', background:'#fff', borderRadius:2
                      }} />
                    </div>
                  )}
                  {sd.targetMean && sd.price && (
                    <div style={{ fontSize:11, color:'#8b949e', marginTop:6, textAlign:'right' }}>
                      Upside to mean: <span style={{ color: sd.targetMean > sd.price ? '#4ade80' : '#ef4444', fontWeight:700 }}>
                        {sd.targetMean > sd.price ? '+' : ''}{(((sd.targetMean - sd.price) / sd.price) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Short float & options */}
          {(sd.shortFloat || sd.ivRank || sd.week52High) && (
            <div className="panel-section">
              <div style={s.sectionTitle}>📉 Short / Options</div>
              {sd.shortFloat && (
                <div className="data-row">
                  <span className="data-label">Short Float</span>
                  <span className="data-value" style={{ color: shortColor(sd.shortFloat) }}>{sd.shortFloat}</span>
                </div>
              )}
              {sd.ivRank != null && (
                <div className="data-row">
                  <span className="data-label">IV Rank</span>
                  <span className="data-value" style={{ color: ivColor(sd.ivRank) }}>
                    {sd.ivRank}
                    <span style={{ fontSize:10, color:'#6e7681', marginLeft:4 }}>
                      {sd.ivRank < 30 ? '● Low' : sd.ivRank < 60 ? '● Elevated' : '● High'}
                    </span>
                  </span>
                </div>
              )}
              {(sd.week52Low || sd.week52High) && (
                <div className="data-row">
                  <span className="data-label">52-Week Range</span>
                  <span className="data-value" style={{ fontSize:12 }}>
                    ${sd.week52Low||'—'} – ${sd.week52High||'—'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Capital raise */}
          {(sd.lastRaiseAmount || sd.lastRaiseType || sd.warrantStrike) && (
            <div className="panel-section">
              <div style={s.sectionTitle}>💸 Last Capital Raise <span style={{ fontSize:10, color:'#4ade80', marginLeft:6 }}>AI · SEC 8-K</span></div>
              {sd.lastRaiseAmount && (
                <div className="data-row">
                  <span className="data-label">Amount Raised</span>
                  <span className="data-value">{sd.lastRaiseAmount}</span>
                </div>
              )}
              {sd.lastRaiseType && (
                <div className="data-row">
                  <span className="data-label">Type</span>
                  <span className="data-value">{sd.lastRaiseType}</span>
                </div>
              )}
              {sd.lastRaiseDate && (
                <div className="data-row">
                  <span className="data-label">Date</span>
                  <span className="data-value">{sd.lastRaiseDate}</span>
                </div>
              )}
              {sd.lastRaisePricePerShare && (
                <div className="data-row">
                  <span className="data-label">Raise Price vs Today</span>
                  <span className="data-value">
                    ${sd.lastRaisePricePerShare}
                    {sd.raiseVsToday && (
                      <span style={{ marginLeft:6, color: sd.raiseVsToday === 'above' ? '#4ade80' : '#ef4444', fontWeight:700 }}>
                        {sd.raiseVsToday === 'above' ? '▲ Above' : '▼ Below'}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {sd.leadInvestors && (
                <div className="data-row">
                  <span className="data-label">Lead Investors</span>
                  <span className="data-value" style={{ fontSize:11, maxWidth:200, textAlign:'right' }}>{sd.leadInvestors}</span>
                </div>
              )}
              {sd.warrantStrike && (
                <div style={{ marginTop:12, padding:'12px 14px', background:'rgba(245,158,11,0.08)', borderRadius:8, border:'1px solid rgba(245,158,11,0.25)' }}>
                  <div style={{ fontSize:13, color:'#f59e0b', fontWeight:800, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    ⚡ Warrants
                    {sd.price && sd.warrantStrike && (
                      <span style={{ fontSize:11, fontWeight:600, color: parseFloat(sd.price) > parseFloat(sd.warrantStrike) ? '#4ade80' : '#ef4444', marginLeft:'auto' }}>
                        {parseFloat(sd.price) > parseFloat(sd.warrantStrike) ? '▲ In The Money' : '▼ Out of Money'}
                      </span>
                    )}
                  </div>
                  <div className="data-row">
                    <span className="data-label">Strike Price</span>
                    <span className="data-value" style={{ fontSize:16, color:'#f59e0b', fontWeight:800 }}>${sd.warrantStrike}</span>
                  </div>
                  {sd.warrantExpiry && (
                    <div className="data-row">
                      <span className="data-label">Expiry Date</span>
                      <span className="data-value">{sd.warrantExpiry}</span>
                    </div>
                  )}
                  {sd.warrantShares && (
                    <div className="data-row">
                      <span className="data-label">Shares Covered</span>
                      <span className="data-value">{sd.warrantShares}</span>
                    </div>
                  )}
                  {sd.dilutionNote && (
                    <div style={{ marginTop:8, fontSize:11, color:'#f59e0b', opacity:0.8, lineHeight:1.5 }}>
                      ⚠️ {sd.dilutionNote}
                    </div>
                  )}
                </div>
              )}
              {!sd.warrantStrike && sd.dilutionNote && (
                <div style={{ marginTop:8, fontSize:12, color:'#8b949e', fontStyle:'italic', lineHeight:1.5 }}>
                  ⚠️ {sd.dilutionNote}
                </div>
              )}
            </div>
          )}

          {/* Prescription data */}
          {(sd.rxDrugName || sd.rxTRx) && (
            <div className="panel-section">
              <div style={s.sectionTitle}>💊 Prescription Data <span style={{ fontSize:10, color:'#6e7681', marginLeft:4 }}>{sd.rxSource||'IQVIA'}</span></div>
              {sd.rxDrugName && (
                <div className="data-row">
                  <span className="data-label">Drug</span>
                  <span className="data-value">{sd.rxDrugName}</span>
                </div>
              )}
              {sd.rxIndication && (
                <div className="data-row">
                  <span className="data-label">Indication</span>
                  <span className="data-value" style={{ fontSize:11, maxWidth:200, textAlign:'right' }}>{sd.rxIndication}</span>
                </div>
              )}
              {sd.rxTRx && (
                <div className="data-row">
                  <span className="data-label">Weekly TRx</span>
                  <span className="data-value" style={{ color:'#4ade80' }}>{sd.rxTRx}</span>
                </div>
              )}
              {sd.rxNRx && (
                <div className="data-row">
                  <span className="data-label">Weekly NRx</span>
                  <span className="data-value">{sd.rxNRx}</span>
                </div>
              )}
              {sd.rxTrend && (
                <div className="data-row">
                  <span className="data-label">Script Trend</span>
                  <span className="data-value" style={{ color: sd.rxTrend.includes('↑') || sd.rxTrend.toLowerCase().includes('up') ? '#4ade80' : '#ef4444' }}>{sd.rxTrend}</span>
                </div>
              )}
              {sd.rxMarketShare && (
                <div className="data-row">
                  <span className="data-label">Market Share</span>
                  <span className="data-value">{sd.rxMarketShare}</span>
                </div>
              )}
              {sd.rxEarningsImplication && (
                <div style={{ marginTop:8, padding:'8px 10px', background:'rgba(99,102,241,0.08)', borderRadius:6, fontSize:12, color:'#c9d1d9', lineHeight:1.5 }}>
                  📈 {sd.rxEarningsImplication}
                </div>
              )}
            </div>
          )}

          {/* Key catalyst */}
          {/* Key Catalyst */}
          {sd.keyCatalyst && (
            <div className="panel-section">
              <div style={s.sectionTitle}>🎯 Key Catalyst</div>
              <div style={{ fontSize:13, color:'#c9d1d9', lineHeight:1.6 }}>{sd.keyCatalyst}</div>
            </div>
          )}

          {/* AI-found catalysts from SEC filings */}
          {sd.catalogCatalysts?.length > 0 && (
            <div className="panel-section">
              <div style={s.sectionTitle}>🔍 Catalysts Found in SEC Filings <span style={{ fontSize:10, color:'#4ade80', marginLeft:6 }}>AI-detected</span></div>
              {sd.catalogCatalysts.map((c, i) => (
                <div key={i} style={{ marginBottom:8, padding:'8px 10px', background:'rgba(99,102,241,0.06)', borderRadius:6, border:'1px solid rgba(99,102,241,0.15)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                    {c.date && <span style={{ fontSize:11, color:'#6e7681' }}>{c.date}</span>}
                    {c.type && <span style={{ ...s.typeBadge, background: EVENT_TYPES[c.type]?.bg||'rgba(99,102,241,0.15)', color: EVENT_TYPES[c.type]?.color||'#818cf8', fontSize:10 }}>{EVENT_TYPES[c.type]?.icon||'📋'} {EVENT_TYPES[c.type]?.label||c.type}</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#c9d1d9' }}>{c.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* SEC Filings */}
          {sd.secFilings?.length > 0 && (
            <div className="panel-section">
              <div style={s.sectionTitle}>🏛️ Recent SEC Filings</div>
              {sd.secFilings.slice(0,5).map((f, i) => (
                <div key={i} className="data-row" style={{ marginBottom:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, color:'#6e7681' }}>{f.date} · <span style={{ color:'#818cf8' }}>{f.type}</span></div>
                    <div style={{ fontSize:12, color:'#c9d1d9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.description}</div>
                  </div>
                  {f.url && (
                    <a href={f.url} target="_blank" rel="noreferrer" className="sec-badge" style={{ marginLeft:8, flexShrink:0 }}>↗</a>
                  )}
                </div>
              ))}
            </div>
          )}

        {/* AI debug info */}
        {sd.aiDebug && (
          <div style={{ padding:'8px 20px', background:'rgba(239,68,68,0.1)', fontSize:11, color:'#ef4444' }}>
            AI debug: {sd.aiDebug}
          </div>
        )}

        {/* AI loading indicator */}
        {sd.aiLoading && (
          <div style={{ padding:'12px 20px', display:'flex', alignItems:'center', gap:8, borderTop:'1px solid #21262d' }}>
            <div style={{ width:12, height:12, border:'2px solid #21262d', borderTop:'2px solid #818cf8', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
            <span style={{ fontSize:11, color:'#6e7681' }}>Loading warrants, capital raise, short float...</span>
          </div>
        )}

        </div>
      ) : (
        <div style={{ padding:'32px 20px', color:'#6e7681', fontSize:13, textAlign:'center' }}>
          No additional data available for {catalyst.ticker}
        </div>
      )}

      <div style={{ padding:'12px 20px', borderTop:'1px solid #21262d', fontSize:11, color:'#6e7681', textAlign:'center' }}>
        Data: FMP · SEC EDGAR · AI-researched · Not financial advice
      </div>
    </div>
  )
}

// ── LANDING ───────────────────────────────────────────────────────────────────
function LandingPage({ invite }) {
  return (
    <>
      <Head><title>Ghost of Stocktwits — Biotech Catalyst Calendar</title></Head>
      <div style={s.landing}>
        <div style={s.hero}>
          <span style={{ fontSize:72 }}>👻</span>
          <h1 style={s.heroTitle}>Ghost of Stocktwits</h1>
          <p style={s.heroSub}>The most comprehensive biotech catalyst calendar.</p>
          <p style={s.heroDesc}>500+ PDUFA dates · Phase 3 readouts · AdCom meetings · Capital raise data · Analyst targets · SEC filing links<br/>Members only.</p>
          <a href="/api/auth/login" style={s.loginBtn}>
            <svg width="20" height="20" viewBox="0 0 71 55" fill="#fff" style={{ marginRight:10 }}>
              <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.7a40.8 40.8 0 0 0-1.8 3.7 54 54 0 0 0-16.3 0A39.5 39.5 0 0 0 25.6.7 58.4 58.4 0 0 0 11 4.9C1.6 19.2-.9 33 .3 46.6a59.1 59.1 0 0 0 18 9.1 44.5 44.5 0 0 0 3.8-6.2 38.3 38.3 0 0 1-6-2.9l1.5-1.1a42.1 42.1 0 0 0 36.1 0l1.5 1.1a38.3 38.3 0 0 1-6 2.9 44.1 44.1 0 0 0 3.8 6.2 58.9 58.9 0 0 0 18-9 54 54 0 0 0-9.9-41.7zM23.7 38.2c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2s-2.9 7.2-6.4 7.2zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2s-2.9 7.2-6.4 7.2z"/>
            </svg>
            Login with Discord
          </a>
          <p style={{ marginTop:16, fontSize:13, color:'#6e7681' }}>Not a member? <a href={invite} target="_blank" rel="noreferrer" style={{ color:'#58a6ff' }}>Join here →</a></p>
        </div>
        <div style={s.featuresRow}>
          {[
            { icon:'💊', title:'PDUFA & AdCom Dates', desc:'Every FDA decision date linked directly to the SEC 8-K filing it came from.' },
            { icon:'📊', title:'Stock Deep Dive', desc:'Click any ticker for earnings estimates, cash runway, analyst targets, capital raises, and warrants.' },
            { icon:'🏛️', title:'SEC Filing Links', desc:'Every catalyst traced back to its source filing on EDGAR. AI-extracted, always verified.' },
            { icon:'⭐', title:'Your Watchlist', desc:'Star your tickers. Your watchlist saves automatically across sessions.' },
          ].map(f => (
            <div key={f.title} style={s.featureCard}>
              <div style={{ fontSize:32, marginBottom:12 }}>{f.icon}</div>
              <div style={{ fontWeight:700, marginBottom:6, fontSize:15 }}>{f.title}</div>
              <div style={{ color:'#8b949e', fontSize:13, lineHeight:1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:'#6e7681' }}>© 2026 Ghost of Stocktwits · <a href={invite} style={{ color:'#58a6ff' }}>Join Discord</a></div>
      </div>
    </>
  )
}

function NotMemberPage({ user, invite }) {
  return (
    <>
      <Head><title>Ghost of Stocktwits — Members Only</title></Head>
      <div style={{ ...s.landing, justifyContent:'center', alignItems:'center', minHeight:'100vh' }}>
        <div style={{ textAlign:'center', maxWidth:480, padding:40 }}>
          <div style={{ fontSize:64, marginBottom:16 }}>👻</div>
          <h2 style={{ fontSize:28, fontWeight:800, marginBottom:12 }}>Members Only</h2>
          <p style={{ color:'#8b949e', marginBottom:32 }}>Hey <strong style={{ color:'#f0f6fc' }}>{user.username}</strong> — join Ghost of Stocktwits to unlock the full catalyst calendar.</p>
          <a href={invite} target="_blank" rel="noreferrer" style={s.loginBtn}>Join Ghost of Stocktwits →</a>
          <div style={{ marginTop:20 }}><a href="/api/auth/logout" style={{ color:'#6e7681', fontSize:13 }}>← Use a different account</a></div>
        </div>
      </div>
    </>
  )
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s = {
  header: { background:'#0d1117', borderBottom:'1px solid #21262d', position:'sticky', top:0, zIndex:100 },
  headerInner: { maxWidth:1800, margin:'0 auto', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 },
  brand: { display:'flex', alignItems:'center', gap:10 },
  brandName: { fontWeight:800, fontSize:17, color:'#e6edf3' },
  brandSub: { fontSize:11, color:'#8b949e' },
  updateBadge: { fontSize:11, color:'#4ade80', background:'rgba(34,197,94,0.08)', padding:'3px 8px', borderRadius:20, border:'1px solid rgba(34,197,94,0.15)' },
  avatar: { width:28, height:28, borderRadius:'50%', border:'2px solid #30363d' },
  username: { fontSize:13, fontWeight:600, color:'#e6edf3' },
  logoutBtn: { fontSize:12, color:'#8b949e', background:'transparent', border:'1px solid #30363d', padding:'4px 12px', borderRadius:6, cursor:'pointer', textDecoration:'none' },
  main: { maxWidth:1800, margin:'0 auto', padding:'20px' },
  statsRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14},
  statCard: { background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'12px 16px', flex:'1 1 80px', textAlign:'center' },
  starsBar: { background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'8px 14px', marginBottom:12, display:'flex', alignItems:'center', flexWrap:'wrap', gap:6 },
  starChip: { display:'inline-flex', alignItems:'center', gap:3, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', color:'#f59e0b', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:700 },
  chipRemove: { background:'none', border:'none', color:'#f59e0b', cursor:'pointer', fontSize:13, padding:'0 1px', lineHeight:1 },
  tickerInput: { background:'#0d1117', border:'1px solid #6366f1', borderRadius:6, padding:'4px 8px', color:'#e6edf3', fontSize:12, width:70, outline:'none' },
  addBtn: { background:'rgba(99,102,241,0.15)', border:'1px solid #6366f1', color:'#818cf8', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 },
  cancelBtn: { background:'transparent', border:'1px solid #30363d', color:'#6e7681', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer' },
  addStarBtn: { background:'transparent', border:'1px dashed rgba(245,158,11,0.3)', color:'#f59e0b', borderRadius:20, padding:'2px 10px', fontSize:11, cursor:'pointer', fontWeight:600 },
  pastBanner: { background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:8, padding:'8px 14px', marginBottom:12, color:'#818cf8', fontSize:13 },
  backBtn: { background:'none', border:'none', color:'#818cf8', cursor:'pointer', fontSize:13, textDecoration:'underline' },
  filtersRow: { display:'flex', gap:8, marginBottom:10, flexWrap:'wrap', alignItems:'center', width:'100%' },
  searchInput: { background:'#161b22', border:'1px solid #21262d', borderRadius:8, padding:'8px 12px', color:'#e6edf3', fontSize:13, width:'min(240px, 100%)', outline:'none' },
  filterGroup: { display:'flex', gap:5, flexWrap:'wrap' },
  filterBtn: { background:'#161b22', border:'1px solid #21262d', borderRadius:6, padding:'6px 12px', color:'#8b949e', fontSize:12, cursor:'pointer' },
  filterBtnActive: { background:'rgba(99,102,241,0.15)', border:'1px solid #6366f1', borderRadius:6, padding:'6px 12px', color:'#818cf8', fontSize:12, cursor:'pointer', fontWeight:600 },
  dropdown: { position:'absolute', top:'calc(100% + 6px)', left:0, background:'#161b22', border:'1px solid #30363d', borderRadius:10, padding:'8px', minWidth:240, zIndex:200, boxShadow:'0 8px 32px rgba(0,0,0,0.5)' },
  dropHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px 8px', borderBottom:'1px solid #21262d', marginBottom:4 },
  clearBtn: { background:'none', border:'none', color:'#6366f1', fontSize:12, cursor:'pointer', padding:0 },
  dropItem: { display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:6, cursor:'pointer' },
  dropCheck: { width:15, height:15, borderRadius:3, border:'1px solid', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  typeBadge: { display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
  loadingBox: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px', background:'#161b22', borderRadius:12, border:'1px solid #21262d' },
  spinner: { width:36, height:36, border:'3px solid #21262d', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  footer: { marginTop:24, padding:'14px 0', borderTop:'1px solid #21262d', fontSize:11, color:'#8b949e', textAlign:'center', lineHeight:2 },
  landing: { minHeight:'100vh', background:'#0a0c10', display:'flex', flexDirection:'column', alignItems:'center', padding:'0 24px 60px' },
  hero: { textAlign:'center', padding:'80px 0 48px', maxWidth:640 },
  heroTitle: { fontSize:46, fontWeight:900, background:'linear-gradient(135deg, #e6edf3, #818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:16 },
  heroSub: { fontSize:18, fontWeight:600, color:'#e6edf3', marginBottom:12 },
  heroDesc: { fontSize:14, color:'#8b949e', lineHeight:1.7, marginBottom:32 },
  loginBtn: { display:'inline-flex', alignItems:'center', background:'#5865f2', color:'#fff', border:'none', borderRadius:8, padding:'13px 28px', fontSize:15, fontWeight:700, cursor:'pointer', textDecoration:'none' },
  featuresRow: { display:'flex', gap:14, flexWrap:'wrap', maxWidth:900, width:'100%', marginBottom:48, justifyContent:'center' },
  featureCard: { background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:'22px', flex:'1 1 180px', maxWidth:220 },
  th: { padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #21262d', whiteSpace:'nowrap', background:'#0d1117', userSelect:'none' },
  panel: { background:'#0d1117', borderLeft:'1px solid #21262d', position:'sticky', top:0, height:'100vh', overflowY:'auto', display:'flex', flexDirection:'column' },
  panelInner: { display:'flex', flexDirection:'column', height:'100%' },
  panelHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid #21262d', background:'#161b22', position:'sticky', top:0, zIndex:10 },
  sectionTitle: { fontSize:12, fontWeight:700, color:'#8b949e', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 },
}
