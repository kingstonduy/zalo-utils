import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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

  const newLineBefore = new Set([
    'SELECT','FROM','WHERE','SET','VALUES','ORDER','GROUP','HAVING',
    'LIMIT','UNION','INSERT','UPDATE','DELETE','CREATE','ALTER','DROP',
    'JOIN','INNER','LEFT','RIGHT','FULL','CROSS','ON','AND','OR',
    'WHEN','ELSE','END','WITH','TRUNCATE',
  ])

  const indentAfter = new Set(['SELECT','SET','VALUES','('])
  const dedentBefore = new Set(['FROM','WHERE','ORDER','GROUP','HAVING','LIMIT',')'])

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const upper = token.toUpperCase()

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
    if (/\s/.test(sql[i])) {
      let start = i
      while (i < sql.length && /\s/.test(sql[i])) i++
      tokens.push(sql.slice(start, i))
      continue
    }
    if (sql[i] === "'") {
      let start = i
      i++
      while (i < sql.length && sql[i] !== "'") { if (sql[i] === '\\') i++; i++ }
      i++
      tokens.push(sql.slice(start, i))
      continue
    }
    if (sql[i] === '"') {
      let start = i
      i++
      while (i < sql.length && sql[i] !== '"') { if (sql[i] === '\\') i++; i++ }
      i++
      tokens.push(sql.slice(start, i))
      continue
    }
    if (sql[i] === '`') {
      let start = i
      i++
      while (i < sql.length && sql[i] !== '`') i++
      i++
      tokens.push(sql.slice(start, i))
      continue
    }
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let start = i
      while (i < sql.length && sql[i] !== '\n') i++
      tokens.push(sql.slice(start, i))
      continue
    }
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let start = i
      i += 2
      while (i < sql.length - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2
      tokens.push(sql.slice(start, i))
      continue
    }
    if ('(),;*'.includes(sql[i])) {
      tokens.push(sql[i])
      i++
      continue
    }
    if ('<>=!'.includes(sql[i])) {
      let start = i
      i++
      if (i < sql.length && '=<>'.includes(sql[i])) i++
      tokens.push(sql.slice(start, i))
      continue
    }
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
  return tokens.map((token) => {
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

function computeSqlOutput(text, mode) {
  if (!text.trim()) return ''
  if (mode === 'format') return formatSql(text)
  if (mode === 'minify') return minifySql(text)
  if (mode === 'uppercase') return uppercaseKeywords(text)
  if (mode === 'lowercase') return lowercaseKeywords(text)
  return ''
}

function SqlPage() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('format') // format | minify | uppercase | lowercase
  const inputRef = useRef(null)
  const outputRef = useRef(null)

  const output = useMemo(() => computeSqlOutput(input, mode), [input, mode])

  const autoResize = useCallback((el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  useEffect(() => { autoResize(inputRef.current) }, [input, autoResize])
  useEffect(() => { autoResize(outputRef.current) }, [output, autoResize])

  const handleCopy = useCallback(() => {
    const content = output || input
    if (!content) return
    navigator.clipboard.writeText(content)
  }, [output, input])

  const handleClear = useCallback(() => {
    setInput('')
  }, [])

  return (
    <div className="sql-page">
      <h1>SQL Tools</h1>
      <p className="page-subtitle">Format, minify, and transform SQL queries</p>

      {/* Editor Panels with buttons column in between */}
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
          <button onClick={() => setMode('format')} className={mode === 'format' ? 'btn-primary' : ''}>Format</button>
          <button onClick={() => setMode('minify')} className={mode === 'minify' ? 'btn-primary' : ''}>Minify</button>
          <button onClick={() => setMode('uppercase')} className={mode === 'uppercase' ? 'btn-primary' : ''}>UPPERCASE</button>
          <button onClick={() => setMode('lowercase')} className={mode === 'lowercase' ? 'btn-primary' : ''}>lowercase</button>
        </div>

        <div className="sql-panel">
          <div className="panel-header">
            <span>Output ({mode === 'format' ? 'Formatted' : mode === 'minify' ? 'Minified' : mode === 'uppercase' ? 'UPPERCASE' : 'lowercase'})</span>
            <span className="panel-info">{output.length} chars</span>
          </div>
          <div className="sql-editor sql-output" ref={outputRef}>
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
