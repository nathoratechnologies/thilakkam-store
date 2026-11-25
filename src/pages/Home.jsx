import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShop } from '../ctx';
import { CATS, SHOP, priceText, hasPrice } from '../config';
import { STORE_PHOTOS } from '../catalog';
import { Gem, Spark, Loader, useReveal } from '../ui';

function Card({ p, i }) {
  const ref = useReveal();
  const { cart, add } = useShop();
  const q = cart[p.id] || 0;
  const out = !(p.stock > 0);
  return (
    <article ref={ref} className="card reveal" style={{ transitionDelay: (i % 4) * 70 + 'ms' }}>
      <Link to={'/p/' + p.id} className="pic">
        {p.img ? <img src={p.img} alt={p.name} loading="lazy" /> : <Gem size={64} />}
        {out ? <span className="tag out">Sold out</span> : p.stock <= 3 ? <span className="tag">Only {p.stock} left</span> : null}
      </Link>
      <div className="info">
        <span className="cat">{p.cat}</span>
        <Link to={'/p/' + p.id} className="name">{p.name}</Link>
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
            {CATS.map(([k, l]) => <button key={k} className="chip" aria-pressed={cat === k} onClick={() => setCat(k)}>{l}</button>)}
          </div>
          <input className="search" id="search" type="search" placeholder="Search ornaments" aria-label="Search" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {products === null ? <Loader /> : list.length === 0
          ? <p className="empty">{products.length ? 'Nothing matches. Try another search.' : 'Our new collection is coming soon.'}</p>
          : <div className="grid">{list.map((p, i) => <Card key={p.id} p={p} i={i} />)}</div>}
      </section>

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
  const { products, cart, add } = useShop();
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
        <span className="cat">{p.cat}</span>
        <h1 className="h1">{p.name}</h1>
        <div className={'price big' + (hasPrice(p.price) ? '' : ' ask')}>{priceText(p.price)}</div>
        {!hasPrice(p.price) && <p className="muted small">Add it to your bag and place the order. We share the price on WhatsApp before confirming.</p>}
        {p.desc && <p className="muted">{p.desc}</p>}
        <p className="muted">{out ? 'Sold out' : p.stock <= 3 ? `Only ${p.stock} left` : 'In stock'}</p>
        <div className="actions">
          <button className="btn" disabled={out || q >= p.stock} onClick={() => add(p.id, 1)}>{q ? `Add one more (${q} in bag)` : 'Add to bag'}</button>
          {q > 0 && <Link to="/cart" className="btn ghost">Go to bag</Link>}
        </div>
      </div>
    </div>
  );
}
