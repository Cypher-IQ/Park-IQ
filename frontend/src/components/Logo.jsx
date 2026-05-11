// ParkIQ — Custom SVG Logo Component
export default function ParkIQLogo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="carGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22E5FF" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer rounded square background */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#logoGrad)" opacity="0.15" />
      <rect x="2" y="2" width="44" height="44" rx="12" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" />

      {/* Stylized P letterform */}
      <path
        d="M14 36V12H24C28.4 12 32 15.6 32 20C32 24.4 28.4 28 24 28H14"
        stroke="url(#logoGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />

      {/* Car silhouette below the P */}
      <g filter="url(#glow)">
        {/* Car body */}
        <rect x="10" y="33" width="28" height="8" rx="3" fill="url(#carGrad)" opacity="0.9" />
        {/* Car cabin */}
        <path d="M14 33 L17 27 L31 27 L34 33Z" fill="url(#carGrad)" opacity="0.7" />
        {/* Left wheel */}
        <circle cx="16" cy="41.5" r="3" fill="#0A0F1E" />
        <circle cx="16" cy="41.5" r="1.5" fill="url(#carGrad)" opacity="0.8" />
        {/* Right wheel */}
        <circle cx="32" cy="41.5" r="3" fill="#0A0F1E" />
        <circle cx="32" cy="41.5" r="1.5" fill="url(#carGrad)" opacity="0.8" />
        {/* Headlight */}
        <circle cx="37.5" cy="36" r="1.5" fill="#22E5FF" opacity="0.9" />
      </g>
    </svg>
  )
}
