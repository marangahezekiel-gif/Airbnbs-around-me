/**
 * Decorative hero illustration: a stylised map with price pins and a floating
 * listing card. Pure SVG + CSS — no images, no map tokens, loads instantly.
 */
const PINS = [
  { price: '$96', left: '16%', top: '20%' },
  { price: '$142', left: '58%', top: '14%' },
  { price: '$64', left: '30%', top: '44%' },
  { price: '$118', left: '62%', top: '40%', active: true },
  { price: '$189', left: '14%', top: '62%' },
  { price: '$77', left: '72%', top: '58%' },
];

export function HeroMap() {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2rem] bg-[#EFF1EA] shadow-float ring-1 ring-black/5">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* water */}
        <path d="M270 -10C320 120 250 230 340 350S410 450 420 520L420 -10Z" fill="#D5E5EE" />
        {/* parks */}
        <rect x="36" y="64" width="118" height="84" rx="18" fill="#DCE8D3" />
        <rect x="64" y="300" width="92" height="110" rx="18" fill="#DCE8D3" />
        {/* blocks */}
        <g fill="#E7E9E1">
          <rect x="176" y="40" width="70" height="64" rx="10" />
          <rect x="176" y="236" width="86" height="70" rx="10" />
          <rect x="40" y="188" width="96" height="70" rx="10" />
          <rect x="176" y="340" width="100" height="80" rx="10" />
        </g>
        {/* roads */}
        <g stroke="#fff" strokeWidth="11" strokeLinecap="round" fill="none">
          <path d="M-10 160H410" />
          <path d="M-10 330H410" />
          <path d="M160 -10V510" />
          <path d="M300 -10 280 510" />
          <path d="M-10 440 410 250" strokeWidth="7" />
        </g>
      </svg>

      {/* you-are-here dot */}
      <span className="absolute left-[44%] top-[50%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#2B7FFF] shadow-md">
        <span className="absolute -inset-1 animate-pulse-ring rounded-full bg-[#2B7FFF]/40" />
      </span>

      {PINS.map((p) => (
        <span
          key={p.price}
          style={{ left: p.left, top: p.top }}
          className={`absolute rounded-full px-3 py-1.5 text-[13px] font-bold shadow-pin ${
            p.active ? 'z-10 scale-110 bg-charcoal-900 text-white' : 'bg-white text-charcoal-900'
          }`}
        >
          {p.price}
        </span>
      ))}

      {/* floating listing card */}
      <div className="absolute inset-x-4 bottom-4 flex animate-fade-up items-center gap-3 rounded-2xl bg-white p-3 shadow-float">
        <div className="h-16 w-20 shrink-0 rounded-xl bg-gradient-to-br from-coral-200 via-coral-100 to-sand-200" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">Sunny loft near the old town</p>
          <p className="text-xs text-charcoal-500">
            <span className="text-coral-500">★</span> 4.93 · 0.4 km from you
          </p>
          <p className="mt-0.5 text-sm">
            <b>$118</b> <span className="text-charcoal-500">night</span>
          </p>
        </div>
      </div>
    </div>
  );
}
