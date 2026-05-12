import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarAnimation } from '../context/AnimationContext'
import { parkingAPI, pricingAPI, bookingAPI } from '../services/api'
import { CalendarDays, Clock, Car, Zap, CheckCircle, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import GoogleMapEmbed from '../components/GoogleMapEmbed'

const zones = ['A', 'B', 'C', 'D']
const zoneColors = { A: 'from-cyan-500 to-blue-500', B: 'from-violet-500 to-purple-600', C: 'from-emerald-500 to-teal-500', D: 'from-amber-500 to-orange-500' }

function SlotButton({ slot, selected, onSelect }) {
  const statusClass = {
    available: 'slot-available border cursor-pointer transition-all duration-200',
    occupied: 'slot-occupied border cursor-not-allowed opacity-60',
    reserved: 'slot-reserved border cursor-not-allowed opacity-60',
  }[slot.status] || 'slot-available border cursor-pointer'

  return (
    <button
      id={`slot-${slot._id}`}
      onClick={() => slot.status === 'available' && onSelect(slot)}
      disabled={slot.status !== 'available'}
      className={`${statusClass} rounded-lg p-2 text-xs font-bold flex flex-col items-center justify-center h-14
        ${selected?._id === slot._id ? 'ring-2 ring-cyan-400 scale-105' : ''}`}
    >
      <span>{slot.slotId}</span>
      <span className="opacity-70 text-[10px] mt-0.5">{slot.status === 'available' ? 'Free' : slot.status}</span>
    </button>
  )
}

export default function BookingPage() {
  const navigate = useNavigate()
  const { triggerCarAnimation } = useCarAnimation()
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedZone, setSelectedZone] = useState('A')
  const getLocalNow = () => {
    const d = new Date();
    const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const timeStr = d.toTimeString().substring(0, 5);
    
    const dEnd = new Date(d.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours later
    const endDateStr = new Date(dEnd.getTime() - dEnd.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const endTimeStr = dEnd.toTimeString().substring(0, 5);
    
    return { dateStr, timeStr, endDateStr, endTimeStr };
  }
  const defaults = getLocalNow();

  const [form, setForm] = useState({ 
    startDate: defaults.dateStr, 
    startTime: defaults.timeStr, 
    endDate: defaults.endDateStr, 
    endTime: defaults.endTimeStr, 
    vehicleNumber: '' 
  })

  const getFullDateTime = (d, t) => {
    if (!d || !t) return null;
    return new Date(`${d}T${t}`).toISOString();
  }
  const [pricePreview, setPricePreview] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingBook, setLoadingBook] = useState(false)
  const [booking, setBooking] = useState(null)
  const [step, setStep] = useState(1) // 1: select slot, 2: time & price, 3: confirm & QR

  useEffect(() => {
    fetchSlots(selectedZone)
  }, [selectedZone])

  const fetchSlots = async (zone) => {
    setLoadingSlots(true)
    setSelectedSlot(null)
    try {
      const res = await parkingAPI.getSlots({ zone, limit: 100 })
      setSlots(res.data.data || [])
    } catch (err) {
      toast.error('Failed to load slots')
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot)
    setStep(2)
    window.scrollTo({ top: 400, behavior: 'smooth' })
  }

  const fetchPrice = async () => {
    const startIso = getFullDateTime(form.startDate, form.startTime)
    const endIso = getFullDateTime(form.endDate, form.endTime)
    if (!startIso || !endIso) return
    try {
      const res = await pricingAPI.calculatePrice({
        startTime: startIso,
        endTime: endIso,
        occupiedSlots: slots.filter(s => s.status === 'occupied').length,
        totalSlots: slots.length,
      })
      const pricingData = res.data.data || res.data
      setPricePreview({
        basePrice: pricingData.breakdown?.basePrice ?? pricingData.basePrice,
        demandFactor: pricingData.breakdown?.demandFactor ?? pricingData.demandFactor,
        isPeak: (pricingData.breakdown?.peakMultiplier ?? 1) > 1,
        peakMultiplier: pricingData.breakdown?.peakMultiplier ?? pricingData.peakMultiplier,
        totalPrice: pricingData.totalPrice,
      })
    } catch (err) {
      console.error('Pricing error', err)
    }
  }

  useEffect(() => {
    if (form.startDate && form.startTime && form.endDate && form.endTime) fetchPrice()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startDate, form.startTime, form.endDate, form.endTime])

  const handleBook = async () => {
    const startIso = getFullDateTime(form.startDate, form.startTime)
    const endIso = getFullDateTime(form.endDate, form.endTime)
    if (!selectedSlot || !startIso || !endIso) {
      toast.error('Please fill all fields')
      return
    }
    setLoadingBook(true)
    try {
      const res = await bookingAPI.createBooking({
        slotId: selectedSlot.slotId,
        startTime: startIso,
        endTime: endIso,
        vehicleNumber: form.vehicleNumber,
      })
      setBooking(res.data.data)
      toast.success('Booking confirmed! 🎉')
      triggerCarAnimation('Slot Reserved!', 1500)
      setTimeout(() => setStep(3), 1500)
      return
    } catch (err) {
      const msg = err.response?.data?.message || ''
      const isTimeout = err.code === 'ECONNABORTED' || !err.response
      if (isTimeout) {
        toast.loading('Booking is still processing... Check your dashboard.', { duration: 5000 })
        setTimeout(() => navigate('/dashboard'), 3000)
      } else if (msg.includes('already booked')) {
        toast.error('This slot was just booked by another user or a previous request.')
      } else {
        toast.error(msg || 'Booking failed')
        setLoadingBook(false)
      }
    }
  }

  const resetBooking = () => {
    setStep(1)
    setSelectedSlot(null)
    const defaults = getLocalNow()
    setForm({ startDate: defaults.dateStr, startTime: defaults.timeStr, endDate: defaults.endDateStr, endTime: defaults.endTimeStr, vehicleNumber: '' })
    setPricePreview(null)
    setBooking(null)
    fetchSlots(selectedZone)
  }

  const startIso = getFullDateTime(form.startDate, form.startTime)
  const endIso = getFullDateTime(form.endDate, form.endTime)
  const durationHours = startIso && endIso
    ? ((new Date(endIso) - new Date(startIso)) / 3600000).toFixed(1)
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="section-heading text-3xl">Book a <span className="gradient-text">Parking Slot</span></h1>
        <p className="text-gray-400">Choose your preferred slot, set your time, and confirm.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[['Select Slot', 1], ['Set Time', 2], ['Confirmed', 3]].map(([label, s]) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${step >= s ? 'bg-gradient-to-br from-cyan-500 to-violet-600 text-white' : 'bg-white/10 text-gray-400'}`}>
              {step > s ? <CheckCircle className="w-4 h-4" /> : s}
            </div>
            <span className={`text-sm ${step >= s ? 'text-white font-medium' : 'text-gray-500'}`}>{label}</span>
            {s < 3 && <div className={`h-px w-12 ${step > s ? 'bg-cyan-500' : 'bg-white/10'} mx-2`} />}
          </div>
        ))}
      </div>

      {step === 3 && booking ? (
        /* Confirmation */
        <div className="max-w-lg mx-auto text-center">
          <div className="glass-card p-10 glow-cyan">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-xl">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-white font-black text-2xl mb-2">Booking Confirmed!</h2>
            <p className="text-gray-400 mb-6">Your slot has been reserved. Show the QR code at entry.</p>

            {booking.qrCode && (
              <div className="glass-card p-4 mb-6 inline-block">
                <img
                  src={booking.qrCode.startsWith('data:') ? booking.qrCode : `data:image/png;base64,${booking.qrCode}`}
                  alt="Booking QR Code"
                  className="w-48 h-48 mx-auto rounded-xl"
                />
                <p className="text-gray-500 text-xs mt-2">Scan at entry gate</p>
              </div>
            )}
            {/* Show QR token for manual entry simulation */}
            {booking.qrToken && (
              <div className="glass-card p-3 mb-4 text-left">
                <p className="text-gray-500 text-xs mb-1">QR Token (for Entry/Exit simulation)</p>
                <p className="text-cyan-400 text-xs font-mono break-all">{booking.qrToken}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm text-left mb-6">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1">Slot</p>
                <p className="text-white font-semibold">{selectedSlot?.slotId}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1">Zone</p>
                <p className="text-white font-semibold">Zone {selectedSlot?.zone}</p>
              </div>
            </div>

            <button onClick={resetBooking} className="btn-primary w-full">Book Another Slot</button>
            {/* Receipt download is available from the Dashboard only */}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Slot Grid */}
          <div className="lg:col-span-2">
            {/* Zone Filter */}
            <div className="flex items-center gap-2 mb-5">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-sm">Zone:</span>
              {zones.map(z => (
                <button
                  key={z}
                  id={`zone-filter-${z}`}
                  onClick={() => setSelectedZone(z)}
                  className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                    selectedZone === z
                      ? `bg-gradient-to-br ${zoneColors[z]} text-white shadow-lg`
                      : 'bg-white/10 text-gray-400 hover:bg-white/15'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Zone {selectedZone} Slots</h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="slot-available px-2.5 py-1 rounded border">Available</span>
                  <span className="slot-occupied px-2.5 py-1 rounded border">Occupied</span>
                  <span className="slot-reserved px-2.5 py-1 rounded border">Reserved</span>
                </div>
              </div>

              {loadingSlots ? (
                <div className="flex justify-center py-10">
                  <svg className="animate-spin w-8 h-8 text-cyan-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Car className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                  <p>No slots found for Zone {selectedZone}</p>
                </div>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                  {slots.map(slot => (
                    <SlotButton key={slot._id} slot={slot} selected={selectedSlot} onSelect={handleSlotSelect} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Booking Form */}
          <div className="flex flex-col gap-4">
            {selectedSlot && (
              <div className="glass-card p-5 border-cyan-500/30">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Selected Slot</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                    <Car className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{selectedSlot.slotId}</p>
                    <p className="text-gray-500 text-xs">Zone {selectedSlot.zone} — Level {selectedSlot.level}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedSlot?.location && (
              <GoogleMapEmbed
                latitude={selectedSlot.location.lat}
                longitude={selectedSlot.location.lng}
                label={selectedSlot.location.description || `Zone ${selectedSlot.zone}`}
              />
            )}

            <div className={`glass-card p-5 transition-opacity ${step >= 2 ? 'opacity-100' : 'opacity-40'}`}>
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" /> Set Duration & Vehicle
              </h3>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Start Date</label>
                    <div className="relative">
                      <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        id="booking-start-date"
                        type="date"
                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                        value={form.startDate}
                        onChange={e => setForm({ ...form, startDate: e.target.value })}
                        className="input-field pl-12 text-sm"
                        disabled={step < 2}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Start Time</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        id="booking-start-time"
                        type="time"
                        value={form.startTime}
                        onChange={e => setForm({ ...form, startTime: e.target.value })}
                        className="input-field pl-12 text-sm"
                        disabled={step < 2}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">End Date</label>
                    <div className="relative">
                      <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        id="booking-end-date"
                        type="date"
                        min={form.startDate || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                        value={form.endDate}
                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                        className="input-field pl-12 text-sm"
                        disabled={step < 2}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">End Time</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input
                        id="booking-end-time"
                        type="time"
                        value={form.endTime}
                        onChange={e => setForm({ ...form, endTime: e.target.value })}
                        className="input-field pl-12 text-sm"
                        disabled={step < 2}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Vehicle License Plate</label>
                  <div className="relative">
                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      id="booking-vehicle"
                      type="text"
                      placeholder="e.g. KA-01-AB-1234"
                      value={form.vehicleNumber}
                      onChange={e => setForm({ ...form, vehicleNumber: e.target.value })}
                      className="input-field pl-12 text-sm"
                      disabled={step < 2}
                    />
                  </div>
                </div>
                {durationHours && <p className="text-cyan-400 text-xs text-center mt-2">{durationHours} hours</p>}
              </div>
            </div>

            {/* Price Preview */}
            {pricePreview && (
              <div className="glass-card p-5 border-violet-500/30 animate-slide-up">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> Price Estimate
                </h3>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Base Rate</span>
                    <span>${pricePreview.basePrice}/hr</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Demand Factor</span>
                    <span>{(pricePreview.demandFactor * 100).toFixed(0)}%</span>
                  </div>
                  {pricePreview.isPeak && (
                    <div className="flex justify-between text-amber-400">
                      <span>Peak Multiplier</span>
                      <span>×{pricePreview.peakMultiplier}</span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-2 flex justify-between text-white font-bold text-lg">
                    <span>Total</span>
                    <span className="gradient-text">${pricePreview.totalPrice?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              id="confirm-booking-btn"
              onClick={handleBook}
              disabled={!selectedSlot || !form.startTime || !form.endTime || loadingBook}
              className="btn-primary flex items-center justify-center gap-2 w-full"
            >
              {loadingBook ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <><CalendarDays className="w-5 h-5" /> Confirm Booking</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
