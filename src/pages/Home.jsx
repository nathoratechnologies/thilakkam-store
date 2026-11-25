import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useShop } from '../ctx';
import { CATS, SHOP, priceText, hasPrice, catName } from '../config';
import { STORE_PHOTOS } from '../catalog';
import { Gem, Spark, Loader, useReveal, Stars, RatingBadge, Reel, reelEmbed } from '../ui';
import { when } from './Orders';

function Card({ p, i }) {
  const ref = useReveal();
  const { cart, add, ratings } = useShop();
  const q = cart[p.id] || 0;
  const out = !(p.stock > 0);
  const rt = ratings[p.id];
  return (
    <article ref={ref} className="card reveal" style={{ transitionDelay: (i % 4) * 70 + 'ms' }}>
      <Link to={'/p/' + p.id} className="pic">
        {p.img ? <img src={p.img} alt={p.name} loading="lazy" /> : <Gem size={64} />}
        {out ? <span className="tag out">Sold out</span> : p.stock <= 3 ? <span className="tag">Only {p.stock} left</span> : null}
        {reelEmbed(p.reel) && <span className="tag reeltag">▶ Reel</span>}
      </Link>
      <div className="info">
        <span className="cat">{catName(p.cat)}</span>
        <Link to={'/p/' + p.id} className="name">{p.name}</Link>
        {rt && <RatingBadge avg={rt.avg} count={rt.count} />}
        <div className="row">
          <span className={'price' + (hasPrice(p.price) ? '' : ' ask')}>{priceText(p.price)}</span>
          <button className={'btn sm' + (q ? ' ghost' : '')} disabled={out || q >= p.stock} onClick={() => add(p.id, 1)}>
            {q ? `In bag (${q})` : 'Add'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const { products } = useShop();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const reels = (products || []).filter(p => reelEmbed(p.reel));
  const cats = CATS.filter(([k]) => k === 'all' || (products || []).some(p => p.cat === k));
  const list = (products || []).filter(p => (cat === 'all' || p.cat === cat) && p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <section className="hero">
        <Spark className="s1" /><Spark className="s2" /><Spark className="s3" />
        <div className="wrap hero-in">
          <div className="eyebrow rise" style={{ animationDelay: '0ms' }}>{SHOP.malayalam} · {SHOP.tagline}</div>
          <h1 className="rise" style={{ animationDelay: '120ms' }}>Ornaments that make every day <em>shine</em></h1>
          <p className="rise" style={{ animationDelay: '240ms' }}>Fashion ornaments for ladies and gents. Add to bag, place your order, and we confirm it on WhatsApp.</p>
          <a href="#shop" className="btn rise" style={{ animationDelay: '360ms' }}>Shop the collection</a>
        </div>
      </section>

      <section id="shop" className="wrap page">
        <div className="tools">
          <div className="chips" role="group" aria-label="Categories">
            {cats.map(([k, l]) => <button key={k} className="chip" aria-pressed={cat === k} onClick={() => setCat(k)}>{l}</button>)}
          </div>
          <input className="search" id="search" type="search" placeholder="Search ornaments" aria-label="Search" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {products === null ? <Loader /> : list.length === 0
          ? <p className="empty">{products.length ? 'Nothing matches. Try another search.' : 'Our new collection is coming soon.'}</p>
          : <div className="grid">{list.map((p, i) => <Card key={p.id} p={p} i={i} />)}</div>}
      </section>

      {reels.length > 0 && (
        <section className="wrap page store" aria-labelledby="reels-h">
          <h2 className="h2" id="reels-h">Reels</h2>
          <p className="muted">See the pieces up close. Tap the name to order.</p>
          <div className="strip reels">
            {reels.map(p => (
              <div className="reelcard" key={p.id}>
                <Reel url={p.reel} title={'Reel: ' + p.name} />
                <Link to={'/p/' + p.id} className="lname">{p.name}</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {STORE_PHOTOS.length > 0 && (
        <section className="wrap page store" aria-labelledby="store-h">
          <h2 className="h2" id="store-h">From our store</h2>
          <p className="muted">A peek at the collection on our shelves. Ask us on WhatsApp for anything you see here.</p>
          <div className="strip">{STORE_PHOTOS.map((src, n) => <img key={src} src={src} alt={`${SHOP.name} store display ${n + 1}`} loading="lazy" />)}</div>
        </section>
      )}
    </>
  );
}

export function Product() {
  const { id } = useParams();
  const { products, cart, add, ratings } = useShop();
  const [shown, setShown] = useState(0);
  if (products === null) return <Loader />;
  const p = products.find(x => x.id === id);
  if (!p) return <div className="wrap page narrow"><p className="empty">This item is no longer available.</p><Link to="/" className="btn">Back to shop</Link></div>;
  const q = cart[p.id] || 0;
  const out = !(p.stock > 0);
  const imgs = p.imgs?.length ? p.imgs : p.img ? [p.img] : [];
  return (
    <div className="wrap page detail fade">
      <div className="gallery">
        <div className="pic big">{imgs.length ? <img src={imgs[Math.min(shown, imgs.length - 1)]} alt={p.name} /> : <Gem size={96} />}</div>
        {imgs.length > 1 && (
          <div className="thumbs">
            {imgs.map((src, n) => (
              <button key={n} className="thumb" aria-pressed={shown === n} aria-label={`Photo ${n + 1} of ${imgs.length}`} onClick={() => setShown(n)}><img src={src} alt="" /></button>
            ))}
          </div>
        )}
      </div>
      <div className="dinfo">
        <span className="cat">{catName(p.cat)}</span>
        <h1 className="h1">{p.name}</h1>
        {ratings[p.id] && <a href="#reviews" className="rlink"><RatingBadge avg={ratings[p.id].avg} count={ratings[p.id].count} /> <span>See reviews</span></a>}
        <div className={'price big' + (hasPrice(p.price) ? '' : ' ask')}>{priceText(p.price)}</div>
        {!hasPrice(p.price) && <p className="muted small">Add it to your bag and place the order. We share the price on WhatsApp before confirming.</p>}
        {p.desc && <p className="muted">{p.desc}</p>}
        <p className="muted">{out ? 'Sold out' : p.stock <= 3 ? `Only ${p.stock} left` : 'In stock'}</p>
        <div className="actions">
          <button className="btn" disabled={out || q >= p.stock} onClick={() => add(p.id, 1)}>{q ? `Add one more (${q} in bag)` : 'Add to bag'}</button>
          {q > 0 && <Link to="/cart" className="btn ghost">Go to bag</Link>}
        </div>
        {reelEmbed(p.reel) && <div className="preel"><h2 className="h2">Watch the reel</h2><Reel url={p.reel} title={'Reel: ' + p.name} /></div>}
      </div>
      <Reviews pid={p.id} />
    </div>
  );
}

/* ---------- Ratings & reviews, Flipkart style ---------- */
const removeReview = r => {
  deleteDoc(doc(db, 'reviews', r.id));
  if (r.photoCount) deleteDoc(doc(db, 'reviewPhotos', r.id)).catch(() => {});
};
const SORTS = [['new', 'Newest'], ['high', 'Highest rated'], ['low', 'Lowest rated'], ['photos', 'With photos']];

function Reviews({ pid }) {
  const { reviews, ratings, user } = useShop();
  const [photos, setPhotos] = useState({}); // review id -> photos
  const [zoom, setZoom] = useState(null);
  const [sort, setSort] = useState('new');
  const box = useRef(null);
  const { hash } = useLocation();
  const team = user && user.role !== 'customer';

  useEffect(() => onSnapshot(query(collection(db, 'reviewPhotos'), where('productId', '==', pid)), s => {
    const m = {};
    s.docs.forEach(d => { m[d.id] = d.data().photos || []; });
    setPhotos(m);
  }, () => setPhotos({})), [pid]);
  useEffect(() => { if (hash === '#reviews') box.current?.scrollIntoView({ behavior: 'smooth' }); }, [hash]);
  useEffect(() => {
    if (!zoom) return;
    const k = e => e.key === 'Escape' && setZoom(null);
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [zoom]);

  const list = reviews.filter(r => r.productId === pid);
  const rt = ratings[pid];
  const by = { high: (a, b) => b.rating - a.rating, low: (a, b) => a.rating - b.rating, photos: (a, b) => (b.photoCount || 0) - (a.photoCount || 0) };
  const sorted = by[sort] ? [...list].sort(by[sort]) : list;
  const allPhotos = list.flatMap(r => (photos[r.id] || []).map(src => ({ src, r })));
  const Thumbs = ({ items }) => (
    <div className="cphotos">
      {items.map((x, n) => <button key={n} className="thumb" onClick={() => setZoom(x)} aria-label={`Customer photo ${n + 1} from ${x.r.name}`}><img src={x.src} alt="" loading="lazy" /></button>)}
    </div>
  );

  return (
    <section className="reviews panel" id="reviews" ref={box} aria-labelledby="rv-h">
      <h2 className="h2" id="rv-h">Ratings & reviews</h2>
      {!rt ? <p className="muted">No reviews yet. Bought this? Rate it from <Link to="/orders">My orders</Link> once it is delivered.</p> : <>
        <div className="rsum">
          <div className="ravg">
            <div className="big">{rt.avg.toFixed(1)} <span>★</span></div>
            <div className="muted small">{rt.count} {rt.count === 1 ? 'rating' : 'ratings'} · {list.filter(r => r.text).length} reviews</div>
          </div>
          <ul className="bars" aria-label="Rating breakdown">
            {[5, 4, 3, 2, 1].map(n => {
              const c = list.filter(r => r.rating === n).length;
              return <li key={n}><span>{n} ★</span><i><b className={'r' + n} style={{ width: (c / rt.count * 100) + '%' }} /></i><span>{c}</span></li>;
            })}
          </ul>
        </div>

        {allPhotos.length > 0 && <>
          <h3 className="h3">Customer photos ({allPhotos.length})</h3>
          <Thumbs items={allPhotos} />
        </>}

        <div className="chips sub" role="group" aria-label="Sort reviews">
          {SORTS.map(([k, l]) => <button key={k} className="chip sm" aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>)}
        </div>
        <ul className="rlist">
          {sorted.map(r => (
            <li key={r.id}>
              <div className="rhead"><span className={'rpill r' + r.rating}>{r.rating} ★</span><strong>{r.name || 'Customer'}</strong></div>
              {r.text && <p>{r.text}</p>}
              {(photos[r.id] || []).length > 0 && <Thumbs items={photos[r.id].map(src => ({ src, r }))} />}
              <div className="muted small">✔ Verified buyer · {when(r.updatedAt || r.createdAt)}
                {team && <> · <button className="link danger" onClick={() => removeReview(r)}>Remove</button></>}
              </div>
            </li>
          ))}
        </ul>
      </>}

      {zoom && (
        <div className="zoom" role="dialog" aria-modal="true" aria-label="Customer photo" onClick={() => setZoom(null)}>
          <figure onClick={e => e.stopPropagation()}>
            <img src={zoom.src} alt={'Photo from ' + zoom.r.name} />
            <figcaption><Stars value={zoom.r.rating} /> {zoom.r.name}{zoom.r.text ? ' · ' + zoom.r.text : ''}</figcaption>
            <button className="btn sm ghost" autoFocus onClick={() => setZoom(null)}>Close</button>
          </figure>
        </div>
      )}
    </section>
  );
}
