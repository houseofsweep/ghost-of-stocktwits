import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { getSession } from '../lib/session'

const WATCHLIST = ['NUVB','IDYA','SPRB','VSTM','RVMD','ATAI','OTLK','AMRZ']
const DISCORD_INVITE = 'https://discord.gg/YOUR_INVITE_LINK' // replace with your invite

// ─── Server-side: load session ────────────────────────────────────────────────
export async function getServerSideProps({ req, res }) {
  const session = await getSession(req, res)
  return { props: { initialUser: session.user || null } }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home({ initialUser }) {
  const [user, setUser]           = useState(initialUser)
  const [catalysts, setCatalysts] = useState([])
  const [loading, setLoading]     = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [search, setSearch]       = useState('')
  const [timeFilter, setTimeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy]       = useState('date')
  const [sortDir, setSortDir]     = useState('asc')
  const [meta, setMeta]           = useState(null)

  // Load catalyst data for members
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

  // Filtered & sorted catalysts
  const filtered = useMemo(() => {
    let list = [...catalysts]

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.ticker?.toLowerCase().includes(q) ||
        c.drug?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.condition?.toLowerCase().includes(q)
      )
    }

    if (timeFilter === 'week')  list = list.filter(c => c.daysOut <= 7)
    if (timeFilter === 'month') list = list.filter(c => c.daysOut <= 30)
    if (timeFilter === '90')    list = list.filter(c => c.daysOut <= 90)

    if (typeFilter !== 'all') list = list.filter(c => c.type === typeFilter)

    list.sort((a, b) => {
      let valA = a[sortBy], valB = b[sortBy]
      if (sortBy === 'date') {
        valA = new Date(valA); valB = new Date(valB)
      } else {
        valA = (valA || '').toString().toLowerCase()
        valB = (valB || '').toString().toLowerCase()
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [catalysts, search, timeFilter, typeFilter, sortBy, sortDir])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  if (!user)           return <LandingPage />
  if (!user.isMember)  return <NotMemberPage user={user} invite={DISCORD_INVITE} />

  return (
    <>
      <Head>
        <title>Ghost of Stocktwits — Biotech Catalyst Calendar</title>
        <meta name="description" content="The most comprehensive biotech catalyst calendar for serious traders." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={styles.app}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <div style={styles.brand}>
              <span style={styles.ghostIcon}>👻</span>
              <div>
                <div style={styles.brandName}>Ghost of Stocktwits</div>
                <div style={styles.brandSub}>Biotech Catalyst Calendar</div>
              </div>
            </div>
            <div style={styles.headerRight}>
              {meta && (
                <div style={styles.updateBadge}>
                  Updated {new Date(meta.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <div style={styles.userInfo}>
                <img src={user.avatar} alt={user.username} style={styles.avatar} />
                <span style={styles.username}>{user.username}</span>
              </div>
              <a href="/api/auth/logout" style={styles.logoutBtn}>Logout</a>
            </div>
          </div>
        </header>

        <main style={styles.main}>
          {/* Stats row */}
          <div style={styles.statsRow}>
            {[
              { label: '🔴 This Week',   count: catalysts.filter(c => c.daysOut <= 7).length,  color: '#ef4444' },
              { label: '🟡 This Month',  count: catalysts.filter(c => c.daysOut <= 30).length, color: '#eab308' },
              { label: '🟢 Next 90 Days',count: catalysts.filter(c => c.daysOut <= 90).length, color: '#22c55e' },
              { label: '⭐ Watchlist',   count: catalysts.filter(c => c.isWatchlist).length,   color: '#f59e0b' },
              { label: '📋 Total',       count: catalysts.length,                               color: '#6366f1' },
            ].map(s => (
              <div key={s.label} style={styles.statCard}>
                <div style={{ ...styles.statCount, color: s.color }}>{s.count}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={styles.filtersRow}>
            <input
              type="text"
              placeholder="🔍  Search ticker, drug, company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.searchInput}
            />
            <div style={styles.filterGroup}>
              {[
                { val: 'all',   label: 'All Time' },
                { val: 'week',  label: 'This Week' },
                { val: 'month', label: 'This Month' },
                { val: '90',    label: '90 Days' },
              ].map(f => (
                <button
                  key={f.val}
                  onClick={() => setTimeFilter(f.val)}
                  style={timeFilter === f.val ? styles.filterBtnActive : styles.filterBtn}
                >{f.label}</button>
              ))}
            </div>
            <div style={styles.filterGroup}>
              {[
                { val: 'all',          label: 'All Types' },
                { val: 'PDUFA',        label: 'PDUFA' },
                { val: 'Trial Readout',label: 'Trial Readouts' },
              ].map(f => (
                <button
                  key={f.val}
                  onClick={() => setTypeFilter(f.val)}
                  style={typeFilter === f.val ? styles.filterBtnActive : styles.filterBtn}
                >{f.label}</button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <div style={styles.resultsLine}>
            {dataLoading
              ? '⏳ Loading catalyst data...'
              : `Showing ${filtered.length} of ${catalysts.length} catalysts`
            }
          </div>

          {/* Table */}
          {dataLoading ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner} />
              <div style={{ color: '#8b949e', marginTop: 16 }}>Fetching catalyst data from ClinicalTrials.gov & BioPharma Catalyst...</div>
            </div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {[
                      { col: null,     label: '' },
                      { col: 'date',   label: 'Date' },
                      { col: 'daysOut',label: 'Days' },
                      { col: 'ticker', label: 'Ticker' },
                      { col: 'drug',   label: 'Drug / Asset' },
                      { col: 'catalyst', label: 'Catalyst' },
                      { col: 'type',   label: 'Type' },
                      { col: 'source', label: 'Source' },
                    ].map(({ col, label }) => (
                      <th
                        key={label}
                        onClick={col ? () => toggleSort(col) : undefined}
                        style={{ ...styles.th, cursor: col ? 'pointer' : 'default' }}
                      >
                        {label}
                        {sortBy === col && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#8b949e' }}>
                        No catalysts found for your current filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c, i) => (
                      <CatalystRow key={`${c.ticker}_${c.date}_${i}`} c={c} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div style={styles.footer}>
            <div>
              Data sources: ClinicalTrials.gov (official API) • BioPharma Catalyst • SEC EDGAR
            </div>
            <div style={{ marginTop: 4, color: '#6e7681' }}>
              ⭐ Gold rows = your Ghost of Stocktwits watchlist picks
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

// ─── Catalyst Table Row ───────────────────────────────────────────────────────
function CatalystRow({ c }) {
  const urgencyColor = c.urgency === 'high' ? '#ef4444' : c.urgency === 'medium' ? '#eab308' : '#22c55e'
  const rowStyle = {
    ...styles.tr,
    background: c.isWatchlist
      ? 'rgba(245, 158, 11, 0.08)'
      : 'transparent',
    borderLeft: c.isWatchlist ? '3px solid #f59e0b' : '3px solid transparent',
  }

  const dateStr = c.date
    ? new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  const nctLink = c.nctId
    ? `https://clinicaltrials.gov/study/${c.nctId}`
    : null

  return (
    <tr style={rowStyle}>
      <td style={styles.td}>
        <span style={{ ...styles.urgencyDot, background: urgencyColor }} title={`${c.daysOut} days out`} />
        {c.isWatchlist && <span style={styles.watchlistStar} title="On your watchlist">⭐</span>}
      </td>
      <td style={{ ...styles.td, whiteSpace: 'nowrap', fontWeight: 500 }}>{dateStr}</td>
      <td style={{ ...styles.td, color: urgencyColor, fontWeight: 700 }}>
        {c.daysOut === 0 ? 'TODAY' : c.daysOut === 1 ? '1d' : `${c.daysOut}d`}
      </td>
      <td style={{ ...styles.td, fontWeight: 700, color: c.isWatchlist ? '#f59e0b' : '#58a6ff' }}>
        {nctLink
          ? <a href={nctLink} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{c.ticker}</a>
          : c.ticker
        }
      </td>
      <td style={{ ...styles.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={c.drug}>
        {c.drug || '—'}
      </td>
      <td style={{ ...styles.td, color: '#8b949e', fontSize: 13 }}>{c.catalyst || '—'}</td>
      <td style={styles.td}>
        <span style={{
          ...styles.typeBadge,
          background: c.type === 'PDUFA' ? 'rgba(99,102,241,0.2)' : 'rgba(34,197,94,0.15)',
          color: c.type === 'PDUFA' ? '#818cf8' : '#4ade80',
        }}>
          {c.type || '—'}
        </span>
      </td>
      <td style={{ ...styles.td, color: '#6e7681', fontSize: 12 }}>{c.source || '—'}</td>
    </tr>
  )
}

// ─── Landing Page (not logged in) ────────────────────────────────────────────
function LandingPage() {
  // Sample blurred preview data
  const sampleRows = [
    { ticker: 'XXXX', drug: '████████', catalyst: 'PDUFA — FDA Action', daysOut: 3,  urgency: 'high' },
    { ticker: 'XXXX', drug: '██████',   catalyst: 'Phase 3 Readout',    daysOut: 8,  urgency: 'medium' },
    { ticker: 'XXXX', drug: '█████████',catalyst: 'PDUFA — NDA',        daysOut: 12, urgency: 'medium' },
    { ticker: 'XXXX', drug: '████████', catalyst: 'Phase 2/3 Results',  daysOut: 21, urgency: 'medium' },
    { ticker: 'XXXX', drug: '██████',   catalyst: 'ADCOM Meeting',      daysOut: 28, urgency: 'medium' },
    { ticker: 'XXXX', drug: '████████', catalyst: 'Phase 3 Readout',    daysOut: 35, urgency: 'low' },
    { ticker: 'XXXX', drug: '███████',  catalyst: 'PDUFA — BLA',        daysOut: 44, urgency: 'low' },
  ]

  return (
    <>
      <Head>
        <title>Ghost of Stocktwits — Biotech Catalyst Calendar</title>
        <meta name="description" content="The most comprehensive biotech catalyst calendar. PDUFA dates, clinical trial readouts, FDA decisions — all in one place." />
      </Head>
      <div style={styles.landing}>
        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.heroGhost}>👻</div>
          <h1 style={styles.heroTitle}>Ghost of Stocktwits</h1>
          <p style={styles.heroSub}>The most comprehensive biotech catalyst calendar for serious traders.</p>
          <p style={styles.heroDesc}>
            PDUFA dates · Clinical trial readouts · FDA decisions · ADCOM meetings<br />
            All in one place. Updated daily. Members only.
          </p>
          <a href="/api/auth/login" style={styles.loginBtn}>
            <svg width="20" height="20" viewBox="0 0 71 55" fill="#fff" style={{ marginRight: 10, flexShrink: 0 }}>
              <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.7a40.8 40.8 0 0 0-1.8 3.7 54 54 0 0 0-16.3 0A39.5 39.5 0 0 0 25.6.7 58.4 58.4 0 0 0 11 4.9C1.6 19.2-.9 33 .3 46.6a59.1 59.1 0 0 0 18 9.1 44.5 44.5 0 0 0 3.8-6.2 38.3 38.3 0 0 1-6-2.9l1.5-1.1a42.1 42.1 0 0 0 36.1 0l1.5 1.1a38.3 38.3 0 0 1-6 2.9 44.1 44.1 0 0 0 3.8 6.2 58.9 58.9 0 0 0 18-9 54 54 0 0 0-9.9-41.7zM23.7 38.2c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2s-2.9 7.2-6.4 7.2zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2s-2.9 7.2-6.4 7.2z"/>
            </svg>
            Login with Discord
          </a>
          <p style={styles.heroSmall}>Members of Ghost of Stocktwits get full access. Not a member?{' '}
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" style={{ color: '#58a6ff' }}>Join here →</a>
          </p>
        </div>

        {/* Blurred preview */}
        <div style={styles.previewWrap}>
          <div style={styles.previewLabel}>
            <span style={{ color: '#f59e0b' }}>⭐</span> Preview — Full calendar unlocked for members
          </div>
          <div style={styles.blurOverlay}>
            <div style={styles.blurCTA}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Members Only</div>
              <div style={{ color: '#8b949e', marginBottom: 20, fontSize: 14 }}>Login with Discord to unlock the full calendar</div>
              <a href="/api/auth/login" style={{ ...styles.loginBtn, fontSize: 14, padding: '10px 24px' }}>
                Unlock Full Calendar
              </a>
            </div>
          </div>
          <table style={{ ...styles.table, filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>
            <thead>
              <tr>
                <th style={styles.th}></th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Days</th>
                <th style={styles.th}>Ticker</th>
                <th style={styles.th}>Drug / Asset</th>
                <th style={styles.th}>Catalyst</th>
                <th style={styles.th}>Type</th>
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((r, i) => {
                const urgencyColor = r.urgency === 'high' ? '#ef4444' : r.urgency === 'medium' ? '#eab308' : '#22c55e'
                return (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}><span style={{ ...styles.urgencyDot, background: urgencyColor }} /></td>
                    <td style={{ ...styles.td, fontWeight: 500 }}>Jun {10 + i * 5}, 2026</td>
                    <td style={{ ...styles.td, color: urgencyColor, fontWeight: 700 }}>{r.daysOut}d</td>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#58a6ff' }}>{r.ticker}</td>
                    <td style={styles.td}>{r.drug}</td>
                    <td style={{ ...styles.td, color: '#8b949e' }}>{r.catalyst}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.typeBadge, background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                        {i % 2 === 0 ? 'PDUFA' : 'Trial Readout'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Features */}
        <div style={styles.featuresRow}>
          {[
            { icon: '📅', title: 'PDUFA Dates', desc: 'Every FDA action date tracked. Know before the decision.' },
            { icon: '🔬', title: 'Trial Readouts', desc: 'Phase 2/3 primary completion dates from ClinicalTrials.gov.' },
            { icon: '⚡', title: 'Real-Time Alerts', desc: 'Discord alerts the moment new catalysts are detected.' },
            { icon: '⭐', title: 'Watchlist Highlights', desc: 'Your key tickers always highlighted at the top.' },
          ].map(f => (
            <div key={f.title} style={styles.featureCard}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 16 }}>{f.title}</div>
              <div style={{ color: '#8b949e', fontSize: 14, lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={styles.landingFooter}>
          © 2026 Ghost of Stocktwits · <a href={DISCORD_INVITE} style={{ color: '#58a6ff' }}>Join Discord</a>
        </div>
      </div>
    </>
  )
}

// ─── Not Member Page ──────────────────────────────────────────────────────────
function NotMemberPage({ user, invite }) {
  return (
    <>
      <Head><title>Ghost of Stocktwits — Join to Access</title></Head>
      <div style={{ ...styles.landing, justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>👻</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>You're not in the server yet</h2>
          <p style={{ color: '#8b949e', marginBottom: 8 }}>
            Hey <strong style={{ color: '#f0f6fc' }}>{user.username}</strong> — you're logged in with Discord but
            you haven't joined the Ghost of Stocktwits server yet.
          </p>
          <p style={{ color: '#8b949e', marginBottom: 32 }}>
            Join the server to unlock the full biotech catalyst calendar and all member features.
          </p>
          <a href={invite} target="_blank" rel="noreferrer" style={styles.loginBtn}>
            Join Ghost of Stocktwits →
          </a>
          <div style={{ marginTop: 20 }}>
            <a href="/api/auth/logout" style={{ color: '#6e7681', fontSize: 13 }}>← Logout and use a different account</a>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  app: {
    minHeight: '100vh',
    background: '#0d1117',
  },
  header: {
    background: '#161b22',
    borderBottom: '1px solid #21262d',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  ghostIcon: { fontSize: 32 },
  brandName: { fontWeight: 800, fontSize: 18, color: '#f0f6fc' },
  brandSub: { fontSize: 12, color: '#8b949e' },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  updateBadge: {
    fontSize: 12,
    color: '#4ade80',
    background: 'rgba(34,197,94,0.1)',
    padding: '4px 10px',
    borderRadius: 20,
    border: '1px solid rgba(34,197,94,0.2)',
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: '50%', border: '2px solid #30363d' },
  username: { fontSize: 14, fontWeight: 600, color: '#f0f6fc' },
  logoutBtn: {
    fontSize: 13,
    color: '#8b949e',
    background: 'transparent',
    border: '1px solid #30363d',
    padding: '5px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  main: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '24px',
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statCard: {
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 10,
    padding: '14px 20px',
    flex: '1 1 120px',
    textAlign: 'center',
  },
  statCount: { fontSize: 28, fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: 12, color: '#8b949e', marginTop: 4 },
  filtersRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchInput: {
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 8,
    padding: '9px 14px',
    color: '#f0f6fc',
    fontSize: 14,
    width: 260,
    transition: 'border-color 0.2s',
  },
  filterGroup: { display: 'flex', gap: 6 },
  filterBtn: {
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 6,
    padding: '7px 14px',
    color: '#8b949e',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterBtnActive: {
    background: 'rgba(99,102,241,0.2)',
    border: '1px solid #6366f1',
    borderRadius: 6,
    padding: '7px 14px',
    color: '#818cf8',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 600,
  },
  resultsLine: {
    fontSize: 13,
    color: '#6e7681',
    marginBottom: 10,
  },
  tableWrap: {
    overflowX: 'auto',
    background: '#161b22',
    borderRadius: 12,
    border: '1px solid #21262d',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 600,
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #21262d',
    whiteSpace: 'nowrap',
    background: '#0d1117',
    userSelect: 'none',
  },
  tr: {
    borderBottom: '1px solid #21262d',
    transition: 'background 0.1s',
  },
  td: {
    padding: '11px 16px',
    verticalAlign: 'middle',
  },
  urgencyDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    marginRight: 4,
  },
  watchlistStar: { fontSize: 12, marginLeft: 2 },
  typeBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  footer: {
    marginTop: 24,
    padding: '16px 0',
    borderTop: '1px solid #21262d',
    fontSize: 12,
    color: '#8b949e',
    textAlign: 'center',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
    background: '#161b22',
    borderRadius: 12,
    border: '1px solid #21262d',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #21262d',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  // Landing page
  landing: {
    minHeight: '100vh',
    background: '#0d1117',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 24px 60px',
  },
  hero: {
    textAlign: 'center',
    padding: '80px 0 48px',
    maxWidth: 640,
  },
  heroGhost: { fontSize: 72, display: 'block', marginBottom: 16 },
  heroTitle: {
    fontSize: 48,
    fontWeight: 900,
    background: 'linear-gradient(135deg, #f0f6fc, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: 16,
  },
  heroSub: {
    fontSize: 20,
    fontWeight: 600,
    color: '#f0f6fc',
    marginBottom: 12,
  },
  heroDesc: {
    fontSize: 15,
    color: '#8b949e',
    lineHeight: 1.7,
    marginBottom: 32,
  },
  loginBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#5865f2',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '14px 32px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
  heroSmall: {
    marginTop: 16,
    fontSize: 13,
    color: '#6e7681',
  },
  previewWrap: {
    width: '100%',
    maxWidth: 1100,
    position: 'relative',
    background: '#161b22',
    borderRadius: 12,
    border: '1px solid #21262d',
    overflow: 'hidden',
    marginBottom: 48,
  },
  previewLabel: {
    padding: '10px 20px',
    fontSize: 13,
    color: '#8b949e',
    borderBottom: '1px solid #21262d',
    background: '#0d1117',
  },
  blurOverlay: {
    position: 'absolute',
    inset: 0,
    top: 40,
    background: 'rgba(13,17,23,0.7)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  blurCTA: {
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 16,
    padding: '32px 48px',
    textAlign: 'center',
  },
  featuresRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    maxWidth: 1100,
    width: '100%',
    marginBottom: 48,
    justifyContent: 'center',
  },
  featureCard: {
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 12,
    padding: '24px',
    flex: '1 1 220px',
    maxWidth: 260,
  },
  landingFooter: {
    fontSize: 13,
    color: '#6e7681',
    textAlign: 'center',
  },
}
