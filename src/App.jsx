import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabaseClient'

const PROJECT_COLORS = ['#6c5ce7', '#e17055', '#00b894', '#0984e3', '#fdcb6e', '#a29bfe', '#fd79a8']

function getUsedHours(project) {
  return project.logs.reduce((sum, l) => sum + l.hours, 0)
}

function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TopNav({ onNavigate, currentView }) {
  return (
    <div className="bg-[#1e1e1e] border-b border-[#2a2a2a] flex h-16 items-center justify-between px-10 shrink-0">
      <div className="flex gap-2.5 items-center cursor-pointer" onClick={() => onNavigate('dashboard')}>
        <img src={`${import.meta.env.BASE_URL}tally-logo.svg`} alt="tally logo" className="w-7 h-7" />
        <span className="font-bold text-xl text-white/90">tally</span>
      </div>
      <div className="flex gap-6 items-center">
        <span className={`text-sm cursor-pointer ${currentView === 'dashboard' ? 'font-semibold text-white/85' : 'text-white/45 hover:text-white/65'}`} onClick={() => onNavigate('dashboard')}>Dashboard</span>
        <span className="text-sm text-white/45">Reports</span>
        <span className="text-sm text-white/45">Settings</span>
        <div className="w-8 h-8 rounded-full bg-[#2a2a2a]" />
      </div>
    </div>
  )
}

function StatCard({ value, label, color }) {
  return (
    <div className="bg-[#1e1e1e] border border-[#2a2a2a] flex-1 flex flex-col gap-1 px-6 py-5 rounded-[10px]">
      <span className="font-bold text-[28px] text-white/90">{value}</span>
      <span className="font-semibold text-[11px] text-white/35 tracking-[1px]">{label}</span>
      <div className="h-[3px] w-10 rounded-sm" style={{ background: color }} />
    </div>
  )
}

function ProjectRow({ project, onView, onEdit, onDelete }) {
  const used = getUsedHours(project)
  const pct = project.budget > 0 ? Math.round((used / project.budget) * 100) : 0
  const barWidth = Math.min(pct, 100)
  return (
    <div className="bg-[#1e1e1e] border border-[#2a2a2a] flex gap-4 items-center px-5 py-4 rounded-lg w-full">
      <div className="flex-1 flex gap-3 items-center min-w-0">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: project.color }} />
        <span className="font-medium text-sm text-white/85 truncate">{project.name}</span>
      </div>
      <div className="w-16 shrink-0 text-sm text-white/50">{project.budget}h</div>
      <div className="w-16 shrink-0 text-sm text-white/50">{Math.max(0, project.budget - used)}h</div>
      <div className="flex gap-3 items-center w-52 shrink-0">
        <div className="bg-[#2a2a2a] h-1.5 rounded-full flex-1 overflow-hidden">
          <div className="h-1.5 rounded-full transition-all duration-300" style={{ background: project.color, width: `${barWidth}%` }} />
        </div>
        <span className="font-medium text-xs text-white/45 w-8">{pct}%</span>
      </div>
      <div className="flex gap-1.5 items-center w-[120px] shrink-0">
        <button onClick={() => onView(project)} className="bg-[#2a2a2a] hover:bg-[#333] px-2.5 py-1.5 rounded-md text-xs font-medium text-white/60 cursor-pointer transition-colors">View</button>
        <button onClick={() => onEdit(project)} className="bg-[#2a2a2a] hover:bg-[#333] px-2.5 py-1.5 rounded-md text-xs font-medium text-white/60 cursor-pointer transition-colors">&#9998;</button>
        <button onClick={() => onDelete(project)} className="bg-[#2a2a2a] hover:bg-[#333] px-2.5 py-1.5 rounded-md text-xs font-medium text-white/40 cursor-pointer transition-colors">&#10005;</button>
      </div>
    </div>
  )
}

function ProjectModal({ project, onSave, onClose }) {
  const [name, setName] = useState(project?.name || '')
  const [budget, setBudget] = useState(project?.budget?.toString() || '')
  const [description, setDescription] = useState(project?.description || '')
  const [color, setColor] = useState(project?.color || PROJECT_COLORS[0])
  const isEdit = !!project

  const handleSubmit = () => {
    if (!name.trim() || !budget) return
    onSave({ name: name.trim(), budget: parseFloat(budget), description, color })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1e1e1e] border border-[#2a2a2a] rounded-[14px] shadow-[0px_8px_40px_rgba(0,0,0,0.4)] w-[520px] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 h-[72px]">
          <span className="font-semibold text-lg text-white/90">{isEdit ? 'Edit Project' : 'Create New Project'}</span>
          <button onClick={onClose} className="bg-[#2a2a2a] hover:bg-[#333] w-8 h-8 rounded-md flex items-center justify-center text-white/50 cursor-pointer transition-colors">&#10005;</button>
        </div>
        <div className="h-px bg-[#2a2a2a]" />
        <div className="flex-1 flex flex-col gap-6 px-8 py-7">
          <div className="flex flex-col gap-2">
            <label className="font-medium text-[13px] text-white/60">Project Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Website Redesign" className="bg-[#141414] border border-[#333] rounded-lg px-3.5 py-3 text-sm text-white/90 placeholder:text-white/25 outline-none focus:border-[#6c5ce7] transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-medium text-[13px] text-white/60">Time Budget (hours)</label>
            <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 80" className="bg-[#141414] border border-[#333] rounded-lg px-3.5 py-3 text-sm text-white/90 placeholder:text-white/25 outline-none focus:border-[#6c5ce7] transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-medium text-[13px] text-white/60">
              Description <span className="font-normal text-white/25">(optional)</span>
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the project..." rows={3} className="bg-[#141414] border border-[#333] rounded-lg px-3.5 py-3 text-sm text-white/90 placeholder:text-white/25 outline-none focus:border-[#6c5ce7] resize-none transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-medium text-[13px] text-white/60">Project Color</label>
            <div className="flex gap-3">
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110" style={{ background: c, border: color === c ? '2px solid white' : '2px solid transparent' }} />
              ))}
            </div>
          </div>
        </div>
        <div className="h-px bg-[#2a2a2a]" />
        <div className="flex gap-3 items-center justify-end px-8 py-5 h-[68px]">
          <button onClick={onClose} className="bg-[#2a2a2a] hover:bg-[#333] px-5 py-2.5 rounded-lg text-sm font-medium text-white/60 cursor-pointer transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="bg-[#6c5ce7] hover:bg-[#5b4bd6] px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition-colors">{isEdit ? 'Save Changes' : 'Create Project'}</button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ project, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1e1e1e] border border-[#2a2a2a] rounded-[14px] shadow-[0px_8px_40px_rgba(0,0,0,0.4)] w-[440px] flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 items-center pt-9 pb-7 px-9">
          <div className="w-12 h-12 rounded-full bg-[#e17055]/15 flex items-center justify-center">
            <span className="font-bold text-[22px] text-[#e17055]">!</span>
          </div>
          <span className="font-semibold text-lg text-white/90">Delete Project</span>
          <div className="text-sm text-white/45 text-center leading-[22px]">
            <p>Are you sure you want to delete &quot;{project.name}&quot;?</p>
            <p>This will permanently remove all time logs and data.</p>
            <p>This action cannot be undone.</p>
          </div>
        </div>
        <div className="h-px bg-[#2a2a2a]" />
        <div className="flex gap-3 items-center justify-end px-8 py-5 h-[68px]">
          <button onClick={onClose} className="bg-[#2a2a2a] hover:bg-[#333] px-6 py-2.5 rounded-lg text-sm font-medium text-white/60 cursor-pointer transition-colors">Cancel</button>
          <button onClick={onConfirm} className="bg-[#e17055] hover:bg-[#d45f43] px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition-colors">Delete Project</button>
        </div>
      </div>
    </div>
  )
}

function ProjectDetail({ project, onBack, onEdit, onDelete, onUpdateProject }) {
  const used = getUsedHours(project)
  const pct = project.budget > 0 ? Math.round((used / project.budget) * 100) : 0
  const remaining = Math.max(0, project.budget - used)

  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const intervalRef = useRef(null)

  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [entryHours, setEntryHours] = useState('')
  const [entryNote, setEntryNote] = useState('')

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [timerRunning])

  const handleStopTimer = async () => {
    setTimerRunning(false)
    if (timerSeconds > 0) {
      const hours = Math.round((timerSeconds / 3600) * 10) / 10
      if (hours > 0) {
        const { data: row, error } = await supabase
          .from('time_logs')
          .insert({ project_id: project.id, date: new Date().toISOString().slice(0, 10), hours, note: 'Timer session', from_timer: true })
          .select()
          .single()
        if (!error) {
          const newLog = { id: row.id, date: row.date, hours: Number(row.hours), note: row.note, fromTimer: row.from_timer }
          onUpdateProject({ ...project, logs: [newLog, ...project.logs] })
        }
      }
      setTimerSeconds(0)
    }
  }

  const handleAddEntry = async () => {
    if (!entryHours || parseFloat(entryHours) <= 0) return
    const { data: row, error } = await supabase
      .from('time_logs')
      .insert({ project_id: project.id, date: entryDate, hours: parseFloat(entryHours), note: entryNote || 'Manual entry', from_timer: false })
      .select()
      .single()
    if (!error) {
      const newLog = { id: row.id, date: row.date, hours: Number(row.hours), note: row.note, fromTimer: row.from_timer }
      onUpdateProject({ ...project, logs: [newLog, ...project.logs] })
      setEntryHours('')
      setEntryNote('')
    }
  }

  const handleDeleteLog = async (logId) => {
    const { error } = await supabase.from('time_logs').delete().eq('id', logId)
    if (!error) {
      onUpdateProject({ ...project, logs: project.logs.filter(l => l.id !== logId) })
    }
  }

  return (
    <div className="flex-1 flex flex-col gap-7 px-10 pt-8 pb-10 overflow-auto">
      <div className="flex gap-2 items-center text-[13px]">
        <span className="font-medium text-[#6c5ce7]/80 cursor-pointer hover:text-[#6c5ce7]" onClick={onBack}>Projects</span>
        <span className="text-white/25">/</span>
        <span className="font-medium text-white/50">{project.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-3.5 items-center">
          <div className="w-3.5 h-3.5 rounded-full" style={{ background: project.color }} />
          <span className="font-bold text-[26px] text-white/90">{project.name}</span>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => onEdit(project)} className="bg-[#2a2a2a] hover:bg-[#333] px-4 py-2.5 rounded-lg text-[13px] font-medium text-white/60 cursor-pointer transition-colors">Edit Project</button>
          <button onClick={() => onDelete(project)} className="bg-[#2a2a2a] hover:bg-[#333] px-4 py-2.5 rounded-lg text-[13px] font-medium text-[#e17055]/80 cursor-pointer transition-colors">Delete</button>
        </div>
      </div>

      <div className="flex gap-5">
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] flex-1 flex flex-col gap-5 px-7 py-6 rounded-[10px]">
          <span className="font-semibold text-[15px] text-white/75">Project Overview</span>
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-white/70">{used}h used</span>
              <span className="text-white/35">{project.budget}h budget</span>
            </div>
            <div className="bg-[#2a2a2a] h-2.5 rounded-full overflow-hidden">
              <div className="h-2.5 rounded-full transition-all duration-500" style={{ background: '#6c5ce7', width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[#6c5ce7]/80">{pct}% complete</span>
              <span className="text-white/30">{remaining}h remaining</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1e1e1e] border border-[#2a2a2a] flex flex-col gap-5 items-center justify-center px-8 py-7 rounded-[10px] w-[340px] h-[200px]">
          <span className="font-semibold text-[11px] text-[#00b894]/70 tracking-[1.5px]">
            {timerRunning ? 'ACTIVE TIMER' : 'TIMER'}
          </span>
          <span className="font-bold text-[42px] text-white/90 tabular-nums">{formatTime(timerSeconds)}</span>
          <div className="flex gap-3">
            {timerRunning ? (
              <button onClick={handleStopTimer} className="bg-[#e17055] hover:bg-[#d45f43] px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition-colors">Stop</button>
            ) : (
              <button onClick={() => setTimerRunning(true)} className="bg-[#00b894] hover:bg-[#00a381] px-6 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition-colors">Start</button>
            )}
            <button onClick={() => { setTimerRunning(false); setTimerSeconds(0) }} className="bg-[#2a2a2a] hover:bg-[#333] px-5 py-2.5 rounded-lg text-sm font-medium text-white/50 cursor-pointer transition-colors">Reset</button>
          </div>
        </div>
      </div>

      <div className="flex gap-5">
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] flex flex-col gap-5 px-7 py-6 rounded-[10px] w-[340px]">
          <span className="font-semibold text-[15px] text-white/75">Add Manual Entry</span>
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-xs text-white/50">Date</label>
            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="bg-[#141414] border border-[#333] rounded-[7px] px-3 py-2.5 text-[13px] text-white/60 outline-none focus:border-[#6c5ce7] transition-colors [color-scheme:dark]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-xs text-white/50">Hours</label>
            <input type="number" step="0.5" value={entryHours} onChange={e => setEntryHours(e.target.value)} placeholder="e.g. 2.5" className="bg-[#141414] border border-[#333] rounded-[7px] px-3 py-2.5 text-[13px] text-white/90 placeholder:text-white/25 outline-none focus:border-[#6c5ce7] transition-colors" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-xs text-white/50">Note</label>
            <input value={entryNote} onChange={e => setEntryNote(e.target.value)} placeholder="What did you work on?" className="bg-[#141414] border border-[#333] rounded-[7px] px-3 py-2.5 text-[13px] text-white/90 placeholder:text-white/25 outline-none focus:border-[#6c5ce7] transition-colors" />
          </div>
          <button onClick={handleAddEntry} className="bg-[#6c5ce7] hover:bg-[#5b4bd6] px-5 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer w-full transition-colors">Add Entry</button>
        </div>

        <div className="bg-[#1e1e1e] border border-[#2a2a2a] flex-1 flex flex-col rounded-[10px] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <span className="font-semibold text-[15px] text-white/75">Time Logs</span>
            <span className="font-medium text-[13px] text-white/40">Total: {used}h</span>
          </div>
          <div className="bg-[#161616] flex items-center px-6 py-2.5">
            <span className="flex-1 font-semibold text-[10px] text-white/30 tracking-[1px]">DATE</span>
            <span className="w-20 font-semibold text-[10px] text-white/30 tracking-[1px]">HOURS</span>
            <span className="w-[260px] font-semibold text-[10px] text-white/30 tracking-[1px]">NOTE</span>
            <span className="w-[60px]" />
          </div>
          <div className="flex-1 overflow-auto">
            {project.logs.map(log => (
              <div key={log.id} className="flex items-center px-6 py-3.5 border-b border-[#2a2a2a] last:border-b-0">
                <div className="flex-1 flex gap-2 items-center">
                  <span className="text-[13px] text-white/60">{formatDate(log.date)}</span>
                  {log.fromTimer && (
                    <span className="bg-[#00b894]/15 px-1.5 py-0.5 rounded text-[10px] font-medium text-[#00b894]/80">timer</span>
                  )}
                </div>
                <span className="w-20 text-[13px] font-medium text-white/70">{log.hours}h</span>
                <span className="w-[260px] text-[13px] text-white/40 truncate">{log.note}</span>
                <div className="w-[60px] flex justify-end">
                  <button onClick={() => handleDeleteLog(log.id)} className="text-xs text-white/20 hover:text-white/50 cursor-pointer transition-colors">&#10005;</button>
                </div>
              </div>
            ))}
            {project.logs.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-white/30">No time logs yet. Start a timer or add a manual entry.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getDateRange(period) {
  const now = new Date()
  let start, end
  if (period === 'week') {
    const day = now.getDay()
    start = new Date(now)
    start.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    end = new Date(start)
    end.setDate(start.getDate() + 6)
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  } else {
    start = new Date(now.getFullYear(), 0, 1)
    end = new Date(now.getFullYear(), 11, 31)
  }
  return { start, end }
}

function formatDateRange(period) {
  const { start, end } = getDateRange(period)
  const opts = { month: 'short', day: 'numeric' }
  const startStr = start.toLocaleDateString('en-US', opts)
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${startStr} – ${endStr}`
}

function getHoursInPeriod(project, period) {
  const { start, end } = getDateRange(period)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  return project.logs
    .filter(l => l.date >= startStr && l.date <= endStr)
    .reduce((sum, l) => sum + l.hours, 0)
}

function PeriodToggle({ period, onChangePeriod }) {
  const periods = ['week', 'month', 'year']
  const labels = { week: 'Week', month: 'Month', year: 'Year' }
  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-3 items-center">
        <span className="text-[13px] text-white/35">Showing metrics for</span>
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] flex rounded-lg p-1">
          {periods.map(p => (
            <button
              key={p}
              onClick={() => onChangePeriod(p)}
              className={`px-4 py-1.5 rounded-md text-[13px] font-semibold cursor-pointer transition-colors ${
                period === p
                  ? 'bg-[#6c5ce7] text-white/95'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {labels[p]}
            </button>
          ))}
        </div>
      </div>
      <span className="text-[13px] font-medium text-white/30">{formatDateRange(period)}</span>
    </div>
  )
}

function Dashboard({ projects, onView, onEdit, onDelete, onNew }) {
  const [period, setPeriod] = useState('month')
  const totalUsed = projects.reduce((sum, p) => sum + getUsedHours(p), 0)
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0)
  const periodHours = projects.reduce((sum, p) => sum + getHoursInPeriod(p, period), 0)
  const periodLabel = { week: 'HOURS THIS WEEK', month: 'HOURS THIS MONTH', year: 'HOURS THIS YEAR' }

  return (
    <div className="flex-1 flex flex-col gap-7 px-10 py-10 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-[28px] text-white/90">Projects</span>
          <span className="text-sm text-white/40">Track time across all your projects</span>
        </div>
        <button onClick={onNew} className="bg-[#6c5ce7] hover:bg-[#5b4bd6] flex gap-2 items-center pl-4 pr-5 py-2.5 rounded-lg text-white cursor-pointer transition-colors">
          <span className="font-medium text-lg">+</span>
          <span className="font-semibold text-sm">New Project</span>
        </button>
      </div>

      <PeriodToggle period={period} onChangePeriod={setPeriod} />

      <div className="flex gap-4">
        <StatCard value={projects.length} label="TOTAL PROJECTS" color="#6c5ce7" />
        <StatCard value={periodHours} label={periodLabel[period]} color="#00b894" />
        <StatCard value={totalBudget} label="HOURS BUDGETED" color="#fdcb6e" />
        <StatCard value={0} label="ACTIVE TIMERS" color="#e17055" />
      </div>

      <div className="flex gap-4 items-center px-5 py-2">
        <span className="flex-1 min-w-0 font-semibold text-[11px] text-white/30 tracking-[1px]">PROJECT</span>
        <span className="w-16 shrink-0 font-semibold text-[11px] text-white/30 tracking-[1px]">BUDGET</span>
        <span className="w-16 shrink-0 font-semibold text-[11px] text-white/30 tracking-[1px]">LEFT</span>
        <span className="w-52 shrink-0 font-semibold text-[11px] text-white/30 tracking-[1px]">PROGRESS</span>
        <span className="w-[120px] shrink-0 font-semibold text-[11px] text-white/30 tracking-[1px]">ACTIONS</span>
      </div>

      <div className="flex flex-col gap-1">
        {projects.map(p => (
          <ProjectRow key={p.id} project={p} onView={onView} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {projects.length === 0 && (
          <div className="text-center py-16 text-white/30 text-sm">No projects yet. Create your first project to get started.</div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('dashboard')
  const [selectedProject, setSelectedProject] = useState(null)
  const [modal, setModal] = useState(null)
  const [modalProject, setModalProject] = useState(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    const { data: projectRows, error: pErr } = await supabase
      .from('projects')
      .select('*')
      .order('id')

    if (pErr) { console.error(pErr); setLoading(false); return }

    const { data: logRows, error: lErr } = await supabase
      .from('time_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (lErr) { console.error(lErr); setLoading(false); return }

    const logsByProject = {}
    for (const log of logRows) {
      const mapped = { id: log.id, date: log.date, hours: Number(log.hours), note: log.note, fromTimer: log.from_timer }
      ;(logsByProject[log.project_id] ||= []).push(mapped)
    }

    const merged = projectRows.map(p => ({
      id: p.id,
      name: p.name,
      budget: Number(p.budget),
      color: p.color,
      description: p.description,
      logs: logsByProject[p.id] || [],
    }))

    setProjects(merged)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleView = useCallback((p) => {
    setSelectedProject(p)
    setView('detail')
  }, [])

  const handleEdit = useCallback((p) => {
    setModalProject(p)
    setModal('edit')
  }, [])

  const handleDelete = useCallback((p) => {
    setModalProject(p)
    setModal('delete')
  }, [])

  const handleNew = useCallback(() => {
    setModalProject(null)
    setModal('create')
  }, [])

  const handleSave = useCallback(async (data) => {
    if (modal === 'create') {
      const { data: row, error } = await supabase
        .from('projects')
        .insert({ name: data.name, budget: data.budget, description: data.description, color: data.color })
        .select()
        .single()
      if (!error) {
        const newProject = { id: row.id, name: row.name, budget: Number(row.budget), color: row.color, description: row.description, logs: [] }
        setProjects(prev => [...prev, newProject])
      }
    } else if (modal === 'edit' && modalProject) {
      const { error } = await supabase
        .from('projects')
        .update({ name: data.name, budget: data.budget, description: data.description, color: data.color })
        .eq('id', modalProject.id)
      if (!error) {
        setProjects(prev => prev.map(p => p.id === modalProject.id ? { ...p, ...data } : p))
        if (selectedProject?.id === modalProject.id) {
          setSelectedProject(prev => prev ? { ...prev, ...data } : prev)
        }
      }
    }
    setModal(null)
    setModalProject(null)
  }, [modal, modalProject, selectedProject])

  const handleConfirmDelete = useCallback(async () => {
    if (modalProject) {
      const { error } = await supabase.from('projects').delete().eq('id', modalProject.id)
      if (!error) {
        setProjects(prev => prev.filter(p => p.id !== modalProject.id))
        if (selectedProject?.id === modalProject.id) {
          setView('dashboard')
          setSelectedProject(null)
        }
      }
    }
    setModal(null)
    setModalProject(null)
  }, [modalProject, selectedProject])

  const handleUpdateProject = useCallback((updated) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    setSelectedProject(updated)
  }, [])

  const currentProject = selectedProject ? projects.find(p => p.id === selectedProject.id) || selectedProject : null

  return (
    <div className="bg-[#191919] flex flex-col min-h-screen max-w-[1440px] mx-auto w-full">
      <TopNav onNavigate={(v) => { setView(v); if (v === 'dashboard') setSelectedProject(null) }} currentView={view} />

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-white/40 text-sm">Loading...</div>
      ) : view === 'dashboard' ? (
        <Dashboard projects={projects} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} onNew={handleNew} />
      ) : (
        currentProject && (
          <ProjectDetail
            project={currentProject}
            onBack={() => { setView('dashboard'); setSelectedProject(null) }}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpdateProject={handleUpdateProject}
          />
        )
      )}

      {(modal === 'create' || modal === 'edit') && (
        <ProjectModal
          project={modal === 'edit' ? modalProject : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setModalProject(null) }}
        />
      )}

      {modal === 'delete' && modalProject && (
        <DeleteModal
          project={modalProject}
          onConfirm={handleConfirmDelete}
          onClose={() => { setModal(null); setModalProject(null) }}
        />
      )}
    </div>
  )
}
