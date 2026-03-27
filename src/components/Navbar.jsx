import { NavLink } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <NavLink to="/">Zalo Utils</NavLink>
      </div>
      <div className="navbar-links">
        <NavLink to="/time" className={({ isActive }) => isActive ? 'active' : ''}>
          Time / Epoch
        </NavLink>
        <NavLink to="/json" className={({ isActive }) => isActive ? 'active' : ''}>
          JSON Tools
        </NavLink>
      </div>
    </nav>
  )
}

export default Navbar
