/**
 * Stand-in logo redrawn from the concept. The owner supplies the original file (public/images/README.md).
 * Chewy lettering lives only here.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 460 330"
      role="img"
      aria-label="Pay N' Puff logo: a sky-blue circle with a cloud, the words Pay n' Puff, and a small white plane on a dashed flight path, with We'll Fly to You! around the top."
    >
      <defs>
        <path id="pnpArcTop" d="M88 168 A 142 142 0 0 1 372 168" />
        <path id="pnpArcBot" d="M110 214 A 124 124 0 0 0 350 214" />
        <symbol id="pnpPlane" viewBox="0 0 64 48">
          <path
            fill="currentColor"
            d="M4 22c0-2 2-3 5-3h16L36 3c1-2 3-2 5-2h3l-6 18h12l6-7h4l-3 12 3 12h-4l-6-7H38l6 18h-3c-2 0-4 0-5-2L25 29H9c-3 0-5-1-5-3z"
          />
        </symbol>
      </defs>
      <path d="M18 238 C 70 300, 180 316, 250 300 S 380 250, 406 196" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="12 9" strokeLinecap="round" />
      <circle cx="230" cy="178" r="112" fill="#17c4ee" stroke="#231a33" strokeWidth="3" />
      <g fill="#fff" stroke="#231a33" strokeWidth="2.5">
        <path d="M150 146c-4-20 16-34 33-26 6-20 36-24 46-6 14-12 38-4 38 16 18-2 28 16 20 30-8 16-28 14-36 8-8 12-30 14-40 2-12 10-34 8-40-6-16 2-26-10-21-18z" />
        <path d="M168 230c-4-14 10-24 22-18 6-12 26-12 30 2 12-4 22 6 18 18-6 10-20 8-26 2-8 8-24 8-30-2-8 4-16 2-14-2z" />
      </g>
      <g style={{ fontFamily: "var(--logo)" }} textAnchor="middle" fill="#c414b0" stroke="#231a33" strokeWidth="2" paintOrder="stroke">
        <text x="226" y="158" fontSize="56" transform="rotate(-4 226 158)">PAY</text>
        <text x="236" y="200" fontSize="34">n&apos;</text>
        <text x="232" y="256" fontSize="60" transform="rotate(3 232 256)">PUFF</text>
      </g>
      <text style={{ fontFamily: "var(--logo)" }} fontSize="28" fill="#fff" stroke="#c414b0" strokeWidth="1" letterSpacing="1.5">
        <textPath href="#pnpArcTop" startOffset="50%" textAnchor="middle">We&apos;ll Fly to You!</textPath>
      </text>
      <text style={{ fontFamily: "var(--mono)" }} fontSize="12.5" fontWeight="500" fill="#231a33" letterSpacing="2.2">
        <textPath href="#pnpArcBot" startOffset="50%" textAnchor="middle">15 DUNLOP ST E · BARRIE</textPath>
      </text>
      <use href="#pnpPlane" x="360" y="140" width="92" height="69" style={{ color: "#fff" }} transform="rotate(-18 406 174)" />
    </svg>
  );
}

export function Wordmark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`wm ${className ?? ""}`} style={style}>
      PAY <i>n&apos;</i> PUFF
    </span>
  );
}
