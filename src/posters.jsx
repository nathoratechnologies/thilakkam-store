import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from './ctx';
import { SHOP } from './config';
import { Spark } from './ui';

// Shown until the admin adds a poster in Dashboard > Posters.
export const DEMO_POSTER = {
  id: 'demo', tag: 'Coming soon', title: 'Shop opening soon',
  text: `${SHOP.name} ${SHOP.tagline}. Fashion ornaments for ladies and gents. Grand opening offers on the way!`,
};
export const POSTER_TAGS = ['Shop offer', 'Item offer', 'New arrivals', 'Coming soon', 'News'];

// Active posters, newest first; the demo poster if there are none yet.
export function usePosters() {
  const { posters } = useShop();
  if (posters === null) return null;
  const live = posters.filter(p => p.active !== false);
  return live.length ? live : [DEMO_POSTER];
}

// Auto-advancing index; pauses while `hold` is true.
function useSlides(n, hold, ms = 4500) {
  const [i, setI] = useState(0);
  useEffect(() => { if (i >= n) setI(0); }, [n, i]);
  useEffect(() => {
    if (n < 2 || hold) return;
    const t = setInterval(() => setI(x => (x + 1) % n), ms);
    return () => clearInterval(t);
  }, [n, hold, ms]);
  return [Math.min(i, Math.max(0, n - 1)), setI];
}

/* One poster: a photo with text on top, or a designed text poster when there is no photo. */
export function Poster({ p, onGo }) {
  const { products } = useShop();
  const item = p.productId && (products || []).find(x => x.id === p.productId);
  return (
    <div className={'poster' + (p.img ? ' photo' : ' design')}>
      {p.img ? <img className="pimg" src={p.img} alt="" /> : <>
        <Spark className="ps1" /><Spark className="ps2" /><Spark className="ps3" /><Spark className="ps4" />
        <div className="pglow" aria-hidden="true" />
      </>}
      <div className="ptext">
        {p.tag && <span className="ptag">{p.tag}</span>}
        {p.title && <h2 className="ptitle">{p.title}</h2>}
        {p.text && <p className="pbody">{p.text}</p>}
        {item && <Link to={'/p/' + item.id} className="btn sm" onClick={onGo}>Shop {item.name}</Link>}
        {!p.img && <span className="pbrand">{SHOP.malayalam} · {SHOP.name}</span>}
      </div>
    </div>
  );
}

function Dots({ n, i, set }) {
  if (n < 2) return null;
  return (
    <div className="pdots">
      {Array.from({ length: n }, (_, k) => <button key={k} aria-label={`Poster ${k + 1} of ${n}`} aria-pressed={k === i} onClick={() => set(k)} />)}
    </div>
  );
}

/* Sliding banner on the home page. */
export function PosterBanner() {
  const list = usePosters();
  const [hold, setHold] = useState(false);
  const [i, setI] = useSlides(list?.length || 0, hold);
  if (!list) return null;
  return (
    <section className="wrap pbanner" aria-label="Offers and news" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <div className="pslides">
        {list.map((p, k) => <div key={p.id} className={'pslide' + (k === i ? ' on' : '')} aria-hidden={k !== i}><Poster p={p} /></div>)}
      </div>
      <Dots n={list.length} i={i} set={setI} />
    </section>
  );
}

/* Animated poster popup when the website opens, once per visit. */
export function PosterPopup() {
  const list = usePosters();
  const [open, setOpen] = useState(() => { try { return !sessionStorage.getItem('tk-posters'); } catch { return true; } });
  const [i, setI] = useSlides(list?.length || 0, false, 5000);
  const close = () => { setOpen(false); try { sessionStorage.setItem('tk-posters', '1'); } catch {} };
  useEffect(() => {
    if (!open) return;
    const k = e => e.key === 'Escape' && close();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open]);
  if (!open || !list) return null;
  return (
    <div className="pmodal" role="dialog" aria-modal="true" aria-label="Offers and news" onClick={e => e.target === e.currentTarget && close()}>
      <div className="pbox">
        <button className="pclose" aria-label="Close" autoFocus onClick={close}>×</button>
        {list.map((p, k) => <div key={p.id} className={'pslide' + (k === i ? ' on' : '')} aria-hidden={k !== i}><Poster p={p} onGo={close} /></div>)}
        <Dots n={list.length} i={i} set={setI} />
      </div>
    </div>
  );
}
