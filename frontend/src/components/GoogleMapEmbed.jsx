export default function GoogleMapEmbed({ latitude, longitude, label }) {
  if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
    return (
      <div className="glass-card p-5 text-sm text-gray-400">
        Map location not available for this slot.
      </div>
    )
  }

  const src = `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}&z=18&output=embed`

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold">Google Maps</h3>
          <p className="text-xs text-gray-500">{label || 'Selected parking location'}</p>
        </div>
        <a
          href={`https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`}
          target="_blank"
          rel="noreferrer"
          className="text-cyan-400 text-xs hover:text-cyan-300"
        >
          Open in Maps
        </a>
      </div>
      <div className="rounded-2xl overflow-hidden border border-white/10">
        <iframe
          title="Google Maps location"
          src={src}
          className="w-full h-64"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  )
}
