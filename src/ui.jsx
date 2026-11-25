import { useEffect, useRef } from 'react';

export const Gem = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" aria-hidden="true">
    <path d="M34 24h52l24 28-50 56L10 52z M10 52h100 M34 24l26 28 26-28 M48 52l12 56 12-56" />
  </svg>
);

export const Spark = ({ className = '' }) => (
  <svg className={'spark ' + className} viewBox="-9 -9 18 18" aria-hidden="true">
    <path d="M0,-9 C1,-1.5 1.5,-1 9,0 C1.5,1 1,1.5 0,9 C-1,1.5 -1.5,1 -9,0 C-1.5,-1 -1,-1.5 0,-9Z" fill="currentColor" />
  </svg>
);

export const Loader = () => <div className="loader" role="status" aria-label="Loading"><Gem size={40} /></div>;

// Adds class "in" when the element scrolls into view (fade-up animation in CSS).
export function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); }
    }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

// Shrinks a photo in the browser so it fits in Firestore (no paid Storage needed).
export function compress(file, max = 700, quality = 0.7) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

/* ---------- Ratings ---------- */
export const Stars = ({ value = 0, size = 14 }) => (
  <span className="stars" style={{ fontSize: size }} role="img" aria-label={`${value.toFixed ? value.toFixed(1) : value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map(n => <span key={n} className={n <= Math.round(value) ? 'on' : ''} aria-hidden="true">★</span>)}
  </span>
);

// Small "4.3 ★ (12)" badge, Flipkart style.
export const RatingBadge = ({ avg, count }) => count > 0 && (
  <span className="rbadge" aria-label={`Rated ${avg.toFixed(1)} out of 5 by ${count} ${count === 1 ? 'customer' : 'customers'}`}>
    <b>{avg.toFixed(1)} ★</b><span>({count})</span>
  </span>
);

export function StarInput({ value, onChange }) {
  return (
    <div className="starin" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={n <= value ? 'on' : ''} onClick={() => onChange(n)}>★</button>
      ))}
    </div>
  );
}

/* ---------- Reels: Instagram reel, YouTube Shorts/video, or a direct .mp4 link ---------- */
export function reelEmbed(url) {
  const u = (url || '').trim();
  if (!u) return null;
  let m = u.match(/instagram\.com\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([\w-]+)/i);
  if (m) return { kind: 'frame', src: `https://www.instagram.com/reel/${m[1]}/embed` };
  m = u.match(/(?:youtube\.com\/(?:shorts\/|embed\/|watch\?(?:.*&)?v=)|youtu\.be\/)([\w-]{6,})/i);
  if (m) return { kind: 'frame', src: `https://www.youtube.com/embed/${m[1]}` };
  if (/^https:\/\/\S+\.(mp4|webm|mov)(\?\S*)?$/i.test(u)) return { kind: 'video', src: u };
  return null;
}

export function Reel({ url, title }) {
  const e = reelEmbed(url);
  if (!e) return null;
  return (
    <div className="reel">
      {e.kind === 'video'
        ? <video src={e.src} controls playsInline preload="metadata" aria-label={title} />
        : <iframe src={e.src} title={title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />}
    </div>
  );
}
