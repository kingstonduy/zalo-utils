import { useState, useEffect, useCallback, useRef, memo } from 'react'
import './TimePage.css'

const ITEM_HEIGHT = 48

const ScrollRoller = memo(function ScrollRoller({ label, value, min, max, onChange }) {
  const viewportRef = useRef(null)
  const dragState = useRef({ dragging: false, startY: 0, accumulated: 0 })
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const count = max - min + 1

  const wrap = useCallback((v) => ((v - min) % count + count) % count + min, [min, count])

  const displayItems = [-2, -1, 0, 1, 2].map(d => wrap(value + d))

  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    dragState.current = { dragging: true, startY: e.clientY, accumulated: 0 }
    setIsDragging(true)
    viewportRef.current?.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!dragState.current.dragging) return
    const dy = e.clientY - dragState.current.startY
    dragState.current.startY = e.clientY
    dragState.current.accumulated += dy

    while (dragState.current.accumulated >= ITEM_HEIGHT) {
      dragState.current.accumulated -= ITEM_HEIGHT
      onChange(prev => wrap(prev - 1))
    }
    while (dragState.current.accumulated <= -ITEM_HEIGHT) {
      dragState.current.accumulated += ITEM_HEIGHT
      onChange(prev => wrap(prev + 1))
    }

    setOffset(dragState.current.accumulated)
  }, [onChange, wrap])

  const onPointerUp = useCallback((e) => {
    dragState.current.dragging = false
    dragState.current.accumulated = 0
    setIsDragging(false)
    viewportRef.current?.releasePointerCapture(e.pointerId)
    setOffset(0)
  }, [])

  const handleInputCommit = useCallback(() => {
    const num = parseInt(editValue, 10)
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)))
    }
    setEditing(false)
  }, [editValue, min, max, onChange])

  const baseTranslate = -ITEM_HEIGHT
  const translateY = baseTranslate + offset

  return (
    <div className="scroll-roller">
      <span className="roller-label">{label}</span>
      <input
        className="roller-input"
        type="number"
        min={min}
        max={max}
        value={editing ? editValue : String(value).padStart(2, '0')}
        onFocus={() => { setEditing(true); setEditValue(String(value)) }}
        onBlur={handleInputCommit}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { handleInputCommit(); e.target.blur() } }}
      />
      <div
        className="roller-viewport"
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="roller-track"
          style={{
            transform: `translateY(${translateY}px)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {displayItems.map((v, i) => (
            <div key={i} className={`roller-item ${i === 2 ? 'active' : ''}`}>
              {String(v).padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

function TimePage() {
  const [millis, setMillis] = useState(() => Date.now())
  const [convertMillis, setConvertMillis] = useState('')
  const [convertResult, setConvertResult] = useState(null)

  const [dateTextInput, setDateTextInput] = useState('')
  const [dateTextResult, setDateTextResult] = useState(null)

  const [calendarDate, setCalendarDate] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
  })
  const [pickerHour, setPickerHour] = useState(() => new Date().getHours())
  const [pickerMinute, setPickerMinute] = useState(() => new Date().getMinutes())
  const [pickerSecond, setPickerSecond] = useState(() => new Date().getSeconds())
  const [pickerResult, setPickerResult] = useState(null)

  // Update every 200ms instead of 50ms — 5x less renders, still looks real-time
  useEffect(() => {
    const timer = setInterval(() => setMillis(Date.now()), 200)
    return () => clearInterval(timer)
  }, [])

  const handleMillisConvert = useCallback(() => {
    const ms = parseInt(convertMillis, 10)
    if (isNaN(ms)) {
      setConvertResult({ error: 'Invalid milliseconds value' })
      return
    }
    const d = new Date(ms)
    setConvertResult({ utc: d.toUTCString(), local: d.toString() })
  }, [convertMillis])

  const handleDateTextConvert = useCallback(() => {
    const d = new Date(dateTextInput)
    if (isNaN(d.getTime())) {
      setDateTextResult({ error: 'Invalid date format. Try YYYY-MM-DD HH:MM:SS' })
      return
    }
    setDateTextResult({
      millis: d.getTime(),
      seconds: Math.floor(d.getTime() / 1000),
      utc: d.toUTCString(),
    })
  }, [dateTextInput])

  const handlePickerConvert = useCallback(() => {
    if (!calendarDate) {
      setPickerResult({ error: 'Please pick a date from the calendar.' })
      return
    }
    const [y, m, d] = calendarDate.split('-').map(Number)
    const date = new Date(y, m - 1, d, pickerHour, pickerMinute, pickerSecond)
    if (y >= 0 && y < 100) date.setFullYear(y)
    setPickerResult({
      millis: date.getTime(),
      seconds: Math.floor(date.getTime() / 1000),
      utc: date.toUTCString(),
      iso: date.toISOString(),
    })
  }, [calendarDate, pickerHour, pickerMinute, pickerSecond])

  const fillPickerNow = useCallback(() => {
    const n = new Date()
    setCalendarDate(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`)
    setPickerHour(n.getHours())
    setPickerMinute(n.getMinutes())
    setPickerSecond(n.getSeconds())
  }, [])

  const handleCopyTimestamp = useCallback((e) => {
    navigator.clipboard.writeText(String(millis))
    const btn = e.currentTarget
    btn.textContent = 'Copied!'
    btn.classList.add('copied')
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied') }, 1500)
  }, [millis])

  const fillNowMillis = useCallback(() => {
    setConvertMillis(String(Date.now()))
  }, [])

  const fillNowText = useCallback(() => {
    const n = new Date()
    const y = n.getFullYear()
    const mo = String(n.getMonth() + 1).padStart(2, '0')
    const d = String(n.getDate()).padStart(2, '0')
    const h = String(n.getHours()).padStart(2, '0')
    const mi = String(n.getMinutes()).padStart(2, '0')
    const s = String(n.getSeconds()).padStart(2, '0')
    setDateTextInput(`${y}-${mo}-${d} ${h}:${mi}:${s}`)
  }, [])

  return (
    <div className="time-page">
      <h1>Time / Epoch Converter</h1>
      <p className="page-subtitle">Real-time clock and epoch timestamp converter</p>

      <section className="time-section live-clock">
        <div className="millis-display">
          <div className="millis-label">Current Unix Timestamp (milliseconds)</div>
          <div className="millis-value">{millis.toLocaleString()}</div>
          <button className="copy-ts-btn btn-secondary" onClick={handleCopyTimestamp}>Copy</button>
        </div>
      </section>

      <div className="converters-row">
      <section className="time-section">
        <h2>Milliseconds to Date</h2>
        <div className="converter-input">
          <input
            type="text"
            placeholder="Enter milliseconds (e.g. 1703980800000)"
            value={convertMillis}
            onChange={(e) => setConvertMillis(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleMillisConvert()}
          />
          <div className="converter-buttons">
            <button onClick={handleMillisConvert}>Convert</button>
            <button className="btn-secondary" onClick={fillNowMillis}>Now</button>
          </div>
        </div>
        {convertResult && (
          <div className="convert-results">
            {convertResult.error ? (
              <div className="error">{convertResult.error}</div>
            ) : (
              <div className="time-grid compact">
                <div className="time-row"><span className="time-label">UTC</span><span className="time-value">{convertResult.utc}</span></div>
                <div className="time-row"><span className="time-label">Local</span><span className="time-value">{convertResult.local}</span></div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="time-section">
        <h2>Date to Milliseconds</h2>
        <div className="date-to-ms-methods">
          <div className="method-block">
            <h3>Type a date</h3>
            <div className="converter-input">
              <input
                type="text"
                placeholder="e.g. 2024-12-31 23:59:59 or Dec 31, 2024"
                value={dateTextInput}
                onChange={(e) => setDateTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDateTextConvert()}
              />
              <div className="converter-buttons">
                <button onClick={handleDateTextConvert}>Convert</button>
                <button className="btn-secondary" onClick={fillNowText}>Now</button>
              </div>
            </div>
            {dateTextResult && (
              <div className="convert-results">
                {dateTextResult.error ? (
                  <div className="error">{dateTextResult.error}</div>
                ) : (
                  <div className="time-grid compact">
                    <div className="time-row"><span className="time-label">Milliseconds</span><span className="time-value">{dateTextResult.millis}</span></div>
                    <div className="time-row"><span className="time-label">Seconds</span><span className="time-value">{dateTextResult.seconds}</span></div>
                    <div className="time-row"><span className="time-label">UTC</span><span className="time-value">{dateTextResult.utc}</span></div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="method-divider"><span>or</span></div>

          <div className="method-block">
            <h3>Pick a date</h3>
            <div className="picker-area">
              <div className="picker-date-col">
                <span className="roller-label">Date</span>
                <input
                  type="date"
                  className="calendar-input"
                  value={calendarDate}
                  onChange={(e) => setCalendarDate(e.target.value)}
                />
              </div>
              <ScrollRoller label="Hour" value={pickerHour} min={0} max={23} onChange={setPickerHour} />
              <ScrollRoller label="Min" value={pickerMinute} min={0} max={59} onChange={setPickerMinute} />
              <ScrollRoller label="Sec" value={pickerSecond} min={0} max={59} onChange={setPickerSecond} />
            </div>
            <div className="converter-buttons picker-buttons">
              <button onClick={handlePickerConvert}>Convert</button>
              <button className="btn-secondary" onClick={fillPickerNow}>Now</button>
            </div>
            {pickerResult && (
              <div className="convert-results">
                {pickerResult.error ? (
                  <div className="error">{pickerResult.error}</div>
                ) : (
                  <div className="time-grid compact">
                    <div className="time-row"><span className="time-label">Milliseconds</span><span className="time-value">{pickerResult.millis}</span></div>
                    <div className="time-row"><span className="time-label">Seconds</span><span className="time-value">{pickerResult.seconds}</span></div>
                    <div className="time-row"><span className="time-label">UTC</span><span className="time-value">{pickerResult.utc}</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
      </div>
    </div>
  )
}

export default TimePage
