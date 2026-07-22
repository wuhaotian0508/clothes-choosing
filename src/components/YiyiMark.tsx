export default function YiyiMark({ size = 72 }: { size?: number }) {
  return (
    <span className="yiyi-mark" style={{ width: size, height: size }} aria-label="YiYi">
      <svg viewBox="0 0 88 76" role="img" aria-hidden="true">
        <path d="M17 57c-7-3-10-9-8-16 2-7 8-11 15-11 2-11 11-18 22-18 10 0 19 6 22 16 9 0 16 6 17 15 1 8-4 14-11 17-4 2-9 2-14 2H29c-5 0-9-2-12-5Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="34" cy="43" r="3.5" fill="currentColor" />
        <circle cx="56" cy="43" r="3.5" fill="currentColor" />
        <path d="M39 51c3 3 9 3 12 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}
