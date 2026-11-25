import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useShop } from '../ctx';
import { SHOP, rupee, shortId, hasPrice, priceText, lineText, totalText } from '../config';
import { Loader, Gem } from '../ui';

export default function Cart() {
  const { user, products, cart, add, clear } = useShop();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);

  if (products === null || user === undefined) return <Loader />;

  if (done) return (
    <div className="wrap page narrow center fade">
      <div className="okmark"><Gem size={44} /></div>
      <h1 className="h1">Order {shortId(done.id)} placed</h1>
      <p className="muted">One last step: send the order to us on WhatsApp so we can confirm it quickly.</p>
      <a className="btn wa" href={done.wa} target="_blank" rel="noopener">Send order on WhatsApp</a>
      <Link to="/orders" className="btn ghost">Track my order</Link>
    </div>
  );

  const lines = Object.entries(cart).map(([id, q]) => ({ p: products.find(x => x.id === id), q })).filter(x => x.p);
  const total = lines.reduce((s, { p, q }) => s + (hasPrice(p.price) ? p.price * q : 0), 0);
  const totalLabel = totalText(lines.map(({ p }) => p), total);
  const form = f || { name: user?.name || '', phone: user?.phone || '', address: user?.address || '', pincode: user?.pincode || '', note: '' };
  const set = k => e => setF({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!/^\d{10}$/.test(form.phone.trim())) return setErr('Enter a 10-digit phone number.');
    if (!/^\d{6}$/.test(form.pincode.trim())) return setErr('Enter a 6-digit pincode.');
    setBusy(true);
    try {
      const items = lines.map(({ p, q }) => ({ id: p.id, name: p.name, price: hasPrice(p.price) ? Number(p.price) : null, qty: q }));
      const order = {
        uid: user.uid, email: user.email, items, itemIds: items.map(i => i.id), total, // itemIds lets the buyer review these items later
        status: 'Placed', stockTaken: false, createdAt: Date.now(),
        name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), pincode: form.pincode.trim(), note: form.note.trim(),
      };
      const ref = await addDoc(collection(db, 'orders'), order);
      updateDoc(doc(db, 'users', user.uid), { name: order.name, phone: order.phone, address: order.address, pincode: order.pincode }).catch(() => {});
      const msg = [
        `*New order ${shortId(ref.id)} - ${SHOP.name}*`, '',
        ...items.map((i, n) => `${n + 1}. ${i.name} x ${i.qty} - ${lineText(i.price, i.qty)}\n   ${location.origin}/p/${i.id}`),
        '', `*Total: ${totalText(items, total)}*`, '',
        `Name: ${order.name}`, `Phone: ${order.phone}`, `Address: ${order.address} - ${order.pincode}`,
        order.note && `Note: ${order.note}`,
      ].filter(x => x !== false && x !== undefined && x !== null).join('\n');
      clear();
      setDone({ id: ref.id, wa: `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(msg)}` });
    } catch (e2) {
      console.error(e2);
      setErr('Could not place the order. Check your internet and try again.');
    }
    setBusy(false);
  }

  if (!lines.length) return (
    <div className="wrap page narrow center">
      <h1 className="h1">Your bag is empty</h1>
      <p className="muted">Add a few pieces and they will show up here.</p>
      <Link to="/" className="btn">Browse the shop</Link>
    </div>
  );

  return (
    <div className="wrap page two fade">
      <section>
        <h1 className="h1">Your bag</h1>
        {lines.map(({ p, q }) => (
          <div className="line" key={p.id}>
            <div className="thumb">{p.img ? <img src={p.img} alt="" /> : <Gem />}</div>
            <div className="grow">
              <div className="lname">{p.name}</div>
              <div className="muted">{priceText(p.price)}</div>
              <div className="qty">
                <button onClick={() => add(p.id, -1)} aria-label={'One less ' + p.name}>−</button>
                <span>{q}</span>
                <button onClick={() => add(p.id, 1)} disabled={q >= p.stock} aria-label={'One more ' + p.name}>+</button>
              </div>
            </div>
            <div className="price">{lineText(p.price, q)}</div>
          </div>
        ))}
        <div className="total"><span>Total</span><span>{totalLabel}</span></div>
      </section>

      <section className="panel">
        <h2 className="h2">Delivery details</h2>
        {!user ? (
          <>
            <p className="muted">Login to place your order and track its status.</p>
            <Link to="/login" className="btn">Login or create account</Link>
          </>
        ) : (
          <form className="form" onSubmit={submit}>
            <label htmlFor="c-name">Full name<input id="c-name" required value={form.name} onChange={set('name')} autoComplete="name" /></label>
            <label htmlFor="c-phone">Phone (WhatsApp)<input id="c-phone" required inputMode="numeric" value={form.phone} onChange={set('phone')} autoComplete="tel-national" placeholder="10-digit number" /></label>
            <label htmlFor="c-addr">Address<textarea id="c-addr" required rows="3" value={form.address} onChange={set('address')} autoComplete="street-address" placeholder="House, street, place, district" /></label>
            <label htmlFor="c-pin">Pincode<input id="c-pin" required inputMode="numeric" value={form.pincode} onChange={set('pincode')} autoComplete="postal-code" /></label>
            <label htmlFor="c-note">Note (optional)<input id="c-note" value={form.note} onChange={set('note')} /></label>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn" disabled={busy}>{busy ? 'Placing order…' : total > 0 ? `Place order · ${rupee(total)}` : 'Place order'}</button>
            <p className="muted small">After this you send the order to our WhatsApp. We confirm the price, delivery charge and payment there.</p>
          </form>
        )}
      </section>
    </div>
  );
}
