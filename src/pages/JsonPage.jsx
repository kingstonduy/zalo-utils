import { useState, useRef, useCallback } from 'react'
import './JsonPage.css'

function jsonToXml(obj, indent = '') {
  let xml = ''
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      xml += `${indent}<item index="${i}">\n${jsonToXml(item, indent + '  ')}${indent}</item>\n`
    })
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_')
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        xml += `${indent}<${safeKey}>\n${jsonToXml(obj[key], indent + '  ')}${indent}</${safeKey}>\n`
      } else {
        const val = obj[key] === null ? '' : String(obj[key])
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        xml += `${indent}<${safeKey}>${val}</${safeKey}>\n`
      }
    }
  } else {
    xml += `${indent}${obj}\n`
  }
  return xml
}

function jsonToCsv(data) {
  let arr = Array.isArray(data) ? data : [data]
  arr = arr.filter(item => typeof item === 'object' && item !== null && !Array.isArray(item))
  if (arr.length === 0) return '// Cannot convert to CSV: data must be an array of objects'
  const headers = [...new Set(arr.flatMap(Object.keys))]
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return ''
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"` : str
  }
  const rows = [headers.join(',')]
  arr.forEach(item => {
    rows.push(headers.map(h => escapeCSV(item[h])).join(','))
  })
  return rows.join('\n')
}

function jsonToYaml(obj, indent = 0) {
  const pad = '  '.repeat(indent)
  let yaml = ''
  if (Array.isArray(obj)) {
    if (obj.length === 0) return `${pad}[]\n`
    obj.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        yaml += `${pad}-\n${jsonToYaml(item, indent + 1)}`
      } else {
        yaml += `${pad}- ${formatYamlValue(item)}\n`
      }
    })
  } else if (typeof obj === 'object' && obj !== null) {
    if (Object.keys(obj).length === 0) return `${pad}{}\n`
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        yaml += `${pad}${key}:\n${jsonToYaml(obj[key], indent + 1)}`
      } else {
        yaml += `${pad}${key}: ${formatYamlValue(obj[key])}\n`
      }
    }
  } else {
    yaml += `${pad}${formatYamlValue(obj)}\n`
  }
  return yaml
}

function formatYamlValue(val) {
  if (val === null) return 'null'
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string') {
    if (val === '' || /[:#{}[\],&*?|>!%@`]/.test(val) || val.includes('\n') || val === 'true' || val === 'false' || val === 'null' || !isNaN(Number(val))) {
      return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    }
    return val
  }
  return String(val)
}

function buildTree(data, key = 'root') {
  if (data === null) return { key, type: 'null', value: 'null' }
  if (typeof data !== 'object') return { key, type: typeof data, value: String(data) }
  if (Array.isArray(data)) {
    return { key, type: 'array', length: data.length, children: data.map((item, i) => buildTree(item, String(i))) }
  }
  return { key, type: 'object', length: Object.keys(data).length, children: Object.keys(data).map(k => buildTree(data[k], k)) }
}

function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0

  if (!hasChildren) {
    return (
      <div className="tree-leaf" style={{ paddingLeft: depth * 20 }}>
        <span className="tree-key">{node.key}</span>
        <span className="tree-colon">: </span>
        <span className={`tree-val tree-${node.type}`}>
          {node.type === 'string' ? `"${node.value}"` : node.value}
        </span>
      </div>
    )
  }

  return (
    <div className="tree-node">
      <div
        className="tree-branch"
        style={{ paddingLeft: depth * 20 }}
        onClick={() => setOpen(!open)}
      >
        <span className="tree-toggle">{open ? '\u25BE' : '\u25B8'}</span>
        <span className="tree-key">{node.key}</span>
        <span className="tree-type">
          {node.type === 'array' ? `[${node.length}]` : `{${node.length}}`}
        </span>
      </div>
      {open && node.children.map((child, i) => (
        <TreeNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

function JsonPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indentSize, setIndentSize] = useState(2)
  const [status, setStatus] = useState(null)
  const [view, setView] = useState('text') // text | tree
  const [treeData, setTreeData] = useState(null)
  const [activeConvert, setActiveConvert] = useState(null)
  const fileInputRef = useRef(null)

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
    setView('text')
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
    setView('text')
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
    setView('text')
    setActiveConvert(null)
  }, [input, showStatus])

  const handleTreeView = useCallback(() => {
    const parsed = parseInput()
    if (parsed === null && input.trim()) {
      showStatus('Invalid JSON - cannot build tree', 'error')
      return
    }
    setTreeData(buildTree(parsed))
    setView('tree')
    setActiveConvert(null)
    showStatus('Tree view generated')
  }, [input, parseInput, showStatus])

  const handleConvertXML = useCallback(() => {
    const parsed = parseInput()
    if (parsed === null && input.trim()) {
      showStatus('Invalid JSON', 'error')
      return
    }
    setOutput('<?xml version="1.0" encoding="UTF-8"?>\n<root>\n' + jsonToXml(parsed, '  ') + '</root>')
    setView('text')
    setActiveConvert('xml')
    showStatus('Converted to XML')
  }, [input, parseInput, showStatus])

  const handleConvertCSV = useCallback(() => {
    const parsed = parseInput()
    if (parsed === null && input.trim()) {
      showStatus('Invalid JSON', 'error')
      return
    }
    setOutput(jsonToCsv(parsed))
    setView('text')
    setActiveConvert('csv')
    showStatus('Converted to CSV')
  }, [input, parseInput, showStatus])

  const handleConvertYAML = useCallback(() => {
    const parsed = parseInput()
    if (parsed === null && input.trim()) {
      showStatus('Invalid JSON', 'error')
      return
    }
    setOutput(jsonToYaml(parsed))
    setView('text')
    setActiveConvert('yaml')
    showStatus('Converted to YAML')
  }, [input, parseInput, showStatus])

  const handleStringToJson = useCallback(() => {
    let str = input.trim()
    if (!str) {
      showStatus('Input is empty', 'error')
      return
    }
    // Try multiple strategies to convert string to JSON
    try {
      // Strategy 1: It might be a JSON string that's been escaped/stringified
      // e.g. "{\"key\": \"value\"}" or '{"key": "value"}'
      if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
        str = str.slice(1, -1)
      }
      // Unescape common escape sequences
      const unescaped = str
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\')

      const parsed = JSON.parse(unescaped)
      setOutput(JSON.stringify(parsed, null, indentSize))
      setView('text')
      setActiveConvert('str2json')
      showStatus('String converted to JSON')
      return
    } catch {
      // Strategy 2: Try parsing as-is
      try {
        const parsed = JSON.parse(str)
        setOutput(JSON.stringify(parsed, null, indentSize))
        setView('text')
        setActiveConvert('str2json')
        showStatus('String converted to JSON')
        return
      } catch {
        // Strategy 3: Try wrapping in array or fixing common issues
        try {
          // Maybe it's multiple JSON objects separated by newlines
          const lines = str.split('\n').filter(l => l.trim())
          const objects = lines.map(l => JSON.parse(l.trim()))
          setOutput(JSON.stringify(objects, null, indentSize))
          setView('text')
          setActiveConvert('str2json')
          showStatus('Multiple JSON lines converted to array')
          return
        } catch {
          // Strategy 4: Try fixing common issues (single quotes, unquoted keys, trailing commas)
          try {
            const fixed = str
              .replace(/'/g, '"')  // single quotes to double
              .replace(/(\w+)\s*:/g, '"$1":')  // unquoted keys
              .replace(/,\s*([\]}])/g, '$1')  // trailing commas
            const parsed = JSON.parse(fixed)
            setOutput(JSON.stringify(parsed, null, indentSize))
            setView('text')
            setActiveConvert('str2json')
            showStatus('Fixed and converted to JSON (auto-corrected quotes/keys)')
            return
          } catch {
            // Give up
            showStatus('Cannot convert string to valid JSON', 'error')
            setOutput('Error: Cannot convert the input string to valid JSON.\n\nTips:\n- Ensure proper JSON structure with double quotes\n- Check for missing brackets or braces\n- Remove trailing commas\n- Escape special characters')
            setView('text')
          }
        }
      }
    }
  }, [input, indentSize, showStatus])

  const handleUpload = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setInput(ev.target.result)
      showStatus(`Loaded ${file.name}`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [showStatus])

  const handleDownload = useCallback(() => {
    const content = output || input
    if (!content) return
    const ext = activeConvert === 'xml' ? 'xml' : activeConvert === 'csv' ? 'csv' : activeConvert === 'yaml' ? 'yaml' : 'json'
    const mime = activeConvert === 'xml' ? 'application/xml' : activeConvert === 'csv' ? 'text/csv' : activeConvert === 'yaml' ? 'text/yaml' : 'application/json'
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    showStatus(`Downloaded as data.${ext}`)
  }, [output, input, activeConvert, showStatus])

  const handleCopy = useCallback(() => {
    const content = output || input
    if (!content) return
    navigator.clipboard.writeText(content)
    showStatus('Copied to clipboard')
  }, [output, input, showStatus])

  const handleClear = useCallback(() => {
    setInput('')
    setOutput('')
    setTreeData(null)
    setView('text')
    setActiveConvert(null)
  }, [])

  const handleSample = useCallback(() => {
    const sample = JSON.stringify({
      name: "John Doe",
      age: 30,
      email: "john@example.com",
      isActive: true,
      address: {
        street: "123 Main St",
        city: "Anytown",
        state: "CA",
        zip: "12345"
      },
      hobbies: ["reading", "coding", "hiking"],
      scores: [95, 87, 92, 88],
      metadata: null
    }, null, 2)
    setInput(sample)
    showStatus('Sample JSON loaded')
  }, [showStatus])

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
          <button onClick={handleTreeView} title="Tree View">Tree View</button>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group">
          <button onClick={handleConvertXML} className={activeConvert === 'xml' ? 'active' : ''}>To XML</button>
          <button onClick={handleConvertCSV} className={activeConvert === 'csv' ? 'active' : ''}>To CSV</button>
          <button onClick={handleConvertYAML} className={activeConvert === 'yaml' ? 'active' : ''}>To YAML</button>
          <button onClick={handleStringToJson} className={`btn-highlight ${activeConvert === 'str2json' ? 'active' : ''}`}>String to JSON</button>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group">
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">Upload</button>
          <button onClick={handleDownload} className="btn-secondary">Download</button>
          <button onClick={handleCopy} className="btn-secondary">Copy</button>
          <button onClick={handleClear} className="btn-secondary">Clear</button>
          <button onClick={handleSample} className="btn-secondary">Sample</button>
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
        <input type="file" ref={fileInputRef} accept=".json,.txt" style={{ display: 'none' }} onChange={handleUpload} />
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
            placeholder='Paste your JSON here...\n\nOr click "Sample" to load example data'
            spellCheck={false}
          />
        </div>

        <div className="json-panel">
          <div className="panel-header">
            <span>Output {activeConvert && `(${activeConvert.toUpperCase()})`}</span>
            <span className="panel-info">{view === 'text' ? `${output.length} chars` : 'Tree'}</span>
          </div>
          {view === 'tree' && treeData ? (
            <div className="json-editor tree-view">
              <TreeNode node={treeData} />
            </div>
          ) : (
            <textarea
              className="json-editor"
              value={output}
              readOnly
              placeholder="Output will appear here..."
              spellCheck={false}
            />
          )}
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
