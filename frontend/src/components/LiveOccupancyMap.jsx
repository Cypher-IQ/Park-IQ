import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { parkingAPI } from '../services/api'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000'
let sharedSocket = null

export default function LiveOccupancyMap() {
  const [stats, setStats] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let active = true

    const loadStats = async () => {
      try {
        const res = await parkingAPI.getStats()
        if (active) setStats(res.data.data)
      } catch {
        // best effort
      }
    }

    loadStats()

    if (!sharedSocket) {
      sharedSocket = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        upgrade: true,
      })
    }

    const socket = sharedSocket

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to gateway')
      setConnected(true)
    })

    socket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message)
      setConnected(false)
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason)
      setConnected(false)
    })

    socket.on('parking:update', (payload) => {
      if (payload?.stats) {
        setStats(payload.stats)
      } else {
        loadStats()
      }
    })

    const interval = setInterval(loadStats, 15000)

    return () => {
      active = false
      clearInterval(interval)
      socket.off('connect')
      socket.off('connect_error')
      socket.off('disconnect')
      socket.off('parking:update')
    }
  }, [])

  const total = stats?.total || 0
  const occupied = stats?.occupied || 0
  const reserved = stats?.reserved || 0
  const available = stats?.available || 0
  const occupancyRate = stats?.occupancyRate || 0

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">Live Occupancy</h3>
          <p className="text-xs text-gray-500">Real-time parking updates</p>
        </div>
        <span className={`badge ${connected ? 'badge-success' : 'badge-warning'}`}>
          {connected ? 'Live' : 'Polling'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-center text-xs">
        <div className="bg-white/5 rounded-xl p-3"><p className="text-white text-lg font-bold">{total}</p><p className="text-gray-500">Total</p></div>
        <div className="bg-emerald-500/10 rounded-xl p-3"><p className="text-emerald-400 text-lg font-bold">{available}</p><p className="text-gray-500">Available</p></div>
        <div className="bg-red-500/10 rounded-xl p-3"><p className="text-red-400 text-lg font-bold">{occupied}</p><p className="text-gray-500">Occupied</p></div>
        <div className="bg-amber-500/10 rounded-xl p-3"><p className="text-amber-400 text-lg font-bold">{reserved}</p><p className="text-gray-500">Reserved</p></div>
      </div>

      <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden mb-2">
        <div className="h-full bg-gradient-to-r from-cyan-500 via-violet-500 to-rose-500 transition-all" style={{ width: `${Math.min(100, occupancyRate)}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Occupancy</span>
        <span>{occupancyRate}%</span>
      </div>
    </div>
  )
}