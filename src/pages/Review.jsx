import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useShop } from '../ctx';
import { Loader, Gem, StarInput, compress } from '../ui';

const WORDS = ['', 'Very bad', 'Bad', 'Okay', 'Good', 'Excellent'];

// Rate & review an item from a Delivered order. One review per customer per item; opening it again edits it.
export default function Review() {
  const { oid, pid } = useParams();
  const { user, products } = useShop();
  const nav = useNavigate();
  const id = pid + '_' + user.uid;
  const [state, setState] = useState(null); // null loading | { ok, order, old } | { err }
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const o = await getDoc(doc(db, 'orders', oid));
        const d = o.exists() && o.data();
        if (!d || d.uid !== user.uid || !(d.itemIds || []).includes(pid)) return setState({ err: 'This item is not in your orders.' });
        if (d.status !== 'Delivered') return setState({ err: 'You can review this item once your order is delivered.' });
        const [r, ph] = await Promise.all([getDoc(doc(db, 'reviews', id)), getDoc(doc(db, 'reviewPhotos', id))]);
        if (r.exists()) { setRating(r.data().rating); setText(r.data().text || ''); }
        if (ph.exists()) setPhotos(ph.data().photos || []);
        setState({ ok: true, order: d, old: r.exists() ? r.data() : null });
      } catch (e) { console.error(e); setState({ err: 'Could not open this review. Check your internet and try again.' }); }
    })();
  }, [oid, pid, id, user.uid]);

  if (!state || products === null) return <Loader />;
  const item = products.find(p => p.id === pid);
  const itemName = item?.name || state.order?.items.find(i => i.id === pid)?.name || 'This item';
  if (state.err) return (
    <div className="wrap page narrow center"><p className="empty">{state.err}</p><Link to="/orders" className="btn">My orders</Link></div>
  );

  async function addPhotos(e) {
    const files = [...e.target.files].slice(0, 3 - photos.length);
    e.target.value = '';
    if (!files.length) return;
    try { const more = await Promise.all(files.map(f => compress(f, 640, 0.65))); setPhotos(p => [...p, ...more].slice(0, 3)); }
    catch { setErr('Could not read that photo. Try another one.'); }
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!rating) return setErr('Tap the stars to give a rating.');
    setBusy(true);
    try {
      const base = { productId: pid, orderId: oid, uid: user.uid };
      // Photos first: the review rules check the same delivered order.
      if (photos.length) await setDoc(doc(db, 'reviewPhotos', id), { ...base, photos });
      else if (state.old?.photoCount) await deleteDoc(doc(db, 'reviewPhotos', id));
      await setDoc(doc(db, 'reviews', id), {
        ...base, name: (user.name || 'Customer').trim().slice(0, 60), rating, text: text.trim().slice(0, 1000),
        photoCount: photos.length, createdAt: state.old?.createdAt || Date.now(), updatedAt: Date.now(),
      });
      nav('/p/' + pid + '#reviews');
    } catch (e2) {
      console.error(e2);
      setErr('Could not save your review. Try again. If photos are large, try with fewer photos.');
    }
    setBusy(false);
  }

  return (
    <div className="wrap page narrow fade">
      <h1 className="h1">{state.old ? 'Edit your review' : 'Rate & review'}</h1>
      <div className="line">
        <div className="thumb">{item?.img ? <img src={item.img} alt="" /> : <Gem />}</div>
        <div className="grow"><div className="lname">{itemName}</div><div className="muted small">Verified purchase</div></div>
      </div>
      <form className="form" onSubmit={submit}>
        <div>
          <StarInput value={rating} onChange={setRating} />
          <p className="muted small" aria-live="polite">{WORDS[rating] || 'Tap a star to rate'}</p>
        </div>
        <label htmlFor="r-text">Your review (optional)
          <textarea id="r-text" rows="4" maxLength={1000} value={text} onChange={e => setText(e.target.value)} placeholder="How is the quality, finish and look? Would you recommend it?" />
        </label>
        <div>
          <label htmlFor="r-photos">Add photos of the item you received (up to 3)
            <input id="r-photos" type="file" accept="image/*" multiple disabled={photos.length >= 3} onChange={addPhotos} />
          </label>
          {photos.length > 0 && (
            <div className="previews" style={{ marginTop: 10 }}>
              {photos.map((src, n) => (
                <div className="rphoto" key={n}>
                  <img className="preview" src={src} alt={`Your photo ${n + 1}`} />
                  <button type="button" className="link danger" onClick={() => setPhotos(p => p.filter((_, i) => i !== n))}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : state.old ? 'Update review' : 'Submit review'}</button>
        <p className="muted small">Your name ({user.name || 'Customer'}) is shown with the review.</p>
      </form>
    </div>
  );
}
