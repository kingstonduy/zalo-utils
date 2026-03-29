import { useState, useCallback } from 'react'
import './JsonPage.css'

function JsonPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indentSize, setIndentSize] = useState(2)
  const [status, setStatus] = useState(null)
  const [activeConvert, setActiveConvert] = useState(null)

  const showStatus = useCallback((msg, type = 'success') => {
    setStatus({ msg, type })
    setTimeout(() => setStatus(null), 3000)
  }, [])

  const parseInput = useCallback(() => {
    try {
      return JSON.parse(input)
    } catch {
      return null
    }
  }, [input])

  const handleFormat = useCallback(() => {
    const parsed = parseInput()
    if (parsed === null && input.trim()) {
      showStatus('Invalid JSON', 'error')
      setOutput('Error: Invalid JSON\n\n' + getJsonError(input))
      return
    }
    const formatted = JSON.stringify(parsed, null, indentSize)
    setOutput(formatted)
    setActiveConvert(null)
    showStatus('Formatted successfully')
  }, [input, indentSize, parseInput, showStatus])

  const handleMinify = useCallback(() => {
    const parsed = parseInput()
    if (parsed === null && input.trim()) {
      showStatus('Invalid JSON', 'error')
      return
    }
    setOutput(JSON.stringify(parsed))
    setActiveConvert(null)
    showStatus('Minified successfully')
  }, [input, parseInput, showStatus])

  const handleValidate = useCallback(() => {
    try {
      JSON.parse(input)
      showStatus('Valid JSON', 'success')
      setOutput('Valid JSON')
    } catch (e) {
      showStatus('Invalid JSON', 'error')
      setOutput('Invalid JSON:\n' + e.message)
    }
    setActiveConvert(null)
  }, [input, showStatus])

  const handleStringToJson = useCallback(() => {
    let str = input.trim()
    if (!str) {
      showStatus('Input is empty', 'error')
      return
    }
    try {
      if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
        str = str.slice(1, -1)
      }
      const unescaped = str
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\')

      const parsed = JSON.parse(unescaped)
      setOutput(JSON.stringify(parsed, null, indentSize))
      setActiveConvert('str2json')
      showStatus('String converted to JSON')
      return
    } catch {
      try {
        const parsed = JSON.parse(str)
        setOutput(JSON.stringify(parsed, null, indentSize))
        setActiveConvert('str2json')
        showStatus('String converted to JSON')
        return
      } catch {
        try {
          const lines = str.split('\n').filter(l => l.trim())
          const objects = lines.map(l => JSON.parse(l.trim()))
          setOutput(JSON.stringify(objects, null, indentSize))
          setActiveConvert('str2json')
          showStatus('Multiple JSON lines converted to array')
          return
        } catch {
          try {
            const fixed = str
              .replace(/'/g, '"')
              .replace(/(\w+)\s*:/g, '"$1":')
              .replace(/,\s*([\]}])/g, '$1')
            const parsed = JSON.parse(fixed)
            setOutput(JSON.stringify(parsed, null, indentSize))
            setActiveConvert('str2json')
            showStatus('Fixed and converted to JSON (auto-corrected quotes/keys)')
            return
          } catch {
            showStatus('Cannot convert string to valid JSON', 'error')
            setOutput('Error: Cannot convert the input string to valid JSON.\n\nTips:\n- Ensure proper JSON structure with double quotes\n- Check for missing brackets or braces\n- Remove trailing commas\n- Escape special characters')
          }
        }
      }
    }
  }, [input, indentSize, showStatus])

  const handleCopy = useCallback(() => {
    const content = output || input
    if (!content) return
    navigator.clipboard.writeText(content)
    showStatus('Copied to clipboard')
  }, [output, input, showStatus])

  const handleClear = useCallback(() => {
    setInput('')
    setOutput('')
    setActiveConvert(null)
  }, [])

  return (
    <div className="json-page">
      <h1>JSON Tools</h1>
      <p className="page-subtitle">Format, validate, convert, and transform JSON data</p>

      {/* Toolbar */}
      <div className="json-toolbar">
        <div className="toolbar-group">
          <button onClick={handleFormat} className="btn-primary" title="Format / Beautify">Format</button>
          <button onClick={handleMinify} title="Minify / Compact">Minify</button>
          <button onClick={handleValidate} title="Validate JSON">Validate</button>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group">
          <button onClick={handleStringToJson} className={`btn-highlight ${activeConvert === 'str2json' ? 'active' : ''}`}>String to JSON</button>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group">
          <button onClick={handleCopy} className="btn-secondary">Copy</button>
          <button onClick={handleClear} className="btn-secondary">Clear</button>
        </div>
        <div className="toolbar-group toolbar-settings">
          <label>
            Indent:
            <select value={indentSize} onChange={(e) => setIndentSize(Number(e.target.value))}>
              <option value={2}>2 spaces</option>
              <option value={3}>3 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={1}>1 tab</option>
            </select>
          </label>
        </div>
      </div>

      {/* Status bar */}
      {status && (
        <div className={`json-status json-status-${status.type}`}>
          {status.msg}
        </div>
      )}

      {/* Editor Panels */}
      <div className="json-panels">
        <div className="json-panel">
          <div className="panel-header">
            <span>Input</span>
            <span className="panel-info">{input.length} chars</span>
          </div>
          <textarea
            className="json-editor"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your JSON here..."
            spellCheck={false}
          />
        </div>

        <div className="json-panel">
          <div className="panel-header">
            <span>Output {activeConvert && `(${activeConvert.toUpperCase()})`}</span>
            <span className="panel-info">{output.length} chars</span>
          </div>
          <textarea
            className="json-editor"
            value={output}
            readOnly
            placeholder="Output will appear here..."
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}

function getJsonError(str) {
  try {
    JSON.parse(str)
    return ''
  } catch (e) {
    return e.message
  }
}

export default JsonPage
