import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import './App.css'

const TimePage = lazy(() => import('./pages/TimePage'))
const JsonPage = lazy(() => import('./pages/JsonPage'))
const SqlPage = lazy(() => import('./pages/SqlPage'))
const RedisPage = lazy(() => import('./pages/RedisPage'))

function App() {
  return (
    <HashRouter>
      <Navbar />
      <main>
        <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/time" replace />} />
            <Route path="/time" element={<TimePage />} />
            <Route path="/json" element={<JsonPage />} />
            <Route path="/sql" element={<SqlPage />} />
            <Route path="/redis" element={<RedisPage />} />
          </Routes>
        </Suspense>
      </main>
    </HashRouter>
  )
}

export default App
