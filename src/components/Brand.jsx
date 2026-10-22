import mmczLogoUrl from '../assets/mmcz-logo.jpg';
/* ---------- brand ---------- */
export function Crest({ size = 34 }) {
  return (
    <svg viewBox="0 0 48 56" width={(size * 48) / 56} height={size} aria-label="MMCZ">
      <path d="M24 2 L44 9 V27 C44 41 35 50 24 54 C13 50 4 41 4 27 V9Z" fill="#C9A24A" />
      <path d="M24 7 L39 12.5 V27 C39 38 32 45 24 48.5 C16 45 9 38 9 27 V12.5Z" fill="#0A1E45" />
      <path d="M14 36 L20 24 L24 30 L29 21 L35 36Z" fill="#C9A24A" />
      <text
        x="24"
        y="19"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="800"
        fill="#C9A24A"
        fontFamily="Manrope, Arial, sans-serif"
      >
        MMCZ
      </text>
    </svg>
  );
}

export const MMCZ_LOGO = mmczLogoUrl;

export function Logo({ src, size, plate }) {
  return (
    <img
      className="logo-img"
      src={src || MMCZ_LOGO}
      alt="Minerals Marketing Corporation of Zimbabwe"
      style={{
        height: (size || 34) + 'px',
        width: 'auto',
        background: '#fff',
        borderRadius: plate ? '8px' : '4px',
        padding: plate ? '6px 10px' : '2px 4px',
        boxSizing: 'content-box',
        objectFit: 'contain',
        display: 'block',
        maxWidth: 'none',
      }}
    />
  );
}
