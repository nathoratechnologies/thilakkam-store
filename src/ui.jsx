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
