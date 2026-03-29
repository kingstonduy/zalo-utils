import { useState, useEffect, useCallback, useRef } from 'react'
import './TimePage.css'


const ITEM_HEIGHT = 36

function ScrollRoller({ label, value, min, max, onChange }) {
  const viewportRef = useRef(null)
  const dragState = useRef({ dragging: false, startY: 0, accumulated: 0 })
  const [offset, setOffset] = useState(0)
  const count = max - min + 1

  const wrap = (v) => ((v - min) % count + count) % count + min

  // Show 5 items: 2 above, current, 2 below
  const displayItems = [-2, -1, 0, 1, 2].map(d => wrap(value + d))

  const onPointerDown = (e) => {
    e.preventDefault()
    dragState.current = { dragging: true, startY: e.clientY, accumulated: 0 }
    viewportRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!dragState.current.dragging) return
    const dy = e.clientY - dragState.current.startY
    dragState.current.startY = e.clientY
    dragState.current.accumulated += dy

    // While accumulated drag exceeds one item height, step the value
    while (dragState.current.accumulated >= ITEM_HEIGHT) {
      dragState.current.accumulated -= ITEM_HEIGHT
      onChange(wrap(value - 1))
    }
    while (dragState.current.accumulated <= -ITEM_HEIGHT) {
      dragState.current.accumulated += ITEM_HEIGHT
      onChange(wrap(value + 1))
    }

    setOffset(dragState.current.accumulated)
  }

  const onPointerUp = (e) => {
    dragState.current.dragging = false
    dragState.current.accumulated = 0
    viewportRef.current?.releasePointerCapture(e.pointerId)
    setOffset(0)
  }

  // The track is positioned so item index=2 (the active one) is centered.
  // Default translateY: -(2 * ITEM_HEIGHT) + ITEM_HEIGHT = -ITEM_HEIGHT
  // That places item[2] in the middle of the 3-item-high viewport.
  const baseTranslate = -ITEM_HEIGHT
  const translateY = baseTranslate + offset

  return (
    <div className="scroll-roller">
      <span className="roller-label">{label}</span>
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
            transition: dragState.current.dragging ? 'none' : 'transform 0.15s ease-out',
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
}

function TimePage() {
  const [now, setNow] = useState(new Date())
  const [convertMillis, setConvertMillis] = useState('')
  const [convertResult, setConvertResult] = useState(null)

  // Date to millis — manual text input
  const [dateTextInput, setDateTextInput] = useState('')
  const [dateTextResult, setDateTextResult] = useState(null)

  // Date to millis — picker
  const [calendarDate, setCalendarDate] = useState(() => {
    const n = new Date()
    const y = n.getFullYear()
    const m = String(n.getMonth() + 1).padStart(2, '0')
    const d = String(n.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })
  const [pickerHour, setPickerHour] = useState(new Date().getHours())
  const [pickerMinute, setPickerMinute] = useState(new Date().getMinutes())
  const [pickerSecond, setPickerSecond] = useState(new Date().getSeconds())
  const [pickerResult, setPickerResult] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 50)
    return () => clearInterval(timer)
  }, [])

  const millis = now.getTime()

  const handleMillisConvert = useCallback(() => {
    const ms = parseInt(convertMillis, 10)
    if (isNaN(ms)) {
      setConvertResult({ error: 'Invalid milliseconds value' })
      return
    }
    const d = new Date(ms)
    setConvertResult({
      utc: d.toUTCString(),
      local: d.toString(),
    })
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

  const fillPickerNow = () => {
    const n = new Date()
    const y = n.getFullYear()
    const m = String(n.getMonth() + 1).padStart(2, '0')
    const d = String(n.getDate()).padStart(2, '0')
    setCalendarDate(`${y}-${m}-${d}`)
    setPickerHour(n.getHours())
    setPickerMinute(n.getMinutes())
    setPickerSecond(n.getSeconds())
  }

  const dateResultBlock = (result) => {
    if (!result) return null
    return (
      <div className="convert-results">
        {result.error ? (
          <div className="error">{result.error}</div>
        ) : (
          <div className="time-grid compact">
            <div className="time-row"><span className="time-label">Milliseconds</span><span className="time-value">{result.millis}</span></div>
            <div className="time-row"><span className="time-label">Seconds</span><span className="time-value">{result.seconds}</span></div>
            <div className="time-row"><span className="time-label">UTC</span><span className="time-value">{result.utc}</span></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="time-page">
      <h1>Time / Epoch Converter</h1>
      <p className="page-subtitle">Real-time clock and epoch timestamp converter</p>

      {/* Live Clock */}
      <section className="time-section live-clock">
        <div className="millis-display">
          <div className="millis-label">Current Unix Timestamp (milliseconds)</div>
          <div className="millis-value">{millis.toLocaleString()}</div>
          <button className="copy-ts-btn btn-secondary" onClick={(e) => {
            navigator.clipboard.writeText(String(millis))
            const btn = e.currentTarget
            btn.textContent = 'Copied!'
            btn.classList.add('copied')
            setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied') }, 1500)
          }}>Copy</button>
        </div>
      </section>

      {/* Converters Row */}
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
            <button className="btn-secondary" onClick={() => { setConvertMillis(String(Date.now())); }}>Now</button>
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

      {/* Date to Milliseconds */}
      <section className="time-section">
        <h2>Date to Milliseconds</h2>
        <div className="date-to-ms-methods">
          {/* Method 1: Type it */}
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
                <button className="btn-secondary" onClick={() => {
                  const n = new Date()
                  const y = n.getFullYear()
                  const mo = String(n.getMonth() + 1).padStart(2, '0')
                  const d = String(n.getDate()).padStart(2, '0')
                  const h = String(n.getHours()).padStart(2, '0')
                  const mi = String(n.getMinutes()).padStart(2, '0')
                  const s = String(n.getSeconds()).padStart(2, '0')
                  setDateTextInput(`${y}-${mo}-${d} ${h}:${mi}:${s}`)
                }}>Now</button>
              </div>
            </div>
            {dateResultBlock(dateTextResult)}
          </div>

          <div className="method-divider"><span>or</span></div>

          {/* Method 2: Pick it */}
          <div className="method-block">
            <h3>Pick a date</h3>
            <div className="picker-area">
              <input
                type="date"
                className="calendar-input"
                value={calendarDate}
                onChange={(e) => setCalendarDate(e.target.value)}
              />
              <div className="rollers-group">
                <ScrollRoller label="Hour" value={pickerHour} min={0} max={23} onChange={setPickerHour} />
                <ScrollRoller label="Min" value={pickerMinute} min={0} max={59} onChange={setPickerMinute} />
                <ScrollRoller label="Sec" value={pickerSecond} min={0} max={59} onChange={setPickerSecond} />
              </div>
            </div>
            <div className="converter-buttons picker-buttons">
              <button onClick={handlePickerConvert}>Convert</button>
              <button className="btn-secondary" onClick={fillPickerNow}>Now</button>
            </div>
            {dateResultBlock(pickerResult)}
          </div>
        </div>
      </section>
      </div>
    </div>
  )
}

export default TimePage
