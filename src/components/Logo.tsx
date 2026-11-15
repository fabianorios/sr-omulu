interface LogoProps {
  size?: number
  className?: string
  /** When true, show only the circular emblem (crop out caption text). */
  emblemOnly?: boolean
}

export function Logo({
  size = 48,
  className = '',
  emblemOnly = false,
}: LogoProps) {
  const height = emblemOnly ? size : Math.round(size * 1.28)

  return (
    <img
      src="/logo-senhor-omulu.jpg"
      alt="T.U Sr. Omulu Irmãos de Fé"
      width={size}
      height={height}
      className={[
        'block object-contain object-top',
        emblemOnly ? 'rounded-full object-cover' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        emblemOnly
          ? {
              width: size,
              height: size,
              objectPosition: '50% 18%',
            }
          : {
              width: size,
              height: height,
            }
      }
      decoding="async"
    />
  )
}
