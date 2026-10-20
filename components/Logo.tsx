/**
 * Brand mark: a location pin with a house inside.
 * Kept as inline SVG so it's crisp at any size and themeable.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* pin */}
      <path
        d="M24 2C14.06 2 6 10.06 6 20c0 13.5 15.2 24.6 17.2 26a1.4 1.4 0 0 0 1.6 0C26.8 44.6 42 33.5 42 20 42 10.06 33.94 2 24 2Z"
        fill="#FF5A4D"
      />
      {/* house */}
      <path
        d="M24 12.2 14.5 20v9.3c0 .7.6 1.3 1.3 1.3H21v-6.4h6v6.4h5.2c.7 0 1.3-.6 1.3-1.3V20L24 12.2Z"
        fill="#fff"
      />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  /** Extra classes for the wordmark, e.g. "hidden sm:inline" */
  wordmarkClassName?: string;
  className?: string;
}

export function Logo({ size = 32, wordmarkClassName = '', className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className={`text-[17px] font-extrabold leading-none tracking-tight text-charcoal-900 ${wordmarkClassName}`}>
        Airbnbs <span className="text-coral-500">Around Me</span>
      </span>
    </span>
  );
}
