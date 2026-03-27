import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import TimePage from './pages/TimePage'
import JsonPage from './pages/JsonPage'
import './App.css'

function App() {
  return (
    <HashRouter>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/time" replace />} />
          <Route path="/time" element={<TimePage />} />
          <Route path="/json" element={<JsonPage />} />
        </Routes>
      </main>
    </HashRouter>
  )
}

export default App
