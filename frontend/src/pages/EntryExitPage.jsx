import { useState, useRef, useEffect } from 'react'
import { bookingAPI } from '../services/api'
import { QrCode, LogIn, LogOut, AlertCircle, Clock, Car, Zap, Camera, X } from 'lucide-react'
import toast from 'react-hot-toast'

function ResultCard({ data, type }) {
  if (!data) return null
  const isEntry = type === 'entry'

  return (
    <div className={`glass-card p-6 border animate-slide-up ${isEntry ? 'border-emerald-500/30' : 'border-violet-500/30'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isEntry ? 'bg-emerald-500/15' : 'bg-violet-500/15'}`}>
          {isEntry ? <LogIn className="w-6 h-6 text-emerald-400" /> : <LogOut className="w-6 h-6 text-violet-400" />}
        </div>
        <div>
          <p className={`font-bold text-lg ${isEntry ? 'text-emerald-400' : 'text-violet-400'}`}>
            {isEntry ? 'Entry Confirmed' : 'Exit Processed'}
          </p>
          <p className="text-gray-500 text-xs">{new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {data.booking?.slotId && (
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Car className="w-3.5 h-3.5" /> Slot</p>
            <p className="text-white font-semibold">{data.booking.slotId?.slotId || data.booking.slotId}</p>
          </div>
        )}
        {data.booking?.status && (
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-1">Status</p>
            <p className="text-white font-semibold capitalize">{data.booking.status}</p>
          </div>
        )}
        {data.duration && (
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Duration</p>
            <p className="text-white font-semibold">{data.duration} min</p>
          </div>
        )}
        {data.price !== undefined && (
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Amount</p>
            <p className="text-white font-bold text-lg gradient-text">${data.price?.toFixed(2)}</p>
          </div>
        )}
      </div>

      {data.payment && (
        <div className={`mt-4 p-3 rounded-xl ${data.payment.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          <p className="text-xs font-medium">
            Payment: <span className={data.payment.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>
              {data.payment.status === 'success' ? '✓ Processed Successfully' : '✗ Payment Failed'}
            </span>
          </p>
          {data.payment.transactionId && (
            <p className="text-gray-500 text-xs mt-1">TXN: {data.payment.transactionId}</p>
          )}
        </div>
      )}
    </div>
  )
}

function QrScanner({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const containerRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let scanner
    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText)
            scanner.stop().catch(() => {})
          },
          () => {}
        )
      } catch {
        setError('Camera access denied. Use manual input instead.')
      }
    }
    start()
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-4 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white z-10">
          <X className="w-6 h-6" />
        </button>
        <p className="text-white font-semibold text-center mb-3">Scan QR Code</p>
        {error ? (
          <p className="text-red-400 text-sm text-center p-8">{error}</p>
        ) : (
          <div id="qr-reader" ref={containerRef} className="w-full [&_video]:rounded-xl" />
        )}
      </div>
    </div>
  )
}

export default function EntryExitPage() {
  const [entryQR, setEntryQR] = useState('')
  const [exitQR, setExitQR] = useState('')
  const [entryResult, setEntryResult] = useState(null)
  const [exitResult, setExitResult] = useState(null)
  const [loadingEntry, setLoadingEntry] = useState(false)
  const [loadingExit, setLoadingExit] = useState(false)
  const [activeTab, setActiveTab] = useState('entry')
  const [showScanner, setShowScanner] = useState(false)

  const handleEntry = async () => {
    if (!entryQR.trim()) return toast.error('Please enter or scan a QR code')
    setLoadingEntry(true)
    setEntryResult(null)
    try {
      const res = await bookingAPI.scanEntry(entryQR.trim())
      setEntryResult(res.data)
      toast.success('Entry recorded! Welcome 🚗')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid QR code')
    } finally {
      setLoadingEntry(false)
    }
  }

  const handleExit = async () => {
    if (!exitQR.trim()) return toast.error('Please enter or scan a QR code')
    setLoadingExit(true)
    setExitResult(null)
    try {
      const res = await bookingAPI.scanExit(exitQR.trim())
      setExitResult(res.data)
      toast.success('Exit processed! Drive safe 👋')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid QR code')
    } finally {
      setLoadingExit(false)
    }
  }

  const handleQrScan = (data) => {
    if (activeTab === 'entry') {
      setEntryQR(data)
    } else {
      setExitQR(data)
    }
    setShowScanner(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="section-heading text-3xl">QR <span className="gradient-text">Entry & Exit</span></h1>
        <p className="text-gray-400">Scan or paste your QR code to record vehicle entry or exit.</p>
      </div>

      {/* Tab Switcher */}
      <div className="glass-card p-1.5 rounded-2xl flex gap-1.5 mb-6 w-fit">
        {[
          { id: 'entry', label: 'Vehicle Entry', icon: LogIn, color: 'text-emerald-400' },
          { id: 'exit', label: 'Vehicle Exit', icon: LogOut, color: 'text-violet-400' },
        ].map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 text-white shadow-sm border border-white/15'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Entry Panel */}
      {activeTab === 'entry' && (
        <div className="animate-fade-in">
          <div className="glass-card p-7 mb-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Record Entry</h2>
                <p className="text-gray-500 text-sm">Paste the QR code value from the booking confirmation</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-300 font-medium mb-2 block" htmlFor="entry-qr-input">
                  QR Code / Booking Token
                </label>
                <textarea
                  id="entry-qr-input"
                  rows={3}
                  placeholder="Paste QR code value here..."
                  value={entryQR}
                  onChange={e => setEntryQR(e.target.value)}
                  className="input-field resize-none text-sm font-mono"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowScanner(true)}
                  className="btn-secondary flex items-center justify-center gap-2 px-4"
                >
                  <Camera className="w-5 h-5" /> Scan
                </button>
                <button
                  id="entry-submit-btn"
                  onClick={handleEntry}
                  disabled={loadingEntry}
                  className="btn-primary flex items-center justify-center gap-2 flex-1"
                >
                  {loadingEntry ? (
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <><LogIn className="w-5 h-5" /> Confirm Entry</>
                  )}
                </button>
              </div>
            </div>
          </div>
          <ResultCard data={entryResult} type="entry" />
        </div>
      )}

      {/* Exit Panel */}
      {activeTab === 'exit' && (
        <div className="animate-fade-in">
          <div className="glass-card p-7 mb-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Process Exit</h2>
                <p className="text-gray-500 text-sm">Duration & payment will be calculated automatically</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-300 font-medium mb-2 block" htmlFor="exit-qr-input">
                  QR Code / Booking Token
                </label>
                <textarea
                  id="exit-qr-input"
                  rows={3}
                  placeholder="Paste QR code value here..."
                  value={exitQR}
                  onChange={e => setExitQR(e.target.value)}
                  className="input-field resize-none text-sm font-mono"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowScanner(true)}
                  className="btn-secondary flex items-center justify-center gap-2 px-4"
                >
                  <Camera className="w-5 h-5" /> Scan
                </button>
                <button
                  id="exit-submit-btn"
                  onClick={handleExit}
                  disabled={loadingExit}
                  className="bg-gradient-to-r from-violet-600 to-purple-700 text-white font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 flex-1 hover:from-violet-500 hover:to-purple-600 transition-all shadow-lg shadow-violet-500/25"
                >
                  {loadingExit ? (
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <><LogOut className="w-5 h-5" /> Process Exit & Pay</>
                  )}
                </button>
              </div>
            </div>
          </div>
          <ResultCard data={exitResult} type="exit" />
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && <QrScanner onScan={handleQrScan} onClose={() => setShowScanner(false)} />}

      {/* Info box */}
      <div className="mt-6 glass-card p-5 flex gap-3">
        <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-400">
          <p className="font-medium text-gray-200 mb-1">How it works</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>After booking, you receive a unique QR code in your dashboard.</li>
            <li>Paste the QR code value or use the <strong>Scan</strong> button to record your vehicle's entry.</li>
            <li>On exit, duration is calculated and payment is automatically processed.</li>
            <li>Your slot then becomes <span className="text-emerald-400">Available</span> again.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
