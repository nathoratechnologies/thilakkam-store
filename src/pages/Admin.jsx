import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where, doc, updateDoc, addDoc, deleteDoc, setDoc, writeBatch, increment } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../firebase';
import { useShop } from '../ctx';
import { STATUSES, SHOP, CATS, shortId, priceText, lineText, totalText, catName } from '../config';
import { COLLECTION } from '../catalog';
import { Loader, Gem, Stars, compress, reelEmbed } from '../ui';
import { when } from './Orders';
import { Poster, POSTER_TAGS, DEMO_POSTER } from '../posters';

export default function Admin() {
  const { user } = useShop();
  const admin = user.role === 'admin';
  const tabs = [['orders', 'Orders'], ['products', 'Products'], ['reviews', 'Reviews'], ...(admin ? [['posters', 'Posters'], ['team', 'Staff']] : [])];
  const [tab, setTab] = useState('orders');
  return (
    <div className="wrap page fade">
      <div className="ahead">
        <h1 className="h1">Dashboard</h1>
        <span className="pill">{admin ? 'Admin' : 'Staff'} · {user.name || user.email}</span>
      </div>
      <div className="chips" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" className="chip" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'orders' && <OrdersTab admin={admin} />}
      {tab === 'products' && <ProductsTab admin={admin} />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'posters' && admin && <PostersTab />}
      {tab === 'team' && admin && <TeamTab me={user.uid} />}
    </div>
  );
}

/* ---------- Orders: admin + staff ---------- */
function OrdersTab({ admin }) {
  const { products } = useShop();
  const [orders, setOrders] = useState(null);
  const [show, setShow] = useState('Open');
  const [err, setErr] = useState('');

  useEffect(() => onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), s => {
    setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })));
  }, e => { console.error(e); setOrders([]); }), []);

  async function setStatus(o, status) {
    setErr('');
    // Stock goes down when an order is first confirmed, and comes back if it is cancelled later.
    const take = !o.stockTaken && !['Placed', 'Cancelled'].includes(status);
    const give = o.stockTaken && status === 'Cancelled';
    const patch = { status, updatedAt: Date.now(), stockTaken: take ? true : give ? false : !!o.stockTaken };
    try {
      const b = writeBatch(db);
      if (take || give) o.items.forEach(i => b.update(doc(db, 'products', i.id), { stock: increment(take ? -i.qty : i.qty) }));
      b.update(doc(db, 'orders', o.id), patch);
      await b.commit();
    } catch (e) {
      // A product in the order was deleted: update the order alone.
      try { await updateDoc(doc(db, 'orders', o.id), patch); setErr('Status updated, but stock was not changed because an item no longer exists.'); }
      catch { setErr('Could not update the status. Try again.'); }
    }
  }

  if (!orders) return <Loader />;
  const open = o => !['Delivered', 'Cancelled'].includes(o.status);
  const filters = ['Open', 'All', ...STATUSES];
  const list = orders.filter(o => show === 'All' || (show === 'Open' ? open(o) : o.status === show));
  const pic = id => (products || []).find(p => p.id === id)?.img;

  return (
    <>
      <div className="chips sub">
        {filters.map(s => {
          const n = s === 'All' ? orders.length : s === 'Open' ? orders.filter(open).length : orders.filter(o => o.status === s).length;
          return <button key={s} className="chip sm" aria-pressed={show === s} onClick={() => setShow(s)}>{s} ({n})</button>;
        })}
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {!list.length && <p className="empty">No orders here.</p>}
      <div className="olist">
        {list.map(o => (
          <article className="panel order" key={o.id}>
            <div className="ohead">
              <strong>{shortId(o.id)}</strong>
              <span className="muted">{when(o.createdAt)}</span>
              <span className={'pill s-' + o.status.toLowerCase()}>{o.status}</span>
            </div>
            <div className="cust">
              <div><strong>{o.name}</strong> · <a href={'tel:' + o.phone}>{o.phone}</a></div>
              <div className="muted">{o.address} - {o.pincode}</div>
              {o.note && <div className="muted">Note: {o.note}</div>}
            </div>
            <ul className="items">
              {o.items.map(i => (
                <li key={i.id}>
                  <span className="withpic"><span className="thumb sm">{pic(i.id) ? <img src={pic(i.id)} alt="" /> : <Gem size={18} />}</span>{i.name} × {i.qty}</span>
                  <span>{lineText(i.price, i.qty)}</span>
                </li>
              ))}
              <li className="sum"><span>Total</span><span>{totalText(o.items, o.total)}</span></li>
            </ul>
            <div className="oact">
              <label htmlFor={'st-' + o.id}>Status
                <select id={'st-' + o.id} value={o.status} onChange={e => setStatus(o, e.target.value)}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <a className="btn sm wa" target="_blank" rel="noopener"
                href={`https://wa.me/91${o.phone}?text=${encodeURIComponent(`Hi ${o.name}, your ${SHOP.name} order ${shortId(o.id)} is now: ${o.status}.`)}`}>
                Send status on WhatsApp
              </a>
              {admin && <DeleteBtn label="Delete order" onYes={() => deleteDoc(doc(db, 'orders', o.id))} />}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

// Two-tap delete so nothing is removed by accident.
function DeleteBtn({ label, onYes }) {
  const [sure, setSure] = useState(false);
  return sure
    ? <span className="sure">Sure? <button className="link danger" onClick={onYes}>Yes, delete</button> <button className="link" onClick={() => setSure(false)}>No</button></span>
    : <button className="link danger" onClick={() => setSure(true)}>{label}</button>;
}

/* ---------- Products: admin only ---------- */
const BLANK = { name: '', cat: 'earrings', price: '', stock: '', desc: '', imgs: [], reel: '' };
const photos = p => p.imgs?.length ? p.imgs : p.img ? [p.img] : [];

function ProductsTab({ admin }) {
  const { products } = useShop();
  const [f, setF] = useState(BLANK);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });

  // Up to 4 photos per item; the first one is the main photo.
  async function pick(e) {
    const files = [...e.target.files].slice(0, 4);
    if (!files.length) return;
    try { setF({ ...f, imgs: await Promise.all(files.map(x => compress(x))) }); } catch { setErr('Could not read that photo. Try another one.'); }
  }
  async function save(e) {
    e.preventDefault();
    setErr('');
    if (f.reel.trim() && !reelEmbed(f.reel)) return setErr('Reel link not recognised. Paste an Instagram reel or YouTube Shorts link.');
    setBusy(true);
    const data = { name: f.name.trim(), cat: f.cat, price: f.price === '' ? null : Number(f.price), stock: Math.max(0, Math.floor(Number(f.stock))), desc: f.desc.trim(), img: f.imgs[0] || '', imgs: f.imgs, reel: f.reel.trim() };
    try {
      if (edit) await updateDoc(doc(db, 'products', edit), data);
      else await addDoc(collection(db, 'products'), { ...data, createdAt: Date.now() });
      setF(BLANK); setEdit(null);
    } catch (e2) { console.error(e2); setErr('Could not save the item. Try again.'); }
    setBusy(false);
  }
  const startEdit = p => { setEdit(p.id); setF({ name: p.name, cat: p.cat, price: p.price ?? '', stock: p.stock, desc: p.desc || '', imgs: photos(p), reel: p.reel || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="two">
      <section className="panel">
        <h2 className="h2">{edit ? 'Edit item' : 'Add new item'}</h2>
        <form className="form" onSubmit={save}>
          <label htmlFor="p-name">Item name<input id="p-name" required value={f.name} onChange={set('name')} /></label>
          <label htmlFor="p-cat">Category<select id="p-cat" value={f.cat} onChange={set('cat')}>{CATS.filter(([k]) => k !== 'all').map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <div className="pair">
            <label htmlFor="p-price">Price (₹, optional)<input id="p-price" type="number" min="0" placeholder="Leave empty: price on request" value={f.price} onChange={set('price')} /></label>
            <label htmlFor="p-stock">Stock<input id="p-stock" type="number" min="0" required value={f.stock} onChange={set('stock')} /></label>
          </div>
          <label htmlFor="p-desc">Description (optional)<textarea id="p-desc" rows="2" value={f.desc} onChange={set('desc')} /></label>
          <label htmlFor="p-reel">Reel video link (optional)<input id="p-reel" type="url" inputMode="url" placeholder="Instagram reel or YouTube Shorts link" value={f.reel} onChange={set('reel')} /></label>
          <label htmlFor="p-img">Photos (up to 4)<input id="p-img" type="file" accept="image/*" multiple onChange={pick} /></label>
          {f.imgs.length > 0 && <div className="previews">{f.imgs.map((src, n) => <img key={n} className="preview" src={src} alt={'Preview ' + (n + 1)} />)}</div>}
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : edit ? 'Save changes' : 'Add item'}</button>
          {edit && <button type="button" className="btn ghost" onClick={() => { setEdit(null); setF(BLANK); }}>Cancel</button>}
        </form>
        {products && <ImportCollection products={products} />}
      </section>

      <section>
        <h2 className="h2">Items ({products?.length || 0})</h2>
        {products === null ? <Loader /> : !products.length ? <p className="empty">No items yet. Add your first one.</p> : products.map(p => (
          <div className="line" key={p.id}>
            <div className="thumb">{p.img ? <img src={p.img} alt="" /> : <Gem />}</div>
            <div className="grow">
              <div className="lname">{p.name}</div>
              <div className="muted">{catName(p.cat)} · {priceText(p.price)}{p.reel ? ' · Reel' : ''}</div>
              <div className="qty">
                <button onClick={() => updateDoc(doc(db, 'products', p.id), { stock: increment(-1) })} disabled={!(p.stock > 0)} aria-label={'Reduce stock of ' + p.name}>−</button>
                <span>{p.stock}</span>
                <button onClick={() => updateDoc(doc(db, 'products', p.id), { stock: increment(1) })} aria-label={'Add stock of ' + p.name}>+</button>
                <span className="muted">in stock</span>
              </div>
            </div>
            <div className="lact">
              <button className="link" onClick={() => startEdit(p)}>Edit</button>
              {admin && <DeleteBtn label="Delete" onYes={() => deleteDoc(doc(db, 'products', p.id))} />}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ---------- Posters: admin only. Shown as a popup when the site opens and as a banner on the shop page. ---------- */
const PBLANK = { tag: 'Shop offer', title: '', text: '', img: '', productId: '' };

function PostersTab() {
  const { posters, products } = useShop();
  const [f, setF] = useState(PBLANK);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });

  async function pick(e) {
    const file = e.target.files[0];
    if (!file) return;
    try { setF({ ...f, img: await compress(file, 1200, 0.8) }); } catch { setErr('Could not read that photo. Try another one.'); }
  }
  async function save(e) {
    e.preventDefault();
    setErr('');
    if (!f.img && !f.title.trim()) return setErr('Add a poster photo or a title.');
    setBusy(true);
    const data = { tag: f.tag, title: f.title.trim(), text: f.text.trim(), img: f.img, productId: f.productId };
    try {
      if (edit) await updateDoc(doc(db, 'posters', edit), data);
      else await addDoc(collection(db, 'posters'), { ...data, active: true, createdAt: Date.now() });
      setF(PBLANK); setEdit(null);
    } catch (e2) { console.error(e2); setErr(e2.code === 'permission-denied' ? 'Not allowed. Publish the new Firestore rules (firestore.rules) first.' : 'Could not save the poster. Try a smaller photo.'); }
    setBusy(false);
  }
  const startEdit = p => { setEdit(p.id); setF({ tag: p.tag || '', title: p.title || '', text: p.text || '', img: p.img || '', productId: p.productId || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="two">
      <section className="panel">
        <h2 className="h2">{edit ? 'Edit poster' : 'Add poster'}</h2>
        <p className="muted small">Posters pop up when someone opens the website and slide on the shop page. Upload a ready-made poster photo, or leave the photo empty and type a title to get a designed poster.</p>
        <form className="form" onSubmit={save}>
          <label htmlFor="ps-tag">Label<select id="ps-tag" value={f.tag} onChange={set('tag')}>
            <option value="">No label</option>{POSTER_TAGS.map(t => <option key={t}>{t}</option>)}
          </select></label>
          <label htmlFor="ps-title">Title<input id="ps-title" maxLength="60" placeholder="e.g. Flat 20% off on all jhumkas" value={f.title} onChange={set('title')} /></label>
          <label htmlFor="ps-text">Details (optional)<textarea id="ps-text" rows="2" maxLength="200" placeholder="e.g. Offer valid till 31 December" value={f.text} onChange={set('text')} /></label>
          <label htmlFor="ps-item">Link to an item (optional, for item offers)<select id="ps-item" value={f.productId} onChange={set('productId')}>
            <option value="">No item</option>{(products || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></label>
          <label htmlFor="ps-img">Poster photo (optional)<input id="ps-img" type="file" accept="image/*" onChange={pick} /></label>
          {f.img && <button type="button" className="link" onClick={() => setF({ ...f, img: '' })}>Remove photo</button>}
          <div className="pprev"><span className="muted small">Preview</span><Poster p={{ ...f, id: 'preview' }} /></div>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : edit ? 'Save changes' : 'Add poster'}</button>
          {edit && <button type="button" className="btn ghost" onClick={() => { setEdit(null); setF(PBLANK); }}>Cancel</button>}
        </form>
      </section>

      <section>
        <h2 className="h2">Posters ({posters?.length || 0})</h2>
        {posters === null ? <Loader /> : !posters.length ? <>
          <p className="empty">No posters yet. The website shows this demo poster until you add one:</p>
          <div className="pprev"><Poster p={DEMO_POSTER} /></div>
        </> : posters.map(p => (
          <div className="line" key={p.id}>
            <div className="thumb">{p.img ? <img src={p.img} alt="" /> : <Gem />}</div>
            <div className="grow">
              <div className="lname">{p.title || p.tag || 'Poster'}</div>
              <div className="muted">{p.tag}{p.active === false ? ' · Hidden' : ' · Showing'}</div>
            </div>
            <div className="lact">
              <button className="link" onClick={() => updateDoc(doc(db, 'posters', p.id), { active: p.active === false })}>{p.active === false ? 'Show' : 'Hide'}</button>
              <button className="link" onClick={() => startEdit(p)}>Edit</button>
              <DeleteBtn label="Delete" onYes={() => deleteDoc(doc(db, 'posters', p.id))} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ---------- One-click import of the photo collection (src/catalog.js) ---------- */
function ImportCollection({ products }) {
  const [stock, setStock] = useState('10');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({});
  const byName = new Map(products.map(p => [p.name.trim().toLowerCase(), p]));
  const todo = COLLECTION.filter(c => !byName.has(c.name.toLowerCase()));
  // Collection items already in the shop whose category is not set yet.
  const fix = COLLECTION.map(c => [byName.get(c.name.toLowerCase()), c]).filter(([p, c]) => p && p.cat !== c.cat);
  if (!todo.length && !fix.length && !msg.ok) return null;

  // One write per item: a single big batch can exceed Firestore's security-rule limits and fail as a whole.
  async function run() {
    setMsg({}); setBusy(true);
    const now = Date.now();
    const qty = Math.max(0, Math.floor(Number(stock) || 0));
    let added = 0, moved = 0;
    try {
      for (const [n, c] of todo.entries()) {
        setMsg({ info: `Adding ${n + 1} of ${todo.length}…` });
        await addDoc(collection(db, 'products'), {
          name: c.name, cat: c.cat, price: null, stock: qty, desc: '',
          img: c.imgs[0], imgs: c.imgs, createdAt: now - n, // keeps the folder order on the shop page
        });
        added++;
      }
      for (const [p, c] of fix) { await updateDoc(doc(db, 'products', p.id), { cat: c.cat }); moved++; }
      setMsg({ ok: [added && `${added} items added`, moved && `${moved} categories set`].filter(Boolean).join(', ') + '. Set prices and stock any time with Edit.' });
    } catch (e) {
      console.error(e);
      const why = e.code === 'permission-denied' ? 'Your login is not allowed to add items. Check that your role is "admin" in Firestore > users.' : (e.code || e.message);
      setMsg({ err: `Stopped after ${added} items. ${why} Tap the button again to continue.` });
    }
    setBusy(false);
  }

  return (
    <div className="import">
      <h2 className="h2">Photo collection</h2>
      {(todo.length > 0 || fix.length > 0) && <>
        {todo.length > 0 && <p className="muted">{todo.length} new items with photos are ready to add, sorted by category (no price, shown as "{priceText(null)}"). Items already in the shop are skipped.</p>}
        {todo.length > 0 && <p className="muted small">{CATS.map(([k, l]) => [l, todo.filter(c => c.cat === k).length]).filter(x => x[1]).map(([l, n]) => `${l}: ${n}`).join(' · ')}</p>}
        {fix.length > 0 && <p className="muted">{fix.length} items already in the shop will be moved to their category.</p>}
        {todo.length > 0 && <label htmlFor="imp-stock">Stock for each item<input id="imp-stock" type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} /></label>}
        <button type="button" className="btn" disabled={busy} onClick={run}>{busy ? 'Saving…' : todo.length ? `Add ${todo.length} items` : `Set ${fix.length} categories`}</button>
      </>}
      {msg.info && <p className="muted" role="status">{msg.info}</p>}
      {msg.err && <p className="err" role="alert">{msg.err}</p>}
      {msg.ok && <p className="ok" role="status">{msg.ok}</p>}
    </div>
  );
}

/* ---------- Reviews: admin + staff can remove a review ---------- */
function ReviewsTab() {
  const { reviews, products } = useShop();
  const name = id => (products || []).find(p => p.id === id)?.name || 'Deleted item';
  async function remove(r) {
    await deleteDoc(doc(db, 'reviews', r.id));
    if (r.photoCount) deleteDoc(doc(db, 'reviewPhotos', r.id)).catch(() => {});
  }
  if (!reviews.length) return <p className="empty">No reviews yet. Customers can review an item once their order is Delivered.</p>;
  return (
    <div className="olist">
      {reviews.map(r => (
        <article className="panel" key={r.id}>
          <div className="ohead">
            <Stars value={r.rating} />
            <strong>{name(r.productId)}</strong>
            <span className="muted">{r.name} · {when(r.createdAt)}</span>
          </div>
          {r.text && <p>{r.text}</p>}
          {r.photoCount > 0 && <p className="muted small">{r.photoCount} photo{r.photoCount > 1 ? 's' : ''} · <a href={'/p/' + r.productId + '#reviews'}>see on item page</a></p>}
          <DeleteBtn label="Remove review" onYes={() => remove(r)} />
        </article>
      ))}
    </div>
  );
}

/* ---------- Staff logins: admin only ---------- */
function TeamTab({ me }) {
  const [team, setTeam] = useState(null);
  const [f, setF] = useState({ name: '', email: '', pass: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({});
  const set = k => e => setF({ ...f, [k]: e.target.value });

  useEffect(() => onSnapshot(query(collection(db, 'users'), where('role', 'in', ['admin', 'staff'])), s => {
    setTeam(s.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => setTeam([])), []);

  async function create(e) {
    e.preventDefault();
    setMsg({}); setBusy(true);
    // A second Firebase app creates the login without logging the admin out.
    const sec = initializeApp(firebaseConfig, 'staff-' + Date.now());
    try {
      const cred = await createUserWithEmailAndPassword(getAuth(sec), f.email.trim(), f.pass);
      await setDoc(doc(db, 'users', cred.user.uid), { name: f.name.trim(), email: f.email.trim(), role: 'staff', createdAt: Date.now() });
      await signOut(getAuth(sec));
      setMsg({ ok: `Staff login created for ${f.email.trim()}. Share the email and password with them.` });
      setF({ name: '', email: '', pass: '' });
    } catch (e2) {
      setMsg({ err: e2.code === 'auth/email-already-in-use' ? 'This email already has an account.' : e2.code === 'auth/weak-password' ? 'Password must be at least 6 characters.' : 'Could not create the login. Try again.' });
    }
    deleteApp(sec).catch(() => {});
    setBusy(false);
  }

  return (
    <div className="two">
      <section className="panel">
        <h2 className="h2">Create staff login</h2>
        <p className="muted">Staff can see orders, update their status, add and edit items, and remove reviews. They cannot delete items or create logins.</p>
        <form className="form" onSubmit={create}>
          <label htmlFor="t-name">Name<input id="t-name" required value={f.name} onChange={set('name')} /></label>
          <label htmlFor="t-email">Email<input id="t-email" type="email" required value={f.email} onChange={set('email')} /></label>
          <label htmlFor="t-pass">Password<input id="t-pass" type="text" required minLength={6} value={f.pass} onChange={set('pass')} /></label>
          {msg.err && <p className="err" role="alert">{msg.err}</p>}
          {msg.ok && <p className="ok" role="status">{msg.ok}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create staff login'}</button>
        </form>
      </section>
      <section>
        <h2 className="h2">Team</h2>
        {team === null ? <Loader /> : team.map(u => (
          <div className="line" key={u.id}>
            <div className="grow">
              <div className="lname">{u.name || u.email}</div>
              <div className="muted">{u.email}</div>
            </div>
            <span className="pill">{u.role}</span>
            {u.id !== me && u.role === 'staff' && <DeleteBtn label="Remove access" onYes={() => deleteDoc(doc(db, 'users', u.id))} />}
          </div>
        ))}
      </section>
    </div>
  );
}
