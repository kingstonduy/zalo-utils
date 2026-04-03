import { useState, useCallback, useRef, useLayoutEffect, useMemo } from 'react'
import './JsonPage.css'

function computeOutput(text, mode, indent) {
  if (!text.trim()) return ''
  if (mode === 'format') {
    try {
      return JSON.stringify(JSON.parse(text), null, indent)
    } catch {
      return getDetailedJsonError(text)
    }
  }
  if (mode === 'minify') {
    try {
      return JSON.stringify(JSON.parse(text))
    } catch {
      return getDetailedJsonError(text)
    }
  }
  if (mode === 'str2json') {
    let str = text.trim()
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
      return JSON.stringify(JSON.parse(unescaped), null, indent)
    } catch {
      try { return JSON.stringify(JSON.parse(str), null, indent) } catch {
        try {
          const lines = str.split('\n').filter(l => l.trim())
          const objects = lines.map(l => JSON.parse(l.trim()))
          return JSON.stringify(objects, null, indent)
        } catch {
          try {
            const fixed = str
              .replace(/'/g, '"')
              .replace(/(\w+)\s*:/g, '"$1":')
              .replace(/,\s*([\]}])/g, '$1')
            return JSON.stringify(JSON.parse(fixed), null, indent)
          } catch {
            return 'Error: Input is not a valid JSON string.\n\nThe input could not be parsed as an escaped JSON string, JSONL, or auto-corrected JSON.\n\nTips:\n- Wrap your JSON in quotes if it\'s an escaped string\n- Ensure proper JSON structure with double quotes\n- Check for missing brackets or braces\n- Remove trailing commas'
          }
        }
      }
    }
  }
  return ''
}

function autoResize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function JsonPage() {
  const [input, setInput] = useState('')
  const [indentSize, setIndentSize] = useState(2)
  const [mode, setMode] = useState('format')
  const inputRef = useRef(null)
  const outputRef = useRef(null)

  const output = useMemo(() => computeOutput(input, mode, indentSize), [input, mode, indentSize])

  // Single batched layout effect for both textareas
  useLayoutEffect(() => {
    autoResize(inputRef.current)
    autoResize(outputRef.current)
  }, [input, output])

  const handleCopy = useCallback(() => {
    const content = output || input
    if (!content) return
    navigator.clipboard.writeText(content)
  }, [output, input])

  const handleClear = useCallback(() => {
    setInput('')
  }, [])

  const setFormat = useCallback(() => setMode('format'), [])
  const setMinify = useCallback(() => setMode('minify'), [])
  const setStr2json = useCallback(() => setMode('str2json'), [])

  return (
    <div className="json-page">
      <h1>JSON Tools</h1>
      <p className="page-subtitle">Format, validate, convert, and transform JSON data</p>

      <div className="json-panels">
        <div className="json-panel">
          <div className="panel-header">
            <span>Input</span>
            <span className="panel-info">{input.length} chars</span>
          </div>
          <textarea
            ref={inputRef}
            className="json-editor"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your JSON here..."
            spellCheck={false}
          />
        </div>

        <div className="json-actions">
          <label className="indent-setting">
            Indent:
            <select value={indentSize} onChange={(e) => setIndentSize(Number(e.target.value))}>
              <option value={2}>2 spaces</option>
              <option value={3}>3 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={1}>1 tab</option>
            </select>
          </label>
          <button onClick={handleCopy} className="btn-secondary">Copy</button>
          <button onClick={handleClear} className="btn-secondary">Clear</button>
          <div className="actions-divider" />
          <button onClick={setFormat} className={mode === 'format' ? 'btn-primary' : ''}>Format</button>
          <button onClick={setMinify} className={mode === 'minify' ? 'btn-primary' : ''}>Minify</button>
          <button onClick={setStr2json} className={mode === 'str2json' ? 'btn-primary' : ''}>String to JSON</button>
        </div>

        <div className="json-panel">
          <div className="panel-header">
            <span>Output ({mode === 'str2json' ? 'String to JSON' : mode === 'minify' ? 'Minified' : 'Formatted'})</span>
            <span className="panel-info">{output.length} chars</span>
          </div>
          <textarea
            ref={outputRef}
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

function getDetailedJsonError(str) {
  try {
    JSON.parse(str)
    return ''
  } catch (e) {
    const msg = e.message
    const posMatch = msg.match(/position\s+(\d+)/)
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10)
      const before = str.slice(0, pos)
      const line = (before.match(/\n/g) || []).length + 1
      const col = pos - before.lastIndexOf('\n')
      const char = pos < str.length ? JSON.stringify(str[pos]) : 'end of input'

      const lines = str.split('\n')
      const startLine = Math.max(0, line - 3)
      const endLine = Math.min(lines.length, line + 2)
      let snippet = ''
      for (let i = startLine; i < endLine; i++) {
        const marker = i === line - 1 ? '>' : ' '
        snippet += `${marker} ${String(i + 1).padStart(4)} | ${lines[i]}\n`
        if (i === line - 1) {
          snippet += `       ${' '.repeat(col - 1)}^\n`
        }
      }

      return `Invalid JSON at line ${line}, column ${col}\n` +
        `Unexpected character: ${char}\n\n` +
        snippet + '\n' + msg
    }
    return 'Invalid JSON\n\n' + msg
  }
}

export default JsonPage
