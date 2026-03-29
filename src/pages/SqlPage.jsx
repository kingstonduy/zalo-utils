import { useState, useCallback } from 'react'
import './SqlPage.css'

const KEYWORDS = [
  'SELECT','FROM','WHERE','AND','OR','NOT','IN','BETWEEN','LIKE','IS','NULL',
  'INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','ALTER',
  'DROP','INDEX','VIEW','JOIN','INNER','LEFT','RIGHT','FULL','OUTER','CROSS',
  'ON','AS','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','UNION','ALL',
  'DISTINCT','EXISTS','CASE','WHEN','THEN','ELSE','END','ASC','DESC','COUNT',
  'SUM','AVG','MIN','MAX','PRIMARY','KEY','FOREIGN','REFERENCES','CONSTRAINT',
  'DEFAULT','NOT','NULL','UNIQUE','CHECK','CASCADE','IF','REPLACE','TRIGGER',
  'PROCEDURE','FUNCTION','RETURNS','BEGIN','DECLARE','COMMIT','ROLLBACK',
  'TRANSACTION','WITH','RECURSIVE','OVER','PARTITION','ROW_NUMBER','RANK',
  'DENSE_RANK','LAG','LEAD','FETCH','NEXT','ROWS','ONLY','COALESCE','CAST',
  'CONVERT','SUBSTRING','TRIM','UPPER','LOWER','LENGTH','CONCAT','NOW',
  'CURRENT_TIMESTAMP','DATE','TIME','TIMESTAMP','INT','INTEGER','VARCHAR',
  'CHAR','TEXT','BOOLEAN','FLOAT','DOUBLE','DECIMAL','NUMERIC','BIGINT',
  'SMALLINT','SERIAL','AUTO_INCREMENT','TRUNCATE','EXPLAIN','ANALYZE',
]

const KEYWORD_SET = new Set(KEYWORDS)

function formatSql(sql) {
  const tokens = tokenize(sql)
  let result = ''
  let indent = 0
  let newline = false
  const indentStr = () => '  '.repeat(indent)

  // Keywords that start a new line at current indent
  const newLineBefore = new Set([
    'SELECT','FROM','WHERE','SET','VALUES','ORDER','GROUP','HAVING',
    'LIMIT','UNION','INSERT','UPDATE','DELETE','CREATE','ALTER','DROP',
    'JOIN','INNER','LEFT','RIGHT','FULL','CROSS','ON','AND','OR',
    'WHEN','ELSE','END','WITH','TRUNCATE',
  ])

  // Keywords that increase indent after them
  const indentAfter = new Set(['SELECT','SET','VALUES','('])
  const dedentBefore = new Set(['FROM','WHERE','ORDER','GROUP','HAVING','LIMIT',')'])

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const upper = token.toUpperCase()

    // Skip whitespace tokens
    if (/^\s+$/.test(token)) continue

    const isKeyword = KEYWORD_SET.has(upper)

    if (upper === '(') {
      result += ' ('
      indent++
      newline = true
      continue
    }

    if (upper === ')') {
      indent = Math.max(0, indent - 1)
      result += '\n' + indentStr() + ')'
      continue
    }

    if (isKeyword && dedentBefore.has(upper)) {
      indent = Math.max(0, indent - 1)
    }

    if (isKeyword && newLineBefore.has(upper)) {
      result += '\n' + indentStr() + upper
    } else if (newline) {
      result += '\n' + indentStr() + (isKeyword ? upper : token)
      newline = false
    } else {
      if (result.length > 0 && !result.endsWith(' ') && !result.endsWith('\n') && !result.endsWith('(')) {
        result += ' '
      }
      result += isKeyword ? upper : token
    }

    if (isKeyword && indentAfter.has(upper)) {
      indent++
      newline = true
    }

    if (upper === ',') {
      newline = true
    }
  }

  return result.trim()
}

function tokenize(sql) {
  const tokens = []
  let i = 0
  while (i < sql.length) {
    // Whitespace
    if (/\s/.test(sql[i])) {
      let start = i
      while (i < sql.length && /\s/.test(sql[i])) i++
      tokens.push(sql.slice(start, i))
      continue
    }
    // Quoted string (single)
    if (sql[i] === "'") {
      let start = i
      i++
      while (i < sql.length && sql[i] !== "'") { if (sql[i] === '\\') i++; i++ }
      i++
      tokens.push(sql.slice(start, i))
      continue
    }
    // Quoted string (double)
    if (sql[i] === '"') {
      let start = i
      i++
      while (i < sql.length && sql[i] !== '"') { if (sql[i] === '\\') i++; i++ }
      i++
      tokens.push(sql.slice(start, i))
      continue
    }
    // Backtick identifier
    if (sql[i] === '`') {
      let start = i
      i++
      while (i < sql.length && sql[i] !== '`') i++
      i++
      tokens.push(sql.slice(start, i))
      continue
    }
    // Line comment
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let start = i
      while (i < sql.length && sql[i] !== '\n') i++
      tokens.push(sql.slice(start, i))
      continue
    }
    // Block comment
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let start = i
      i += 2
      while (i < sql.length - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2
      tokens.push(sql.slice(start, i))
      continue
    }
    // Symbols
    if ('(),;*'.includes(sql[i])) {
      tokens.push(sql[i])
      i++
      continue
    }
    // Operators
    if ('<>=!'.includes(sql[i])) {
      let start = i
      i++
      if (i < sql.length && '=<>'.includes(sql[i])) i++
      tokens.push(sql.slice(start, i))
      continue
    }
    // Word / number / identifier
    let start = i
    while (i < sql.length && /[^\s(),;'"` <>!=*/\-]/.test(sql[i])) i++
    if (i > start) tokens.push(sql.slice(start, i))
  }
  return tokens
}

function minifySql(sql) {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),;])\s*/g, '$1')
    .replace(/\s*([<>=!]+)\s*/g, ' $1 ')
    .trim()
}

function highlightSql(sql) {
  const tokens = tokenize(sql)
  return tokens.map((token, i) => {
    const upper = token.toUpperCase()
    if (/^\s+$/.test(token)) return token
    if (KEYWORD_SET.has(upper)) return `<span class="sql-keyword">${token}</span>`
    if (/^'.*'$/.test(token) || /^".*"$/.test(token)) return `<span class="sql-string">${escapeHtml(token)}</span>`
    if (/^\d+(\.\d+)?$/.test(token)) return `<span class="sql-number">${token}</span>`
    if (/^--/.test(token) || /^\/\*/.test(token)) return `<span class="sql-comment">${escapeHtml(token)}</span>`
    if (/^`.*`$/.test(token)) return `<span class="sql-identifier">${escapeHtml(token)}</span>`
    return escapeHtml(token)
  }).join('')
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function SqlPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState(null)

  const showStatus = useCallback((msg, type = 'success') => {
    setStatus({ msg, type })
    setTimeout(() => setStatus(null), 3000)
  }, [])

  const handleFormat = useCallback(() => {
    if (!input.trim()) { showStatus('Input is empty', 'error'); return }
    setOutput(formatSql(input))
    showStatus('Formatted successfully')
  }, [input, showStatus])

  const handleMinify = useCallback(() => {
    if (!input.trim()) { showStatus('Input is empty', 'error'); return }
    setOutput(minifySql(input))
    showStatus('Minified successfully')
  }, [input, showStatus])

  const handleValidate = useCallback(() => {
    if (!input.trim()) { showStatus('Input is empty', 'error'); return }
    const tokens = tokenize(input)
    const errors = []

    // Check balanced parentheses
    let parenDepth = 0
    for (const t of tokens) {
      if (t === '(') parenDepth++
      if (t === ')') parenDepth--
      if (parenDepth < 0) { errors.push('Unexpected closing parenthesis'); break }
    }
    if (parenDepth > 0) errors.push(`${parenDepth} unclosed parenthesis(es)`)

    // Check unclosed strings
    let inSingle = false, inDouble = false
    for (let i = 0; i < input.length; i++) {
      if (input[i] === "'" && !inDouble) inSingle = !inSingle
      if (input[i] === '"' && !inSingle) inDouble = !inDouble
    }
    if (inSingle) errors.push('Unclosed single-quoted string')
    if (inDouble) errors.push('Unclosed double-quoted string')

    if (errors.length === 0) {
      showStatus('SQL syntax looks valid', 'success')
      setOutput('SQL syntax looks valid (basic check passed)')
    } else {
      showStatus('SQL issues found', 'error')
      setOutput('Issues found:\n' + errors.map(e => '- ' + e).join('\n'))
    }
  }, [input, showStatus])

  const handleUppercase = useCallback(() => {
    if (!input.trim()) { showStatus('Input is empty', 'error'); return }
    const tokens = tokenize(input)
    const result = tokens.map(t => KEYWORD_SET.has(t.toUpperCase()) ? t.toUpperCase() : t).join('')
    setOutput(result)
    showStatus('Keywords uppercased')
  }, [input, showStatus])

  const handleLowercase = useCallback(() => {
    if (!input.trim()) { showStatus('Input is empty', 'error'); return }
    const tokens = tokenize(input)
    const result = tokens.map(t => KEYWORD_SET.has(t.toUpperCase()) ? t.toLowerCase() : t).join('')
    setOutput(result)
    showStatus('Keywords lowercased')
  }, [input, showStatus])

  const handleCopy = useCallback(() => {
    const content = output || input
    if (!content) return
    navigator.clipboard.writeText(content)
    showStatus('Copied to clipboard')
  }, [output, input, showStatus])

  const handleClear = useCallback(() => {
    setInput('')
    setOutput('')
  }, [])

  return (
    <div className="sql-page">
      <h1>SQL Tools</h1>
      <p className="page-subtitle">Format, minify, validate, and transform SQL queries</p>

      {/* Toolbar */}
      <div className="sql-toolbar">
        <div className="toolbar-group">
          <button onClick={handleFormat} className="btn-primary">Format</button>
          <button onClick={handleMinify}>Minify</button>
          <button onClick={handleValidate}>Validate</button>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group">
          <button onClick={handleUppercase}>UPPERCASE Keywords</button>
          <button onClick={handleLowercase}>lowercase keywords</button>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group">
          <button onClick={handleCopy} className="btn-secondary">Copy</button>
          <button onClick={handleClear} className="btn-secondary">Clear</button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`sql-status sql-status-${status.type}`}>
          {status.msg}
        </div>
      )}

      {/* Editor Panels */}
      <div className="sql-panels">
        <div className="sql-panel">
          <div className="panel-header">
            <span>Input</span>
            <span className="panel-info">{input.length} chars</span>
          </div>
          <textarea
            className="sql-editor"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your SQL here..."
            spellCheck={false}
          />
        </div>

        <div className="sql-panel">
          <div className="panel-header">
            <span>Output</span>
            <span className="panel-info">{output.length} chars</span>
          </div>
          <div className="sql-editor sql-output">
            {output ? (
              <pre className="sql-highlighted" dangerouslySetInnerHTML={{ __html: highlightSql(output) }} />
            ) : (
              <span className="sql-placeholder">Output will appear here...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SqlPage
