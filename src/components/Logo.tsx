interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 48, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="32" cy="32" r="30" fill="#1B3A2A" />
      <circle cx="32" cy="32" r="26" stroke="#C4A35A" strokeWidth="1.5" opacity="0.55" />
      <path
        d="M32 12v40M22 20h20M32 36l-11 12M32 36l11 12"
        stroke="#C4A35A"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="22" r="2.8" fill="#C4A35A" />
    </svg>
  )
}
