import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Dashboard from './components/Dashboard'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Dashboard wsUrl={import.meta.env.VITE_WS_URL || 'ws://localhost:9000/ws'} />
  </React.StrictMode>
)
