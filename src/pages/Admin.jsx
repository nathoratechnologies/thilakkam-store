import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where, doc, updateDoc, addDoc, deleteDoc, setDoc, writeBatch, increment } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../firebase';
import { useShop } from '../ctx';
import { STATUSES, SHOP, CATS, shortId, priceText, lineText, totalText, catName } from '../config';
import { COLLECTION } from '../catalog';
import { Loader, Gem } from '../ui';
import { when } from './Orders';

export default function Admin() {
  const { user } = useShop();
  const admin = user.role === 'admin';
  const tabs = admin ? [['orders', 'Orders'], ['products', 'Products'], ['team', 'Staff']] : [['orders', 'Orders']];
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
      {tab === 'products' && admin && <ProductsTab />}
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
function compress(file, max = 700, quality = 0.7) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

const BLANK = { name: '', cat: 'earrings', price: '', stock: '', desc: '', imgs: [] };
const photos = p => p.imgs?.length ? p.imgs : p.img ? [p.img] : [];

function ProductsTab() {
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
    setErr(''); setBusy(true);
    const data = { name: f.name.trim(), cat: f.cat, price: f.price === '' ? null : Number(f.price), stock: Math.max(0, Math.floor(Number(f.stock))), desc: f.desc.trim(), img: f.imgs[0] || '', imgs: f.imgs };
    try {
      if (edit) await updateDoc(doc(db, 'products', edit), data);
      else await addDoc(collection(db, 'products'), { ...data, createdAt: Date.now() });
      setF(BLANK); setEdit(null);
    } catch (e2) { console.error(e2); setErr('Could not save the item. Try again.'); }
    setBusy(false);
  }
  const startEdit = p => { setEdit(p.id); setF({ name: p.name, cat: p.cat, price: p.price ?? '', stock: p.stock, desc: p.desc || '', imgs: photos(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

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
              <div className="muted">{catName(p.cat)} · {priceText(p.price)}</div>
              <div className="qty">
                <button onClick={() => updateDoc(doc(db, 'products', p.id), { stock: increment(-1) })} disabled={!(p.stock > 0)} aria-label={'Reduce stock of ' + p.name}>−</button>
                <span>{p.stock}</span>
                <button onClick={() => updateDoc(doc(db, 'products', p.id), { stock: increment(1) })} aria-label={'Add stock of ' + p.name}>+</button>
                <span className="muted">in stock</span>
              </div>
            </div>
            <div className="lact">
              <button className="link" onClick={() => startEdit(p)}>Edit</button>
              <DeleteBtn label="Delete" onYes={() => deleteDoc(doc(db, 'products', p.id))} />
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

  async function run() {
    setMsg({}); setBusy(true);
    try {
      const b = writeBatch(db);
      const now = Date.now();
      todo.forEach((c, n) => b.set(doc(collection(db, 'products')), {
        name: c.name, cat: c.cat, price: null, stock: Math.max(0, Math.floor(Number(stock) || 0)), desc: '',
        img: c.imgs[0], imgs: c.imgs, createdAt: now - n, // keeps the folder order on the shop page
      }));
      fix.forEach(([p, c]) => b.update(doc(db, 'products', p.id), { cat: c.cat }));
      await b.commit();
      setMsg({ ok: [todo.length && `${todo.length} items added`, fix.length && `${fix.length} categories set`].filter(Boolean).join(', ') + '. Set prices and stock any time with Edit.' });
    } catch (e) { console.error(e); setMsg({ err: 'Could not add the items. Try again.' }); }
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
      {msg.err && <p className="err" role="alert">{msg.err}</p>}
      {msg.ok && <p className="ok" role="status">{msg.ok}</p>}
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
        <p className="muted">Staff can see orders and update their status. They cannot add items or create logins.</p>
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
