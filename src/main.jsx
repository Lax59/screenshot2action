import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/* ── utils ── */
const cleanText = (s) => s ? s.replace(/[*_`#>]/g, '').trim() : ''

const formatDate = (d) => {
  if (!d) return 'No date set'
  try {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      .format(new Date(`${d}T12:00:00`))
  } catch { return d }
}

const daysLeft = (dateStr) => {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.ceil((new Date(`${dateStr}T00:00:00`) - today) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  return diff
}

const dlClass = (dl) => {
  if (dl === 'overdue') return 'deadline-tag overdue'
  if (dl === 'today' || (typeof dl === 'number' && dl <= 3)) return 'deadline-tag urgent'
  return 'deadline-tag upcoming'
}

const dlLabel = (dl) => {
  if (dl === null) return null
  if (dl === 'overdue') return '⚠ Overdue'
  if (dl === 'today')   return '🔥 Due Today'
  if (typeof dl === 'number') return dl === 1 ? '1 day left' : `${dl} days left`
  return null
}

const getCategoryMeta = (cat) => {
  switch (cat) {
    case 'payment':     return { icon: '₹',  accent: 'orange',  label: 'Payment'     }
    case 'event':       return { icon: '✦',  accent: 'cyan',    label: 'Event'       }
    case 'appointment': return { icon: '📅', accent: 'cyan',    label: 'Appointment' }
    case 'education':   return { icon: '◈',  accent: 'violet',  label: 'Education'   }
    case 'internship':  return { icon: '💼', accent: 'emerald', label: 'Internship'  }
    case 'hackathon':   return { icon: '🚀', accent: 'cyan',    label: 'Hackathon'   }
    default:            return { icon: '📌', accent: 'violet',  label: 'Action'      }
  }
}

const themeColors = [
  { id: 'violet',  label: 'Indigo Violet', bg: '#6d5bd0' },
  { id: 'cyan',    label: 'Ocean Cyan',    bg: '#0284c7' },
  { id: 'emerald', label: 'Emerald',       bg: '#059669' },
  { id: 'amber',   label: 'Amber',         bg: '#d97706' },
  { id: 'rose',    label: 'Rose',          bg: '#e11d48' }
]

const APP_STATUSES = ['Not Applied', 'Applied', 'Interviewing', 'Offer Received', 'Rejected']
const statusClass = (s) => {
  const m = { 'Not Applied': 'not-applied', 'Applied': 'applied', 'Interviewing': 'interviewing', 'Offer Received': 'offer', 'Rejected': 'rejected' }
  return m[s] || 'not-applied'
}

/* ── calendar helpers ── */
const downloadICS = (item) => {
  if (!item.date) return
  const dt = item.date.replace(/-/g, '')
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Screenshot2Action//EN','CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:s2a-${item.id}@s2a`,`DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `SUMMARY:${item.title || 'Action'}`,
    `DESCRIPTION:${(item.description || '').replace(/\n/g,' ')}`,
    'BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY',`DESCRIPTION:Reminder: ${item.title}`,'END:VALARM',
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
  a.download = `${(item.title||'action').replace(/[^a-zA-Z0-9]/g,'-').toLowerCase()}.ics`
  a.click()
}

const openGCal = (item) => {
  if (!item.date) return
  const dt = item.date.replace(/-/g,'')
  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action','TEMPLATE')
  url.searchParams.set('text', item.title || 'Action')
  url.searchParams.set('dates', `${dt}/${dt}`)
  url.searchParams.set('details', item.description || '')
  if (item.location) url.searchParams.set('location', item.location)
  window.open(url.toString(),'_blank')
}

const openUPI = (item) => {
  const note = encodeURIComponent(item.title || 'Payment')
  if (item.upi_id) window.location.href = `upi://pay?pa=${item.upi_id}&pn=S2A&am=${item.amount||''}&tn=${note}`
  else window.open(`https://pay.google.com/gp/p/ui/pay?tn=${note}`,'_blank')
}

/* ── Notification Bell ── */
function NotificationBell({ actions }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const urgent = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    return actions.filter(a => {
      if (!a.date || a.status === 'Completed') return false
      return Math.ceil((new Date(`${a.date}T00:00:00`) - today) / 86400000) <= 3
    }).slice(0, 8)
  }, [actions])

  return (
    <div className="notification-bell" ref={ref}>
      <button className="bell-btn" onClick={() => setOpen(v => !v)} title="Upcoming reminders">
        🔔{urgent.length > 0 && <span className="notification-badge">{urgent.length}</span>}
      </button>
      {open && (
        <div className="notifications-popup">
          <div className="notif-header">
            <b>🔔 Upcoming Reminders</b>
          </div>
          {urgent.length === 0
            ? <div className="notif-empty">You're all caught up ✓</div>
            : <ul className="notif-list">
                {urgent.map(a => {
                  const dl = daysLeft(a.date)
                  return (
                    <li key={a.id} className="notification-item">
                      <span className={dlClass(dl)}>{dlLabel(dl)}</span>
                      <span className="notif-title">{cleanText(a.title)}</span>
                      <span className="notif-date">{formatDate(a.date)}</span>
                    </li>
                  )
                })}
              </ul>
          }
        </div>
      )}
    </div>
  )
}

/* ── AWS Timeline Widget ── */
function AwsTimeline({ timeline }) {
  if (!timeline) return null
  const steps = [
    { label: 'S3 Upload',    ms: timeline.s3_upload_ms,    icon: '☁' },
    { label: 'Bedrock AI',   ms: timeline.ai_inference_ms, icon: '✦' },
  ].filter(s => s.ms > 0)

  return (
    <div className="aws-timeline-widget">
      <div className="aws-timeline-header">
        <span className="aws-badge">⚡ AWS Pipeline</span>
        {timeline.total_ms && <span className="aws-total">{timeline.total_ms}ms total</span>}
        {timeline.engine && <span className="aws-engine">{timeline.engine}</span>}
      </div>
      {steps.length > 0 && (
        <div className="aws-timeline-steps">
          {steps.map((s, i) => (
            <div key={i} className="aws-timeline-step">
              <span className="step-icon">{s.icon}</span>
              <span className="step-label">{s.label}</span>
              <span className="step-ms">{s.ms}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Confidence / Status Bar ── */
function ConfBar({ confidence = 0.85, needsReview }) {
  const isReview = needsReview || (confidence && confidence < 0.6)
  return (
    <div className="confidence-bar-wrap">
      <div className="conf-label">
        {isReview ? (
          <span className="review-badge">⚠ Needs Review</span>
        ) : (
          <span className="extracted-badge">✓ Extracted</span>
        )}
      </div>
      <div className="confidence-bar">
        <div
          className="conf-fill"
          style={{
            width: '100%',
            background: isReview ? '#f59e0b' : '#22c55e'
          }}
        />
      </div>
    </div>
  )
}

/* ── Internship / Hackathon Banner on ActionCard ── */
function InternshipBanner({ item, onStatusChange }) {
  if (item.category !== 'internship' && item.category !== 'hackathon') return null
  const status = item.application_status || 'Not Applied'
  return (
    <div className="internship-banner">
      <div className="internship-chips">
        {item.company  && <span className="internship-chip company">{item.company}</span>}
        {item.role     && <span className="internship-chip role">{item.role}</span>}
        {item.stipend  && <span className="internship-chip stipend">💰 {item.stipend}</span>}
        {item.prize    && <span className="internship-chip stipend">🏆 {item.prize}</span>}
        {item.location && <span className="internship-chip">{item.location}</span>}
      </div>
      {item.apply_url && (
        <a className="card-action-btn apply-btn" href={item.apply_url} target="_blank" rel="noopener noreferrer">
          Apply Now →
        </a>
      )}
      <div className="application-pipeline">
        <div className="pipeline-label">Application Status</div>
        <div className="pipeline-steps">
          {APP_STATUSES.map(s => (
            <button key={s}
              className={`app-status-btn ${statusClass(s)} ${status === s ? 'active' : ''}`}
              onClick={() => onStatusChange?.(s)}>{s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Action Card ── */
function ActionCard({ item, expanded, onToggleStatus, onDelete, onAppStatusChange }) {
  const isPayment    = item.category === 'payment'
  const isInternship = item.category === 'internship' || item.category === 'hackathon'
  const isCompleted  = item.status === 'Completed'
  const dl           = daysLeft(item.date)
  const label        = dlLabel(dl)
  const meta         = getCategoryMeta(item.category)

  return (
    <article className={`action-card ${expanded ? 'expanded' : ''} ${isCompleted ? 'is-completed' : ''} ${isInternship ? 'internship-card' : ''}`}>
      <div className="card-head">
        <span className={`category-icon ${item.accent || meta.accent}`}>{item.icon || meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="category">{meta.label}</span>
          <h3>{cleanText(item.title)}</h3>
        </div>
        <span className={`priority ${item.priority || 'medium'}`}>{item.priority || 'medium'}</span>
      </div>

      {item.description && <p className="description">{cleanText(item.description)}</p>}

      <div className="date-block">
        <span>WHEN</span>
        <b>{formatDate(item.date)}</b>
        {item.time && <small>· {item.time}</small>}
        {label && <span className={dlClass(dl)}>{label}</span>}
      </div>

      <ConfBar confidence={item.confidence} needsReview={item.needs_review} />

      {item.evidence && (
        <details open={expanded}>
          <summary>Extracted evidence <span>⌄</span></summary>
          <p className="evidence-quote">"{cleanText(item.evidence)}"</p>
        </details>
      )}

      <InternshipBanner item={item} onStatusChange={onAppStatusChange} />

      <div className="card-btn-bar">
        {item.date && <button className="card-action-btn" onClick={() => downloadICS(item)}>📅 .ICS</button>}
        {item.date && <button className="card-action-btn" onClick={() => openGCal(item)}>Google Cal</button>}
        {isPayment  && <button className="card-action-btn" onClick={() => openUPI(item)}>💳 Pay</button>}
        {onToggleStatus && (
          <button className="card-action-btn" onClick={onToggleStatus}>
            {isCompleted ? '↩ Undo' : '✓ Done'}
          </button>
        )}
        {onDelete && <button className="card-action-btn delete-btn" onClick={onDelete} title="Delete">✕ Remove</button>}
      </div>
    </article>
  )
}

/* ── Opportunity Card (Kanban View) ── */
const OPP_STATUS_COLORS = {
  'Not Applied':   { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
  'Applied':       { bg: '#e0f2fe', text: '#0369a1', border: '#38bdf8' },
  'Interviewing':  { bg: '#fef3c7', text: '#b45309', border: '#f59e0b' },
  'Offer Received':{ bg: '#dcfce7', text: '#15803d', border: '#22c55e' },
  'Rejected':      { bg: '#ffe4e6', text: '#be123c', border: '#f43f5e' },
}

function OpportunityCard({ item, onStatusChange, onDelete }) {
  const dl    = daysLeft(item.date)
  const label = dlLabel(dl)
  const isHackathon = item.category === 'hackathon'
  const status = item.application_status || 'Not Applied'
  const sc = OPP_STATUS_COLORS[status] || OPP_STATUS_COLORS['Not Applied']

  return (
    <article className="opp-card">
      <div className="opp-card-header">
        <div className="opp-icon-wrap">
          <span className={`category-icon ${isHackathon ? 'cyan' : 'emerald'}`}>
            {isHackathon ? '🚀' : '💼'}
          </span>
          <div>
            <span className="opp-type">{isHackathon ? 'Hackathon' : 'Internship'}</span>
            <h3 className="opp-title">{cleanText(item.title)}</h3>
          </div>
        </div>
        <span className="opp-status-pill" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
          {status}
        </span>
      </div>

      <div className="opp-meta">
        {item.company  && <span className="opp-chip">🏢 {item.company}</span>}
        {item.role     && <span className="opp-chip">👤 {item.role}</span>}
        {item.stipend  && <span className="opp-chip">💰 {item.stipend}</span>}
        {item.prize    && <span className="opp-chip">🏆 {item.prize}</span>}
        {item.location && <span className="opp-chip">📍 {item.location}</span>}
      </div>

      <div className="opp-deadline">
        <span>Deadline:</span>
        <b>{formatDate(item.date)}</b>
        {label && <span className={dlClass(dl)}>{label}</span>}
      </div>

      {item.description && (
        <p className="opp-desc">{cleanText(item.description)}</p>
      )}

      <div className="opp-pipeline">
        {APP_STATUSES.map(s => (
          <button key={s}
            className={`app-status-btn ${statusClass(s)} ${status === s ? 'active' : ''}`}
            onClick={() => onStatusChange?.(s)}
          >{s}</button>
        ))}
      </div>

      <div className="opp-actions">
        {item.apply_url && (
          <a className="card-action-btn apply-btn" href={item.apply_url} target="_blank" rel="noopener noreferrer">
            Apply Now →
          </a>
        )}
        {item.date && <button className="card-action-btn" onClick={() => downloadICS(item)}>📅 .ICS</button>}
        {item.date && <button className="card-action-btn" onClick={() => openGCal(item)}>Google Cal</button>}
        <button className="card-action-btn delete-btn" onClick={onDelete}>✕ Remove</button>
      </div>
    </article>
  )
}

/* ── Universal Manual Add Modal / Form ── */
const DEFAULT_FORM_DATA = {
  title: '',
  category: 'internship',
  company: '',
  role: '',
  stipend: '',
  prize: '',
  date: '',
  apply_url: '',
  description: '',
  location: '',
  amount: '',
  upi_id: '',
  priority: 'high',
  application_status: 'Not Applied'
}

function ManualAddModal({ isOpen, onClose, onSave, initialCategory = 'internship' }) {
  const [data, setData] = useState(() => ({ ...DEFAULT_FORM_DATA, category: initialCategory }))

  useEffect(() => {
    if (isOpen) {
      setData({ ...DEFAULT_FORM_DATA, category: initialCategory })
    }
  }, [isOpen, initialCategory])

  if (!isOpen) return null

  const setField = (k, v) => setData(d => ({ ...d, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!data.title.trim()) return
    const meta = getCategoryMeta(data.category)
    const newItem = {
      id: String(Date.now()),
      ...data,
      icon: meta.icon,
      accent: meta.accent,
      status: 'Upcoming',
      confidence: 1.0,
      needs_review: false,
      actionable: true,
      evidence: `Manually added by user`
    }
    onSave(newItem)
    onClose()
  }

  const isOpp = data.category === 'internship' || data.category === 'hackathon'
  const isPay = data.category === 'payment'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Add New Item</h3>
            <p>Track deadlines, internships, hackathons, or bills</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="manual-form">
          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select value={data.category} onChange={e => setField('category', e.target.value)}>
                <option value="internship">💼 Internship</option>
                <option value="hackathon">🚀 Hackathon</option>
                <option value="education">◈ Education / Assignment</option>
                <option value="payment">₹ Payment / Fee</option>
                <option value="event">✦ Event</option>
                <option value="appointment">📅 Appointment</option>
              </select>
            </div>
            <div className="form-group">
              <label>Deadline Date *</label>
              <input type="date" value={data.date} onChange={e => setField('date', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={data.priority} onChange={e => setField('priority', e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Title / Program Name *</label>
            <input
              placeholder={isOpp ? "e.g. AWS Cloud Engineering Internship 2027" : "e.g. OS Lab Assignment 4"}
              value={data.title}
              onChange={e => setField('title', e.target.value)}
              required
            />
          </div>

          {isOpp && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Company / Organizer</label>
                  <input placeholder="e.g. Amazon AWS" value={data.company} onChange={e => setField('company', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Role / Track</label>
                  <input placeholder="e.g. Cloud Builder Intern" value={data.role} onChange={e => setField('role', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{data.category === 'hackathon' ? 'Prize Pool' : 'Stipend'}</label>
                  <input
                    placeholder={data.category === 'hackathon' ? "e.g. ₹5,00,000" : "e.g. ₹1,10,000 / month"}
                    value={data.category === 'hackathon' ? data.prize : data.stipend}
                    onChange={e => data.category === 'hackathon' ? setField('prize', e.target.value) : setField('stipend', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Application URL</label>
                  <input type="url" placeholder="https://..." value={data.apply_url} onChange={e => setField('apply_url', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Application Stage</label>
                  <select value={data.application_status} onChange={e => setField('application_status', e.target.value)}>
                    {APP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {isPay && (
            <div className="form-row">
              <div className="form-group">
                <label>Amount (₹)</label>
                <input placeholder="e.g. 42000" value={data.amount} onChange={e => setField('amount', e.target.value)} />
              </div>
              <div className="form-group">
                <label>UPI ID</label>
                <input placeholder="e.g. college@sbi" value={data.upi_id} onChange={e => setField('upi_id', e.target.value)} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Description / Notes</label>
            <textarea
              rows={2}
              placeholder="Important notes, links, or submission guidelines..."
              value={data.description}
              onChange={e => setField('description', e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="primary">Save Item →</button>
            <button type="button" className="textbtn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Edit Before Save Form ── */
function EditForm({ data, onChange }) {
  return (
    <div className="edit-form">
      <div className="edit-form-header">✏ Edit before saving</div>
      <div className="edit-fields">
        <div className="edit-field">
          <label>Title</label>
          <input value={data.title || ''} onChange={e => onChange({ ...data, title: e.target.value })} />
        </div>
        <div className="edit-field">
          <label>Description</label>
          <textarea value={data.description || ''} onChange={e => onChange({ ...data, description: e.target.value })} rows={2} />
        </div>
        <div className="edit-row">
          <div className="edit-field">
            <label>Date</label>
            <input type="date" value={data.date || ''} onChange={e => onChange({ ...data, date: e.target.value })} />
          </div>
          <div className="edit-field">
            <label>Category</label>
            <select value={data.category || 'other'} onChange={e => onChange({ ...data, category: e.target.value })}>
              {['education','event','payment','internship','hackathon','appointment','other'].map(c => (
                <option key={c} value={c}>{c[0].toUpperCase()+c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="edit-field">
            <label>Priority</label>
            <select value={data.priority || 'medium'} onChange={e => onChange({ ...data, priority: e.target.value })}>
              {['high','medium','low'].map(p => <option key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── What Can I Extract guide ── */
function ExtractGuide({ open, onToggle }) {
  return (
    <div className="extract-guide-wrap">
      <button className="textbtn extract-guide-toggle" onClick={onToggle}>
        {open ? '▲' : '▼'} What can Screenshot2Action detect?
      </button>
      {open && (
        <div className="extract-guide-grid">
          {[
            { icon: '◈', title: 'Education',   desc: 'Assignments, exams, circulars, timetables' },
            { icon: '💼', title: 'Internships', desc: 'Role, company, stipend, apply links & deadlines' },
            { icon: '🚀', title: 'Hackathons',  desc: 'Registrations, prizes, team size, themes' },
            { icon: '₹',  title: 'Payments',    desc: 'Fees, UPI IDs, amounts, due dates' },
          ].map(c => (
            <div key={c.title} className="extract-guide-card">
              <span className="guide-icon">{c.icon}</span>
              <b>{c.title}</b>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══ Opportunities Tracker Page ═══ */
function OpportunitiesPage({ actions, onStatusChange, onDelete, onOpenAddModal }) {
  const [oppFilter, setOppFilter] = useState('All')
  const [oppSort, setOppSort]     = useState('Soonest')

  const allOpps = useMemo(() =>
    actions.filter(a => a.category === 'internship' || a.category === 'hackathon')
  , [actions])

  const opps = useMemo(() => {
    return [...allOpps]
      .filter(a => {
        if (oppFilter === 'All')         return true
        if (oppFilter === 'Internships') return a.category === 'internship'
        if (oppFilter === 'Hackathons')  return a.category === 'hackathon'
        if (oppFilter === 'Applied')     return ['Applied','Interviewing','Offer Received'].includes(a.application_status)
        if (oppFilter === 'Pending')     return !a.application_status || a.application_status === 'Not Applied'
        return true
      })
      .sort((a, b) => {
        if (oppSort === 'Soonest')  return new Date(a.date || '9999') - new Date(b.date || '9999')
        if (oppSort === 'Newest')   return Number(b.id) - Number(a.id)
        if (oppSort === 'Status') {
          const order = { 'Offer Received': 0, 'Interviewing': 1, 'Applied': 2, 'Not Applied': 3, 'Rejected': 4 }
          return (order[a.application_status] ?? 3) - (order[b.application_status] ?? 3)
        }
        return 0
      })
  }, [allOpps, oppFilter, oppSort])

  const stats = useMemo(() => ({
    total:        allOpps.length,
    notApplied:   allOpps.filter(a => !a.application_status || a.application_status === 'Not Applied').length,
    applied:      allOpps.filter(a => a.application_status === 'Applied').length,
    interviewing: allOpps.filter(a => a.application_status === 'Interviewing').length,
    offers:       allOpps.filter(a => a.application_status === 'Offer Received').length,
    rejected:     allOpps.filter(a => a.application_status === 'Rejected').length,
  }), [allOpps])

  return (
    <section className="opp-page">
      <div className="section-title row">
        <div>
          <span className="kicker">OPPORTUNITIES & APPLICATIONS</span>
          <h2>Opportunities & Hackathons</h2>
          <p>Track internship application deadlines, interview rounds, and hackathon submissions.</p>
        </div>
        <div className="controls" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="primary add-opp-btn-prominent"
            onClick={() => onOpenAddModal('internship')}
          >
            + Add Opportunity
          </button>
          <select value={oppSort} onChange={e => setOppSort(e.target.value)}>
            <option value="Soonest">Soonest</option>
            <option value="Newest">Newest</option>
            <option value="Status">Status</option>
          </select>
        </div>
      </div>

      {/* Kanban pipeline stats */}
      <div className="opp-kanban">
        <div className="opp-stat-card"><span className="osk-num">{stats.total}</span><span className="osk-label">Total</span></div>
        <div className="opp-stat-card pending"><span className="osk-num">{stats.notApplied}</span><span className="osk-label">Not Applied</span></div>
        <div className="opp-stat-card applied"><span className="osk-num">{stats.applied}</span><span className="osk-label">Applied</span></div>
        <div className="opp-stat-card interviewing"><span className="osk-num">{stats.interviewing}</span><span className="osk-label">Interviewing</span></div>
        <div className="opp-stat-card offer"><span className="osk-num">{stats.offers}</span><span className="osk-label">Offer</span></div>
        {stats.rejected > 0 && <div className="opp-stat-card rejected"><span className="osk-num">{stats.rejected}</span><span className="osk-label">Rejected</span></div>}
      </div>

      <div className="filters">
        {['All','Internships','Hackathons','Applied','Pending'].map(x => (
          <button key={x} className={oppFilter === x ? 'selected' : ''} onClick={() => setOppFilter(x)}>{x}</button>
        ))}
      </div>

      {allOpps.length === 0 ? (
        <div className="empty-opp">
          <div className="orbit empty-orbit">💼</div>
          <h3>No opportunities tracked yet</h3>
          <p>Click <strong>+ Add Opportunity</strong> to track one manually, or upload a screenshot of an internship listing or hackathon poster.</p>
          <button className="primary" style={{ marginTop: 14 }} onClick={() => onOpenAddModal('internship')}>
            + Add Your First Opportunity
          </button>
        </div>
      ) : opps.length === 0 ? (
        <div className="empty-opp">
          <div className="orbit empty-orbit">🔍</div>
          <h3>No matches for "{oppFilter}"</h3>
          <p>Try switching to "All" to view all tracked opportunities.</p>
        </div>
      ) : (
        <div className="opp-grid">
          {opps.map(x => (
            <OpportunityCard
              key={x.id}
              item={x}
              onStatusChange={(s) => onStatusChange(x, s)}
              onDelete={() => onDelete(x)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/* ═══ Main App ═══ */
const ALL_FILTERS = ['All', 'Education', 'Internships', 'Hackathons', 'Payments', 'Events']

function App() {
  const [actions, setActions]             = useState([])
  const [actionsLoaded, setActionsLoaded] = useState(false)
  const [file, setFile]                   = useState(null)
  const [previewUrl, setPreviewUrl]       = useState(null)
  const [busy, setBusy]                   = useState(false)
  const [uploadError, setUploadError]     = useState(null)
  const [result, setResult]               = useState(null)
  const [editMode, setEditMode]           = useState(false)
  const [editData, setEditData]           = useState({})
  const [filter, setFilter]               = useState('All')
  const [sort, setSort]                   = useState('Soonest')
  const [page, setPage]                   = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('page')
      return ['home', 'actions', 'opportunities', 'history'].includes(p) ? p : 'home'
    } catch { return 'home' }
  })
  const [storageInfo, setStorageInfo]     = useState('')
  const [theme, setTheme]                 = useState(() => localStorage.getItem('s2a_theme') || 'light')
  const [accent, setAccent]               = useState(() => localStorage.getItem('s2a_accent') || 'violet')
  const [guideOpen, setGuideOpen]         = useState(false)
  const [demoIdx, setDemoIdx]             = useState(0)
  const [modalOpen, setModalOpen]         = useState(false)
  const [modalCategory, setModalCategory] = useState('internship')
  const input = useRef()

  /* theme */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('s2a_theme', theme)
  }, [theme])
  useEffect(() => {
    document.documentElement.setAttribute('data-color', accent)
    localStorage.setItem('s2a_accent', accent)
  }, [accent])

  /* boot: health + load actions */
  useEffect(() => {
    fetch(`${API_URL}/api/health`).then(r=>r.json()).then(d => {
      setAiMode(d.mode || '')
      if (d.storage) setStorageInfo(d.storage)
    }).catch(() => {})

    fetch(`${API_URL}/api/actions`).then(r=>r.json()).then(data => {
      if (Array.isArray(data)) {
        setActions(data.map(item => {
          const meta = getCategoryMeta(item.category)
          return { ...item, icon: item.icon || meta.icon, accent: item.accent || meta.accent }
        }))
      }
      setActionsLoaded(true)
    }).catch(() => setActionsLoaded(true))
  }, [])

  /* stats */
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0,10)
    return {
      total:        actions.length,
      upcoming:     actions.filter(a => a.date && a.date >= today && a.status !== 'Completed').length,
      overdue:      actions.filter(a => a.date && a.date <  today && a.status !== 'Completed').length,
      internships:  actions.filter(a => a.category === 'internship' || a.category === 'hackathon').length,
      completed:    actions.filter(a => a.status === 'Completed').length,
    }
  }, [actions])

  /* file pick */
  const pick = useCallback((f) => {
    if (!f) return
    setUploadError(null)
    if (!['image/png','image/jpeg','image/jpg','image/webp'].includes(f.type)) {
      setUploadError('Please upload a PNG or JPG image.'); return
    }
    if (f.size > 8*1024*1024) { setUploadError('File too large. Max 8 MB.'); return }
    setFile(f); setResult(null); setEditMode(false)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(f))
  }, [previewUrl])

  const removeFile = () => {
    setFile(null); setResult(null); setEditMode(false); setUploadError(null)
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
  }

  /* analyze */
  const analyze = async () => {
    if (!file) return
    setBusy(true); setUploadError(null); setResult(null)
    try {
      const form = new FormData(); form.append('file', file)
      const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Analysis failed.')
      if (data.actionable === false) {
        setResult({ actionable: false, title: data.title || 'No Actionable Content', description: data.description || 'This image has no readable action items.', evidence: data.evidence })
      } else {
        const meta = getCategoryMeta(data.category)
        setResult({ ...data, actionable: true, id: String(Date.now()), icon: meta.icon, accent: meta.accent, status: data.needs_review ? 'Needs Review' : 'Upcoming' })
        setEditData({ title: data.title||'', description: data.description||'', date: data.date||'', category: data.category||'other', priority: data.priority||'medium' })
      }
    } catch(e) {
      setUploadError(e.message || 'Backend unreachable. Make sure the server is running.')
    } finally { setBusy(false) }
  }

  /* save to actions */
  const addAction = async () => {
    if (!result?.actionable) return
    const base = editMode ? { ...result, ...editData, ...getCategoryMeta(editData.category) } : result
    const item = { ...base, id: String(base.id || Date.now()) }
    if (!actions.some(a => a.id === item.id)) {
      setActions(a => [item, ...a])
      try { await fetch(`${API_URL}/api/actions`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(item) }) } catch {}
    }
    const savedCategory = item.category
    setResult(null); setEditMode(false); removeFile()
    if (savedCategory === 'internship' || savedCategory === 'hackathon') {
      navTo('opportunities')
    } else {
      document.getElementById('actions-section')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  /* handle manual add */
  const handleManualAdd = async (newItem) => {
    setActions(a => [newItem, ...a])
    try {
      await fetch(`${API_URL}/api/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      })
    } catch {}
  }

  const openAddModal = (cat = 'internship') => {
    setModalCategory(cat)
    setModalOpen(true)
  }

  /* status toggle */
  const toggleStatus = async (item) => {
    const next = item.status === 'Completed' ? 'Upcoming' : 'Completed'
    setActions(l => l.map(a => a.id===item.id ? {...a, status: next} : a))
    try { await fetch(`${API_URL}/api/actions/${item.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status:next}) }) } catch {}
  }

  /* delete */
  const deleteAction = async (item) => {
    setActions(l => l.filter(a => a.id!==item.id))
    try { await fetch(`${API_URL}/api/actions/${item.id}`, { method:'DELETE' }) } catch {}
  }

  /* app status for opportunities */
  const updateAppStatus = async (item, s) => {
    setActions(l => l.map(a => a.id===item.id ? {...a, application_status:s} : a))
    try { await fetch(`${API_URL}/api/actions/${item.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({application_status:s}) }) } catch {}
  }

  /* filtered actions list */
  const shown = useMemo(() => {
    return [...actions]
      .filter(a => {
        if (page === 'history') return a.status === 'Completed'
        if (filter === 'All')   return a.status !== 'Completed'
        if (filter === 'Education') return a.category === 'education'
        if (filter === 'Internships') return a.category === 'internship'
        if (filter === 'Hackathons') return a.category === 'hackathon'
        if (filter === 'Events')   return a.category === 'event' || a.category === 'appointment'
        if (filter === 'Payments') return a.category === 'payment'
        return true
      })
      .sort((a,b) => {
        if (sort === 'Priority') return a.priority==='high' ? -1 : 1
        if (sort === 'Newest')   return Number(b.id)-Number(a.id)
        return new Date(a.date||'9999-12-31') - new Date(b.date||'9999-12-31')
      })
  }, [actions, filter, sort, page])

  /* demo */
  const loadDemo = () => {
    const demos = ['demo-assignment.png','demo-hackathon.png','demo-internship.png','demo-fee.png']
    const idx = demoIdx % demos.length
    const f = new File(['demo'], demos[idx], { type:'image/png' })
    setDemoIdx(p => p+1)
    setFile(f); setResult(null); setEditMode(false); setUploadError(null)
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
  }

  const navTo = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ── Render ── */
  return (
    <main>
      <div className="ambient a" />
      <div className="ambient b" />

      {/* ── NAV ── */}
      <nav>
        <a className="brand" onClick={() => navTo('home')}>
          <span className="brand-mark">↗</span> Screenshot<span>2</span>Action
        </a>
        <div className="navlinks">
          {[
            { key: 'home',          label: 'Home'          },
            { key: 'actions',       label: 'My Actions'    },
            { key: 'opportunities', label: '💼 Opportunities' },
            { key: 'history',       label: 'History'       },
          ].map(x => (
            <button key={x.key} className={page === x.key ? 'active' : ''} onClick={() => navTo(x.key)}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <div className="color-picker" title="Switch accent color">
            {themeColors.map(c => (
              <button key={c.id}
                className={`color-swatch ${c.id} ${accent === c.id ? 'active' : ''}`}
                style={{ backgroundColor: c.bg }}
                onClick={() => setAccent(c.id)}
                title={c.label}
              />
            ))}
          </div>
          <button className="theme-toggle" onClick={() => setTheme(p => p==='light'?'dark':'light')}>
            <span className="theme-icon">{theme==='light' ? '🌙' : '☀️'}</span>
            <span>{theme==='light' ? 'Night' : 'Day'}</span>
          </button>
          <NotificationBell actions={actions} />
          <div className="mode aws-live" title="AI-Powered Intelligent Parser">
            <i /> ⚡ AI-Powered
          </div>
        </div>
      </nav>

      {/* ── HOME PAGE ── */}
      {page === 'home' && <>
        <section className="hero">
          <div className="eyebrow"><b>✦</b> AI-POWERED SCREENSHOT INTELLIGENCE</div>
          <h1>Turn forgotten screenshots<br />into <em>actions.</em></h1>
          <p>Upload any screenshot — assignment circular, internship listing, hackathon poster, fee notice. AI extracts the key details and tracks everything for you.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => document.getElementById('inbox')?.scrollIntoView({ behavior:'smooth' })}>
              Analyze a screenshot <span>→</span>
            </button>
            <button className="textbtn" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior:'smooth' })}>
              How it works <span>↓</span>
            </button>
          </div>
          <ExtractGuide open={guideOpen} onToggle={() => setGuideOpen(v=>!v)} />
        </section>

        {/* ── AWS Architecture ── */}
        <section id="how" className="architecture-section">
          <div className="section-title arch-section-title">
            <div>
              <span className="kicker">AWS ARCHITECTURE</span>
              <h2>How Screenshot2Action Works</h2>
            </div>
          </div>

          <div className="flow">
            <div>
              <b>01</b>
              <span className="flow-icon">▧</span>
              <h3>Amazon S3</h3>
              <p>Screenshot storage with AES-256 encryption and 30-day lifecycle expiry</p>
            </div>
            <i>→</i>
            <div>
              <b>02</b>
              <span className="flow-icon sparkle">✦</span>
              <h3>Amazon Bedrock – Nova Lite</h3>
              <p>Multimodal vision model extracts dates, deadlines, links, and amounts</p>
            </div>
            <i>→</i>
            <div>
              <b>03</b>
              <span className="flow-icon check">⚡</span>
              <h3>AWS Lambda</h3>
              <p>Serverless compute via Mangum ASGI — zero infrastructure to manage</p>
            </div>
            <i>→</i>
            <div>
              <b>04</b>
              <span className="flow-icon" style={{ background: '#fef3c7', color: '#b45309' }}>🗄️</span>
              <h3>Amazon DynamoDB</h3>
              <p>Pay-per-request NoSQL — stores actions, pipeline state, and deadlines</p>
            </div>
          </div>

          <div className="arch-cards-grid">
            <div className="arch-card">
              <span className="arch-tag s3">Storage</span>
              <h4>Amazon S3</h4>
              <p>Private bucket with strict access policies, AES-256 SSE, and automated 30-day expiry for privacy.</p>
            </div>
            <div className="arch-card">
              <span className="arch-tag bedrock">AI Vision</span>
              <h4>Amazon Bedrock – Nova Lite</h4>
              <p>Foundation model <code>amazon.nova-lite-v1:0</code> parses notices, internship posters, and fee circulars into structured JSON.</p>
            </div>
            <div className="arch-card">
              <span className="arch-tag lambda">Compute</span>
              <h4>AWS Lambda + API Gateway</h4>
              <p>Event-driven serverless compute on Graviton2 (arm64). Scales to zero when idle — pay only for actual usage.</p>
            </div>
            <div className="arch-card">
              <span className="arch-tag dynamodb">Database</span>
              <h4>Amazon DynamoDB</h4>
              <p>PAY_PER_REQUEST billing with TTL, PITR backup, and Global Secondary Index for deadline and pipeline queries.</p>
            </div>
          </div>
        </section>

        {/* ── Action Inbox ── */}
        <section id="inbox" className="inbox">
          <div className="section-title">
            <div>
              <span className="kicker">ACTION INBOX</span>
              <h2>Drop a screenshot, get an action.</h2>
              <p>Upload — AI extracts deadlines, amounts, links, and more.</p>
            </div>
            <div className="stats">
              <div onClick={() => document.getElementById('actions-section')?.scrollIntoView({ behavior:'smooth' })} title="Scroll to actions">
                <strong>{stats.total}</strong><span>Total</span>
              </div>
              <div onClick={() => document.getElementById('actions-section')?.scrollIntoView({ behavior:'smooth' })} title="Scroll to upcoming actions">
                <strong>{stats.upcoming}</strong><span>Upcoming</span>
              </div>
              {stats.overdue > 0 && (
                <div className="stat-danger" onClick={() => document.getElementById('actions-section')?.scrollIntoView({ behavior:'smooth' })} title="Scroll to overdue actions">
                  <strong>{stats.overdue}</strong><span>Overdue</span>
                </div>
              )}
              {stats.internships > 0 && (
                <div onClick={() => navTo('opportunities')} title="Open Opportunities Kanban">
                  <strong>{stats.internships}</strong><span>Opportunities</span>
                </div>
              )}
              <div onClick={() => navTo('history')} title="View History">
                <strong>{stats.completed}</strong><span>Done</span>
              </div>
            </div>
          </div>

          <div className="workspace">
            {/* Upload Panel */}
            <div className="upload-panel">
              {!file ? (
                <div className="drop"
                  onClick={() => input.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]) }}
                >
                  <div className="upload-icon">↑</div>
                  <h3>Drop a screenshot here</h3>
                  <p>or <u>click to browse</u></p>
                  <small>PNG · JPG · WebP · up to 8 MB</small>
                  <input ref={input} type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={e => pick(e.target.files[0])} />
                </div>
              ) : (
                <div className="preview">
                  <div className="preview-top">
                    <span>READY TO ANALYZE</span>
                    <button onClick={removeFile}>×</button>
                  </div>
                  <div className="image-preview-container">
                    {previewUrl
                      ? <img src={previewUrl} alt="preview" />
                      : <div className="image-placeholder"><span>▧</span><p>{file.name}</p></div>
                    }
                  </div>
                  <div className="file-row">
                    <div className="mini-file">▧</div>
                    <div><b>{file.name}</b><small>{Math.ceil(file.size/1024)} KB</small></div>
                    <button onClick={removeFile}>Remove</button>
                  </div>
                  <button className="primary analyze" disabled={busy} onClick={analyze}>
                    {busy ? 'Analyzing…' : 'Analyze screenshot'} <span>→</span>
                  </button>
                  {busy && <div className="loading-status"><span className="spinner" /> Extracting with Amazon Bedrock…</div>}
                </div>
              )}

              {uploadError && (
                <div className="upload-error-strip">
                  ⚠ {uploadError}
                  <button onClick={() => setUploadError(null)}>✕</button>
                </div>
              )}

              <button className="demo" onClick={loadDemo}>
                ✦ Try a demo screenshot <span>cycles through examples →</span>
              </button>
            </div>

            {/* Result Panel */}
            <div className="result-panel">
              {result ? (
                result.actionable ? (
                  <>
                    {result.needs_review && (
                      <div className="review-banner">⚠ Needs Review — please verify details before saving.</div>
                    )}
                    <div className="result-label">
                      <span>✦</span> EXTRACTED <small>review before saving</small>
                    </div>
                    <ActionCard item={editMode ? {...result,...editData,...getCategoryMeta(editData.category)} : result} expanded />
                    {result.aws_timeline && <AwsTimeline timeline={result.aws_timeline} />}
                    <button className="textbtn edit-toggle-btn" onClick={() => setEditMode(v=>!v)}>
                      {editMode ? '▲ Close editor' : '✏ Edit before saving'}
                    </button>
                    {editMode && <EditForm data={editData} onChange={setEditData} />}
                    <div className="result-actions">
                      <button className="primary full" onClick={addAction}>Save to My Actions <span>→</span></button>
                      <button className="textbtn" onClick={() => { setResult(null); removeFile() }}>Discard</button>
                    </div>
                  </>
                ) : (
                  <div className="empty-result no-action-box">
                    <div className="orbit warning-orbit">📷</div>
                    <h3>No Actionable Content</h3>
                    <p>{result.description}</p>
                    <p style={{ fontSize: 12, marginTop: 8 }}>Try uploading a screenshot with text — circulars, notices, event posters, or internship listings work best.</p>
                    <button className="primary" style={{ marginTop: 18 }} onClick={removeFile}>Try Another Screenshot ↑</button>
                  </div>
                )
              ) : (
                <div className="empty-result">
                  <div className="orbit">✦</div>
                  <h3>Your next action is waiting</h3>
                  <p>Upload a screenshot — assignment deadline, internship listing, hackathon poster, or fee notice.</p>
                  <div className="trust">
                    <span>◉ AI-Extracted</span>
                    <span>◉ Deadline Tracked</span>
                    <span>◉ AWS Powered</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </>}

      {/* ── OPPORTUNITIES PAGE ── */}
      {page === 'opportunities' && (
        <div id="page-content" style={{ marginTop: 100 }}>
          <OpportunitiesPage
            actions={actions}
            onStatusChange={updateAppStatus}
            onDelete={deleteAction}
            onOpenAddModal={openAddModal}
          />
        </div>
      )}

      {/* ── MY ACTIONS / HISTORY / HOME DASHBOARD ── */}
      {(page === 'home' || page === 'actions' || page === 'history') && (
        <section id="actions-section" className="actions" style={{ marginTop: page === 'home' ? 60 : 100 }}>
          <div className="section-title row">
            <div>
              <span className="kicker">
                {page === 'history' ? 'COMPLETED HISTORY' : page === 'actions' ? 'SAVED ACTIONS' : 'ACTIVE ACTIONS & OPPORTUNITIES'}
              </span>
              <h2>
                {page === 'history' ? 'Completed actions archive.' : page === 'actions' ? 'Keep momentum.' : 'Tracked from your screenshots'}
              </h2>
            </div>
            <div className="controls" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {page !== 'history' && (
                <>
                  <button className="primary add-opp-btn-prominent" onClick={() => openAddModal('internship')}>
                    + Add Opportunity
                  </button>
                  <button className="primary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={() => openAddModal('education')}>
                    + Add Action
                  </button>
                  {page === 'home' && (
                    <button className="textbtn kanban-link-btn" onClick={() => navTo('opportunities')}>
                      💼 Full Kanban View →
                    </button>
                  )}
                </>
              )}
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="Soonest">Soonest</option>
                <option value="Newest">Newest</option>
                <option value="Priority">Priority</option>
              </select>
            </div>
          </div>

          {page !== 'history' && (
            <div className="filters">
              {ALL_FILTERS.map(x => (
                <button key={x} className={filter===x?'selected':''} onClick={() => setFilter(x)}>{x}</button>
              ))}
            </div>
          )}

          {!actionsLoaded ? (
            <div className="empty-actions loading-actions"><span className="spinner" /> Loading…</div>
          ) : shown.length === 0 ? (
            <div className="empty-actions">
              <div className="empty-dashboard">
                <div className="orbit empty-orbit">▧</div>
                <h3>{page === 'history' ? 'No completed actions yet.' : filter === 'All' ? 'No actions saved yet.' : `No ${filter.toLowerCase()} saved yet.`}</h3>
                <p>{page === 'history' ? 'Mark an action as done to see it here.' : 'Upload a screenshot above or click "+ Add Opportunity" to get started.'}</p>
                {page !== 'history' && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: 14 }}>
                    <button className="primary" onClick={() => openAddModal('internship')}>
                      + Add Opportunity
                    </button>
                    {page !== 'home' && (
                      <button className="textbtn" onClick={() => navTo('home')}>
                        Go to Inbox ↑
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="cards">
              {shown.map(x => (
                <ActionCard
                  key={x.id}
                  item={x}
                  onToggleStatus={() => toggleStatus(x)}
                  onDelete={() => deleteAction(x)}
                  onAppStatusChange={s => updateAppStatus(x, s)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── UNIVERSAL MANUAL ADD MODAL ── */}
      <ManualAddModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleManualAdd}
        initialCategory={modalCategory}
      />

      <footer>
        <span className="brand" onClick={() => navTo('home')}>
          <span className="brand-mark">↗</span> Screenshot2Action
        </span>
        <p>Powered by <b>Amazon Bedrock</b> · <b>Amazon DynamoDB</b> · <b>Amazon S3</b> · <b>AWS Lambda</b></p>
      </footer>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
