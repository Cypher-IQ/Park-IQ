import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../../context/AuthContext'
import { supportAPI } from '../../services/api'
import {
  MessageCircle, Send, Plus, ShieldAlert, Ticket, RefreshCw, Paperclip,
  CheckCheck, Clock3, AlertTriangle, Filter, ImageIcon, Mic, UserCheck,
  CornerDownRight, CircleDot, Wifi, WifiOff, X
} from 'lucide-react'
import toast from 'react-hot-toast'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

const CATEGORY_OPTIONS = [
  { value: 'payment_issue', label: 'Payment Issue', tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  { value: 'qr_code_issue', label: 'QR Code Issue', tone: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
  { value: 'refund_issue', label: 'Refund Issue', tone: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
  { value: 'entry_exit_issue', label: 'Parking Entry/Exit Issue', tone: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  { value: 'slot_booking_issue', label: 'Slot Booking Issue', tone: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
  { value: 'vehicle_number_issue', label: 'Vehicle Number Issue', tone: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
  { value: 'other', label: 'Other Issue', tone: 'bg-white/10 text-gray-200 border-white/15' },
]

const QUICK_REPLIES = {
  payment_issue: ['My payment was debited twice', 'Please check my parking fee', 'I need a payment update'],
  qr_code_issue: ['QR code is not scanning', 'QR code is missing in my booking', 'Scanner shows invalid code'],
  refund_issue: ['Request refund for this booking', 'I was charged incorrectly', 'Refund status update needed'],
  entry_exit_issue: ['Gate entry failed', 'Exit did not record', 'My car is stuck at the gate'],
  slot_booking_issue: ['Slot is not showing available', 'I cannot confirm booking', 'Booking failed at checkout'],
  vehicle_number_issue: ['Wrong vehicle number in booking', 'Please update my number plate', 'Vehicle details are incorrect'],
  other: ['I need help with my parking ticket', 'Please review my issue', 'Need support assistance'],
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
]

const categoryLabel = (value) => CATEGORY_OPTIONS.find((option) => option.value === value)?.label || 'Other Issue'
const categoryTone = (value) => CATEGORY_OPTIONS.find((option) => option.value === value)?.tone || 'bg-white/10 text-gray-200 border-white/15'

const buildMessageKey = (thread, index) => `${thread.ticketId || thread._id}-${index}`

function ReadReceipt({ message, mode }) {
  const readBy = message.readBy || []
  const oppositeRole = mode === 'admin' ? 'user' : 'support'
  const seen = readBy.some((entry) => entry.role === oppositeRole)

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${seen ? 'text-cyan-300' : 'text-gray-500'}`}>
      {seen ? <CheckCheck className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}
      {seen ? 'Seen' : 'Sent'}
    </span>
  )
}

export default function SupportCenter({ adminMode = false }) {
  const { user } = useAuth()
  const [threads, setThreads] = useState([])
  const [selectedThread, setSelectedThread] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [remoteTyping, setRemoteTyping] = useState(false)
  const [typingBy, setTypingBy] = useState('')
  const [category, setCategory] = useState('payment_issue')
  const [priority, setPriority] = useState('normal')
  const [subject, setSubject] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const socketRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const selectedThreadRef = useRef(null)

  const api = useMemo(() => ({
    list: adminMode ? supportAPI.adminGetThreads : supportAPI.getThreads,
    create: supportAPI.createThread,
    reply: adminMode ? supportAPI.adminReplyToThread : supportAPI.addMessage,
    read: adminMode ? supportAPI.adminMarkThreadRead : supportAPI.markThreadRead,
    assign: supportAPI.adminAssignThread,
    status: adminMode ? supportAPI.adminUpdateStatus : supportAPI.closeThread,
  }), [adminMode])

  const loadThreads = useCallback(async () => {
    try {
      const params = adminMode ? { limit: 100, status: statusFilter === 'all' ? undefined : statusFilter, category: categoryFilter === 'all' ? undefined : categoryFilter } : undefined
      const res = await api.list(params)
      const list = res.data.data || []
      setThreads(list)
      if (!selectedThreadRef.current && list.length && adminMode) {
        setSelectedThread(list[0])
        selectedThreadRef.current = list[0]
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load support tickets')
    } finally {
      setLoading(false)
    }
  }, [adminMode, api, categoryFilter, statusFilter])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        path: '/socket.io/',
      })
    }

    const socket = socketRef.current

    const handleConnect = () => setSocketConnected(true)
    const handleDisconnect = () => setSocketConnected(false)
    const handleTyping = (payload) => {
      if (selectedThreadRef.current && payload?.ticketId === (selectedThreadRef.current.ticketId || selectedThreadRef.current._id)) {
        setRemoteTyping(Boolean(payload?.isTyping))
        setTypingBy(payload?.senderName || '')
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
          setRemoteTyping(false)
          setTypingBy('')
        }, 1800)
      }
    }
    const handleMessageEvent = (payload) => {
      if (!payload?.thread) return
      setThreads((prev) => prev.map((thread) => (thread._id === payload.thread._id ? payload.thread : thread)))
      if (selectedThreadRef.current && payload.thread._id === selectedThreadRef.current._id) {
        setSelectedThread(payload.thread)
        selectedThreadRef.current = payload.thread
        api.read(payload.thread._id).catch(() => {})
      }
    }
    const handleStatusEvent = (payload) => {
      if (!payload?.ticketId) return
      setThreads((prev) => prev.map((thread) => (thread.ticketId === payload.ticketId ? { ...thread, status: payload.status } : thread)))
      if (selectedThreadRef.current && (selectedThreadRef.current.ticketId === payload.ticketId || selectedThreadRef.current._id === payload.ticketId)) {
        setSelectedThread((prev) => prev ? { ...prev, status: payload.status } : prev)
      }
    }
    const handleTicketCreated = (payload) => {
      if (!payload?.thread) return
      const isMyTicket = payload.thread.userId === user?.id || payload.thread.userId === user?._id
      if (!adminMode && !isMyTicket) return
      setThreads((prev) => {
        const exists = prev.some((thread) => thread._id === payload.thread._id)
        return exists ? prev.map((thread) => (thread._id === payload.thread._id ? payload.thread : thread)) : [payload.thread, ...prev]
      })
    }
    const handleRead = (payload) => {
      if (!payload?.ticketId) return
      setThreads((prev) => prev.map((thread) => {
        if (thread.ticketId !== payload.ticketId && thread._id !== payload.ticketId) return thread
        const messages = (thread.messages || []).map((msg) => ({
          ...msg,
          readBy: Array.isArray(msg.readBy)
            ? (msg.readBy.some((entry) => entry.userId === payload.userId && entry.role === payload.role) ? msg.readBy : [...msg.readBy, { userId: payload.userId, role: payload.role, readAt: new Date().toISOString() }])
            : [{ userId: payload.userId, role: payload.role, readAt: new Date().toISOString() }],
        }))
        return { ...thread, messages }
      }))
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('support:typing', handleTyping)
    socket.on('support:message', handleMessageEvent)
    socket.on('support:status', handleStatusEvent)
    socket.on('support:ticket-created', handleTicketCreated)
    socket.on('support:read', handleRead)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('support:typing', handleTyping)
      socket.off('support:message', handleMessageEvent)
      socket.off('support:status', handleStatusEvent)
      socket.off('support:ticket-created', handleTicketCreated)
      socket.off('support:read', handleRead)
    }
  }, [api])

  useEffect(() => {
    const socket = socketRef.current
    const ticketId = selectedThread?.ticketId || selectedThread?._id
    if (!socket || !ticketId) return

    socket.emit('support:join', { ticketId })
    api.read(selectedThread._id).catch(() => {})
    socket.emit('support:read', { ticketId, userId: user?.id || user?._id, role: adminMode ? 'support' : 'user' })

    return () => {
      socket.emit('support:leave', { ticketId })
    }
  }, [api, adminMode, selectedThread, user?.id, user?._id])

  const selectThread = async (thread) => {
    setSelectedThread(thread)
    selectedThreadRef.current = thread
    setRemoteTyping(false)
    setTypingBy('')
    try {
      await api.read(thread._id)
    } catch {
      // best effort
    }
    loadThreads()
  }

  const handleFilePick = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const converted = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, type: file.type, url: String(reader.result) })
      reader.onerror = reject
      reader.readAsDataURL(file)
    })))

    setAttachments((prev) => [...prev, ...converted])
    event.target.value = ''
  }

  const handleTyping = (value) => {
    setMessage(value)
    const socket = socketRef.current
    const ticketId = selectedThread?.ticketId || selectedThread?._id
    if (socket && ticketId) {
      socket.emit('support:typing', {
        ticketId,
        senderName: user?.name || 'User',
        isTyping: value.trim().length > 0,
      })
    }
  }

  const submitTicket = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      const res = await api.create({
        category,
        subject: subject.trim() || categoryLabel(category),
        message: message.trim(),
        priority,
        attachments,
      })
      toast.success('Support ticket created')
      setMessage('')
      setAttachments([])
      setSubject('')
      setCategory('payment_issue')
      setPriority('normal')
      await loadThreads()
      setSelectedThread(res.data.data)
      selectedThreadRef.current = res.data.data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket')
    } finally {
      setSending(false)
    }
  }

  const sendMessage = async () => {
    if (!selectedThread || !message.trim()) return
    setSending(true)
    try {
      const res = await api.reply(selectedThread._id, { message: message.trim(), attachments })
      setSelectedThread(res.data.data)
      selectedThreadRef.current = res.data.data
      setMessage('')
      setAttachments([])
      setThreads((prev) => prev.map((thread) => (thread._id === res.data.data._id ? res.data.data : thread)))
      toast.success(adminMode ? 'Reply sent to user' : 'Message sent')
      await api.read(selectedThread._id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const assignToMe = async () => {
    if (!selectedThread) return
    try {
      const res = await api.assign(selectedThread._id)
      setSelectedThread(res.data.data)
      selectedThreadRef.current = res.data.data
      setThreads((prev) => prev.map((thread) => (thread._id === res.data.data._id ? res.data.data : thread)))
      toast.success('Ticket assigned to you')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign ticket')
    }
  }

  const setTicketStatus = async (status) => {
    if (!selectedThread) return
    try {
      const res = await api.status(selectedThread._id, { status })
      setThreads((prev) => prev.map((thread) => (thread._id === res.data.data._id ? res.data.data : thread)))
      toast.success(`Ticket marked ${status}`)
      if (status === 'resolved') {
        setSelectedThread(null)
        selectedThreadRef.current = null
      } else {
        setSelectedThread(res.data.data)
        selectedThreadRef.current = res.data.data
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const quickReplies = QUICK_REPLIES[selectedThread?.category || category] || QUICK_REPLIES.other
  const visibleThreads = threads.filter((thread) => {
    if (!adminMode) return true
    const statusMatch = statusFilter === 'all' || thread.status === statusFilter
    const categoryMatch = categoryFilter === 'all' || thread.category === categoryFilter
    return statusMatch && categoryMatch
  })

  const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'
  const getMessageReadLabel = (thread, msg) => {
    const oppositeRole = adminMode ? 'user' : 'support'
    const seen = (msg.readBy || []).some((entry) => entry.role === oppositeRole)
    return seen ? 'Seen' : 'Sent'
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="section-heading text-2xl">{adminMode ? 'Support Desk' : 'Support Center'} <span className="gradient-text">Tickets</span></h2>
          <p className="text-gray-400 text-sm">{adminMode ? 'Manage tickets, assign agents, and resolve issues.' : 'Create a dedicated ticket for each issue and chat in real time.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${socketConnected ? 'badge-success' : 'badge-warning'} inline-flex items-center gap-1`}>
            {socketConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />} {socketConnected ? 'Live' : 'Polling'}
          </span>
          <button type="button" onClick={loadThreads} className="btn-secondary text-sm inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start min-h-screen">
        <div className="w-full lg:w-[380px] shrink-0 sticky lg:top-[90px] h-fit space-y-4">
          {!adminMode && (
            <form onSubmit={submitTicket} className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Plus className="w-4 h-4 text-cyan-400" /> Create Ticket
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-field">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field" placeholder="Subject (optional)" />
              <textarea
                value={message}
                onChange={(e) => handleTyping(e.target.value)}
                className="input-field min-h-28"
                placeholder="Describe the issue clearly"
              />
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <button key={reply} type="button" onClick={() => setMessage(reply)} className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-cyan-500/30">
                    {reply}
                  </button>
                ))}
              </div>
              <label className="btn-secondary inline-flex items-center justify-center gap-2 cursor-pointer text-sm">
                <Paperclip className="w-4 h-4" /> Attach images
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFilePick} />
              </label>
              {attachments.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {attachments.map((file) => (
                    <div key={file.url} className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
                      <img src={file.url} alt={file.name} className="w-full h-20 object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <button type="submit" disabled={sending} className="btn-primary inline-flex items-center gap-2 justify-center w-full">
                <Send className="w-4 h-4" /> Create Ticket
              </button>
            </form>
          )}

          {adminMode && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Filter className="w-4 h-4 text-cyan-400" /> Filters
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button key={option.value} type="button" onClick={() => setStatusFilter(option.value)} className={`px-3 py-1.5 rounded-full text-xs border ${statusFilter === option.value ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setCategoryFilter('all')} className={`px-3 py-1.5 rounded-full text-xs border ${categoryFilter === 'all' ? 'bg-violet-500/15 border-violet-500/30 text-violet-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>All Categories</button>
                {CATEGORY_OPTIONS.map((option) => (
                  <button key={option.value} type="button" onClick={() => setCategoryFilter(option.value)} className={`px-3 py-1.5 rounded-full text-xs border ${categoryFilter === option.value ? 'bg-violet-500/15 border-violet-500/30 text-violet-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white font-semibold">
                <MessageCircle className="w-4 h-4 text-cyan-400" /> {adminMode ? 'All Tickets' : 'Your Tickets'}
              </div>
              <span className="badge badge-info">{visibleThreads.length}</span>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-gray-500 text-sm">Loading tickets...</div>
              ) : visibleThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
                  <Ticket className="w-10 h-10 text-gray-700 mb-3" />
                  <p className="font-medium text-gray-300">No tickets found</p>
                  <p className="text-xs">Create a category-based ticket to start a new conversation.</p>
                </div>
              ) : visibleThreads.map((thread) => {
                const latest = thread.lastMessage || thread.messages?.[thread.messages.length - 1]
                const unread = (thread.messages || []).some((msg) => !(msg.readBy || []).some((entry) => entry.role === (adminMode ? 'support' : 'user')))
                const key = thread.ticketId || thread._id
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectThread(thread)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all ${selectedThread?._id === thread._id ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10 hover:bg-white/8'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-white font-semibold truncate">{thread.subject}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${categoryTone(thread.category)}`}>{categoryLabel(thread.category)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider">
                          <span>{thread.ticketId || thread._id?.slice(-8)}</span>
                          <span>•</span>
                          <span>{thread.priority || 'normal'}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider ${thread.status === 'resolved' ? 'text-emerald-400' : thread.status === 'pending' ? 'text-amber-400' : 'text-cyan-400'}`}>
                        {thread.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-400 line-clamp-2">{latest?.message || 'No messages yet.'}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                      <span>{formatDate(thread.updatedAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        {unread ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> : <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />}
                        {unread ? 'Unread' : 'Read'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 w-full lg:w-0">
          <div className="glass-card p-5 flex flex-col min-h-[60vh]">
            {selectedThread ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-white font-semibold text-lg">{selectedThread.subject}</h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${categoryTone(selectedThread.category)}`}>{categoryLabel(selectedThread.category)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>Ticket #{selectedThread.ticketId || selectedThread._id?.slice(-8)}</span>
                      <span>Status: {selectedThread.status}</span>
                      <span>Priority: {selectedThread.priority || 'normal'}</span>
                      <span>{selectedThread.assignedAgentName || 'Unassigned'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {adminMode && (
                      <>
                        <button type="button" onClick={assignToMe} className="btn-secondary text-xs inline-flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" /> Assign To Me
                        </button>
                        <button type="button" onClick={() => setTicketStatus('pending')} className="btn-secondary text-xs">Mark Pending</button>
                        <button type="button" onClick={() => setTicketStatus('resolved')} className="btn-secondary text-xs">Resolve</button>
                      </>
                    )}
                    <button type="button" onClick={() => { setSelectedThread(null); selectedThreadRef.current = null }} className="btn-secondary text-xs inline-flex items-center gap-1" title="Close detail view">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 mb-4 space-y-4">
                  {(selectedThread.messages || []).map((msg, index) => {
                    const fromUser = msg.senderType === 'user'
                    const fromSupport = msg.senderType === 'support'
                    const mySide = adminMode ? fromSupport : fromUser
                    return (
                      <div key={buildMessageKey(selectedThread, index)} className={`flex ${mySide ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] sm:max-w-[75%] rounded-3xl p-4 text-sm border ${mySide ? 'bg-gradient-to-br from-cyan-500/15 to-violet-500/10 border-cyan-500/20' : 'bg-white/5 border-white/10'}`}>
                          <div className="flex items-center justify-between gap-3 mb-2 text-[10px] uppercase tracking-wider text-gray-500">
                            <span>{msg.senderName || msg.senderType}</span>
                            <span className="flex items-center gap-2">
                              <span>{formatDate(msg.createdAt)}</span>
                              <ReadReceipt message={msg} mode={adminMode ? 'admin' : 'user'} />
                            </span>
                          </div>
                          <p className="text-gray-100 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {msg.attachments.map((file) => (
                                <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="group block rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                                  {String(file.type || '').startsWith('image') ? (
                                    <img src={file.url} alt={file.name || 'attachment'} className="w-full h-28 object-cover group-hover:scale-105 transition-transform" />
                                  ) : (
                                    <div className="h-28 flex items-center justify-center text-gray-300 text-xs px-3 text-center">{file.name || 'Attachment'}</div>
                                  )}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {remoteTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/10 rounded-3xl px-4 py-3 text-sm text-gray-300 inline-flex items-center gap-2">
                        <CircleDot className="w-4 h-4 text-cyan-400 animate-pulse" />
                        {typingBy || 'Support'} is typing...
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply) => (
                      <button key={reply} type="button" onClick={() => setMessage(reply)} className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-cyan-500/30 inline-flex items-center gap-1">
                        <CornerDownRight className="w-3 h-3" /> {reply}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="relative">
                      <input
                        value={message}
                        onChange={(e) => handleTyping(e.target.value)}
                        onFocus={() => {
                          const socket = socketRef.current
                          const ticketId = selectedThread?.ticketId || selectedThread?._id
                          if (socket && ticketId) {
                            socket.emit('support:read', { ticketId, userId: user?.id || user?._id, role: adminMode ? 'support' : 'user' })
                          }
                        }}
                        placeholder={adminMode ? 'Type your reply to the customer' : 'Type your message'}
                        className="input-field pr-12"
                      />
                      <label className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-300 cursor-pointer">
                        <ImageIcon className="w-4 h-4" />
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFilePick} />
                      </label>
                    </div>
                    <button onClick={sendMessage} disabled={sending} className="btn-primary inline-flex items-center gap-2 justify-center">
                      <Send className="w-4 h-4" /> {adminMode ? 'Reply' : 'Send'}
                    </button>
                  </div>

                  {attachments.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {attachments.map((file) => (
                        <div key={file.url} className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                          <img src={file.url} alt={file.name} className="w-full h-20 object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                <ShieldAlert className="w-12 h-12 mb-3 text-gray-700" />
                <p className="font-medium text-gray-300">{adminMode ? 'Select a ticket to manage' : 'Start a support ticket'}</p>
                <p className="text-sm mb-6">{adminMode ? 'Tickets are listed on the left. Pick one to reply, assign, or resolve.' : 'Describe the issue and create a dedicated support conversation.'}</p>
                {!adminMode && (
                  <div className="text-xs text-gray-500 inline-flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5" /> Separate ticket conversations keep each issue organized.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
