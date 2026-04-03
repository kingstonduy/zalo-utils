import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import './RedisPage.css'

const API_BASE = '/api/redis'

function tryFormatJson(str) {
  try {
    const parsed = JSON.parse(str)
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true }
  } catch {
    return { formatted: str, isJson: false }
  }
}

function formatTtl(ttl) {
  if (ttl === -1) return 'No expiry'
  if (ttl === -2) return 'Key not found'
  if (ttl < 60) return `${ttl}s`
  if (ttl < 3600) return `${Math.floor(ttl / 60)}m ${ttl % 60}s`
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}h ${Math.floor((ttl % 3600) / 60)}m`
  return `${Math.floor(ttl / 86400)}d ${Math.floor((ttl % 86400) / 3600)}h`
}

function RedisPage() {
  const [queryMode, setQueryMode] = useState('string')
  const [keyInput, setKeyInput] = useState('')
  const [patternInput, setPatternInput] = useState('')
  const [result, setResult] = useState(null)
  const [searchResults, setSearchResults] = useState(null)
  const [searchCursor, setSearchCursor] = useState('0')
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [editingTtl, setEditingTtl] = useState(false)
  const [ttlValue, setTtlValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const statusTimer = useRef(null)

  // Cleanup status timer on unmount
  useEffect(() => {
    return () => { if (statusTimer.current) clearTimeout(statusTimer.current) }
  }, [])

  const showStatus = useCallback((msg, type = 'success') => {
    if (statusTimer.current) clearTimeout(statusTimer.current)
    setStatus({ msg, type })
    statusTimer.current = setTimeout(() => {
      setStatus(null)
      statusTimer.current = null
    }, 3000)
  }, [])

  const handleGet = useCallback(async () => {
    if (!keyInput.trim()) { showStatus('Enter a key', 'error'); return }
    setLoading(true)
    setResult(null)
    setConfirmDelete(false)
    setEditingTtl(false)
    try {
      const endpoint = queryMode === 'bytes' ? 'get-by-bytes' : 'get'
      const res = await fetch(`${API_BASE}/${endpoint}?key=${encodeURIComponent(keyInput)}`)
      const data = await res.json()
      if (!res.ok) {
        showStatus(data.error || 'Key not found', 'error')
        setResult(null)
      } else {
        setResult(data)
        showStatus(`Key found (${data.type})`)
      }
    } catch (e) {
      showStatus('API request failed: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [keyInput, queryMode, showStatus])

  const handleSearch = useCallback(async (cursor = '0') => {
    if (!patternInput.trim()) { showStatus('Enter a pattern', 'error'); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`${API_BASE}/search?pattern=${encodeURIComponent(patternInput)}&cursor=${cursor}&count=50`)
      const data = await res.json()
      if (!res.ok) {
        showStatus(data.error || 'Search failed', 'error')
        return
      }
      if (cursor === '0') {
        setSearchResults(data.keys)
      } else {
        // Concat without spreading the entire previous array
        setSearchResults(prev => (prev || []).concat(data.keys))
      }
      setSearchCursor(data.cursor)
      showStatus(`Found ${data.keys.length} key(s)`)
    } catch (e) {
      showStatus('API request failed: ' + e.message, 'error')
    } finally {
      setSearchLoading(false)
    }
  }, [patternInput, showStatus])

  const handleDelete = useCallback(async () => {
    if (!result) return
    try {
      const res = await fetch(`${API_BASE}/delete?key=${encodeURIComponent(result.key)}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.deleted) {
        showStatus('Key deleted')
        setResult(null)
        setConfirmDelete(false)
      } else {
        showStatus('Delete failed', 'error')
      }
    } catch (e) {
      showStatus('API request failed: ' + e.message, 'error')
    }
  }, [result, showStatus])

  const handleTtlUpdate = useCallback(async () => {
    if (!result) return
    const ttl = parseInt(ttlValue, 10)
    if (isNaN(ttl)) { showStatus('Invalid TTL value', 'error'); return }
    try {
      const res = await fetch(`${API_BASE}/ttl`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: result.key, ttl }),
      })
      const data = await res.json()
      if (data.success) {
        showStatus('TTL updated')
        setResult(prev => ({ ...prev, ttl }))
        setEditingTtl(false)
      } else {
        showStatus('TTL update failed', 'error')
      }
    } catch (e) {
      showStatus('API request failed: ' + e.message, 'error')
    }
  }, [result, ttlValue, showStatus])

  const handleCopyValue = useCallback(() => {
    if (!result) return
    navigator.clipboard.writeText(result.value)
    showStatus('Value copied to clipboard')
  }, [result, showStatus])

  const handleKeyClick = useCallback((key) => {
    setKeyInput(key)
    setQueryMode('string')
  }, [])

  const setStringMode = useCallback(() => setQueryMode('string'), [])
  const setBytesMode = useCallback(() => setQueryMode('bytes'), [])
  const startSearch = useCallback(() => handleSearch('0'), [handleSearch])
  const cancelTtlEdit = useCallback(() => setEditingTtl(false), [])
  const startDelete = useCallback(() => setConfirmDelete(true), [])
  const cancelDelete = useCallback(() => setConfirmDelete(false), [])
  const startTtlEdit = useCallback(() => {
    setEditingTtl(true)
    setTtlValue(result?.ttl === -1 ? '-1' : String(result?.ttl ?? ''))
  }, [result])

  // Memoize JSON formatting — only recompute when result.value changes
  const { formatted, isJson } = useMemo(
    () => result ? tryFormatJson(result.value) : { formatted: '', isJson: false },
    [result]
  )

  return (
    <div className="redis-page">
      <h1>Redis Search</h1>
      <p className="page-subtitle">Query and browse Redis keys</p>

      {status && (
        <div className={`redis-status redis-status-${status.type}`}>{status.msg}</div>
      )}

      <div className="redis-search-bar">
        <div className="redis-search-section">
          <div className="query-mode-toggle">
            <button className={queryMode === 'string' ? 'active' : ''} onClick={setStringMode}>String Key</button>
            <button className={queryMode === 'bytes' ? 'active' : ''} onClick={setBytesMode}>Byte Array Key</button>
          </div>
          <div className="redis-input-row">
            <input
              type="text"
              placeholder={queryMode === 'bytes' ? 'Enter string (converts to byte array)' : 'Enter key name (e.g. user:1)'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGet()}
            />
            <button className="btn-primary" onClick={handleGet} disabled={loading}>
              {loading ? 'Loading...' : 'Get'}
            </button>
          </div>
        </div>
        <div className="redis-search-divider" />
        <div className="redis-search-section">
          <div className="redis-input-row">
            <input
              type="text"
              placeholder="Search pattern (e.g. user:* or session:*)"
              value={patternInput}
              onChange={(e) => setPatternInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startSearch()}
            />
            <button className="btn-primary" onClick={startSearch} disabled={searchLoading}>
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      <div className="redis-results">
        {searchResults && (
          <div className="search-results-list">
            {searchResults.length === 0 ? (
              <div className="search-empty">No keys found</div>
            ) : (
              <>
                {searchResults.map((item, i) => (
                  <div key={item.key || i} className="search-result-item" onClick={() => handleKeyClick(item.key)}>
                    <span className="search-key">{item.key}</span>
                    <div className="search-meta">
                      <span className={`type-badge type-${item.type}`}>{item.type}</span>
                      <span className="ttl-badge">{formatTtl(item.ttl)}</span>
                    </div>
                  </div>
                ))}
                {searchCursor !== '0' && (
                  <button className="load-more-btn" onClick={() => handleSearch(searchCursor)} disabled={searchLoading}>
                    {searchLoading ? 'Loading...' : 'Load More'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div className="redis-result-panel">
          {result ? (
            <section className="redis-card result-card">
              <div className="result-meta-bar">
                <div className="result-key-name" title={result.key}>{result.key}</div>
                <div className="result-meta-badges">
                  <span className={`type-badge type-${result.type}`}>{result.type}</span>
                  <span className="meta-badge">{result.encoding}</span>
                  <span className="meta-badge">{result.size} bytes</span>
                  <span className="meta-badge ttl-meta">
                    {editingTtl ? (
                      <span className="ttl-edit-inline">
                        <input
                          type="number"
                          value={ttlValue}
                          onChange={(e) => setTtlValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleTtlUpdate()}
                          placeholder="seconds"
                          autoFocus
                        />
                        <button onClick={handleTtlUpdate}>Save</button>
                        <button className="btn-cancel" onClick={cancelTtlEdit}>Cancel</button>
                      </span>
                    ) : (
                      <span className="ttl-clickable" onClick={startTtlEdit} title="Click to edit TTL">
                        TTL: {formatTtl(result.ttl)}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="result-actions">
                <button className="btn-secondary" onClick={handleCopyValue}>Copy Value</button>
                {confirmDelete ? (
                  <>
                    <span className="delete-confirm-text">Delete this key?</span>
                    <button className="btn-danger" onClick={handleDelete}>Yes, Delete</button>
                    <button className="btn-secondary" onClick={cancelDelete}>Cancel</button>
                  </>
                ) : (
                  <button className="btn-danger-outline" onClick={startDelete}>Delete</button>
                )}
              </div>

              <div className="result-value-container">
                <div className="result-value-header">
                  <span>Value</span>
                  {isJson && <span className="json-badge">JSON (formatted)</span>}
                </div>
                <pre className="result-value">{formatted}</pre>
              </div>
            </section>
          ) : (
            <div className="result-empty">
              <div className="result-empty-icon">&#128269;</div>
              <div className="result-empty-text">Search for a key or click a result to view its value</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RedisPage
