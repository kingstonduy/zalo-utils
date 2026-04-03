import { useState, useCallback, useRef, useLayoutEffect, useMemo } from 'react'
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

// Hoist Sets outside formatSql to avoid recreating on every call
const NEW_LINE_BEFORE = new Set([
  'SELECT','FROM','WHERE','SET','VALUES','ORDER','GROUP','HAVING',
  'LIMIT','UNION','INSERT','UPDATE','DELETE','CREATE','ALTER','DROP',
  'JOIN','INNER','LEFT','RIGHT','FULL','CROSS','ON','AND','OR',
  'WHEN','ELSE','END','WITH','TRUNCATE',
])
const INDENT_AFTER = new Set(['SELECT','SET','VALUES','('])
const DEDENT_BEFORE = new Set(['FROM','WHERE','ORDER','GROUP','HAVING','LIMIT',')'])

function formatSql(sql) {
  const tokens = tokenize(sql)
  const parts = []
  let indent = 0
  let newline = false
  const indentStr = () => '  '.repeat(indent)

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const upper = token.toUpperCase()

    if (token.charCodeAt(0) <= 32 && /^\s+$/.test(token)) continue

    const isKeyword = KEYWORD_SET.has(upper)

    if (upper === '(') {
      parts.push(' (')
      indent++
      newline = true
      continue
    }

    if (upper === ')') {
      indent = Math.max(0, indent - 1)
      parts.push('\n', indentStr(), ')')
      continue
    }

    if (isKeyword && DEDENT_BEFORE.has(upper)) {
      indent = Math.max(0, indent - 1)
    }

    if (isKeyword && NEW_LINE_BEFORE.has(upper)) {
      parts.push('\n', indentStr(), upper)
    } else if (newline) {
      parts.push('\n', indentStr(), isKeyword ? upper : token)
      newline = false
    } else {
      if (parts.length > 0) {
        const last = parts[parts.length - 1]
        if (last && !last.endsWith(' ') && !last.endsWith('\n') && !last.endsWith('(')) {
          parts.push(' ')
        }
      }
      parts.push(isKeyword ? upper : token)
    }

    if (isKeyword && INDENT_AFTER.has(upper)) {
      indent++
      newline = true
    }

    if (upper === ',') {
      newline = true
    }
  }

  return parts.join('').trim()
}

// Pre-compiled regexes for tokenizer hot path
const RE_WHITESPACE = /\s/
const RE_WORD_BOUNDARY = /[^\s(),;'"` <>!=*/-]/

function tokenize(sql) {
  const tokens = []
  let i = 0
  const len = sql.length
  while (i < len) {
    const ch = sql[i]
    if (RE_WHITESPACE.test(ch)) {
      const start = i
      while (i < len && RE_WHITESPACE.test(sql[i])) i++
      tokens.push(sql.slice(start, i))
      continue
    }
    if (ch === "'") {
      const start = i
      i++
      while (i < len && sql[i] !== "'") { if (sql[i] === '\\') i++; i++ }
      i++
      tokens.push(sql.slice(start, i))
      continue
    }
    if (ch === '"') {
      const start = i
      i++
      while (i < len && sql[i] !== '"') { if (sql[i] === '\\') i++; i++ }
      i++
      tokens.push(sql.slice(start, i))
      continue
    }
    if (ch === '`') {
      const start = i
      i++
      while (i < len && sql[i] !== '`') i++
      i++
      tokens.push(sql.slice(start, i))
      continue
    }
    if (ch === '-' && sql[i + 1] === '-') {
      const start = i
      while (i < len && sql[i] !== '\n') i++
      tokens.push(sql.slice(start, i))
      continue
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const start = i
      i += 2
      while (i < len - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2
      tokens.push(sql.slice(start, i))
      continue
    }
    if (ch === '(' || ch === ')' || ch === ',' || ch === ';' || ch === '*') {
      tokens.push(ch)
      i++
      continue
    }
    if (ch === '<' || ch === '>' || ch === '=' || ch === '!') {
      const start = i
      i++
      if (i < len && (sql[i] === '=' || sql[i] === '<' || sql[i] === '>')) i++
      tokens.push(sql.slice(start, i))
      continue
    }
    const start = i
    while (i < len && RE_WORD_BOUNDARY.test(sql[i])) i++
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

function uppercaseKeywords(sql) {
  const tokens = tokenize(sql)
  return tokens.map(t => KEYWORD_SET.has(t.toUpperCase()) ? t.toUpperCase() : t).join('')
}

function lowercaseKeywords(sql) {
  const tokens = tokenize(sql)
  return tokens.map(t => KEYWORD_SET.has(t.toUpperCase()) ? t.toLowerCase() : t).join('')
}

function highlightSql(sql) {
  const tokens = tokenize(sql)
  const parts = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const upper = token.toUpperCase()
    const ch = token[0]
    if (ch <= ' ' && /^\s+$/.test(token)) { parts.push(token); continue }
    if (KEYWORD_SET.has(upper)) { parts.push('<span class="sql-keyword">', token, '</span>'); continue }
    if (ch === "'" || ch === '"') { parts.push('<span class="sql-string">', escapeHtml(token), '</span>'); continue }
    if (ch >= '0' && ch <= '9') { parts.push('<span class="sql-number">', token, '</span>'); continue }
    if (ch === '-' && token[1] === '-') { parts.push('<span class="sql-comment">', escapeHtml(token), '</span>'); continue }
    if (ch === '/' && token[1] === '*') { parts.push('<span class="sql-comment">', escapeHtml(token), '</span>'); continue }
    if (ch === '`') { parts.push('<span class="sql-identifier">', escapeHtml(token), '</span>'); continue }
    parts.push(escapeHtml(token))
  }
  return parts.join('')
}

function escapeHtml(str) {
  if (str.indexOf('&') === -1 && str.indexOf('<') === -1 && str.indexOf('>') === -1) return str
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function computeSqlOutput(text, mode) {
  if (!text.trim()) return ''
  if (mode === 'format') return formatSql(text)
  if (mode === 'minify') return minifySql(text)
  if (mode === 'uppercase') return uppercaseKeywords(text)
  if (mode === 'lowercase') return lowercaseKeywords(text)
  return ''
}

function autoResize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function SqlPage() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('format')
  const inputRef = useRef(null)
  const outputRef = useRef(null)

  const output = useMemo(() => computeSqlOutput(input, mode), [input, mode])
  const highlightedOutput = useMemo(() => output ? highlightSql(output) : '', [output])

  useLayoutEffect(() => {
    autoResize(inputRef.current)
    autoResize(outputRef.current)
  }, [input, output])

  const handleCopy = useCallback(() => {
    const content = output || input
    if (!content) return
    navigator.clipboard.writeText(content)
  }, [output, input])

  const handleClear = useCallback(() => setInput(''), [])
  const setFormatMode = useCallback(() => setMode('format'), [])
  const setMinifyMode = useCallback(() => setMode('minify'), [])
  const setUpperMode = useCallback(() => setMode('uppercase'), [])
  const setLowerMode = useCallback(() => setMode('lowercase'), [])

  return (
    <div className="sql-page">
      <h1>SQL Tools</h1>
      <p className="page-subtitle">Format, minify, and transform SQL queries</p>

      <div className="sql-panels">
        <div className="sql-panel">
          <div className="panel-header">
            <span>Input</span>
            <span className="panel-info">{input.length} chars</span>
          </div>
          <textarea
            ref={inputRef}
            className="sql-editor"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your SQL here..."
            spellCheck={false}
          />
        </div>

        <div className="sql-actions">
          <button onClick={handleCopy} className="btn-secondary">Copy</button>
          <button onClick={handleClear} className="btn-secondary">Clear</button>
          <div className="actions-divider" />
          <button onClick={setFormatMode} className={mode === 'format' ? 'btn-primary' : ''}>Format</button>
          <button onClick={setMinifyMode} className={mode === 'minify' ? 'btn-primary' : ''}>Minify</button>
          <button onClick={setUpperMode} className={mode === 'uppercase' ? 'btn-primary' : ''}>UPPERCASE</button>
          <button onClick={setLowerMode} className={mode === 'lowercase' ? 'btn-primary' : ''}>lowercase</button>
        </div>

        <div className="sql-panel">
          <div className="panel-header">
            <span>Output ({mode === 'format' ? 'Formatted' : mode === 'minify' ? 'Minified' : mode === 'uppercase' ? 'UPPERCASE' : 'lowercase'})</span>
            <span className="panel-info">{output.length} chars</span>
          </div>
          <div className="sql-editor sql-output" ref={outputRef}>
            {highlightedOutput ? (
              <pre className="sql-highlighted" dangerouslySetInnerHTML={{ __html: highlightedOutput }} />
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
