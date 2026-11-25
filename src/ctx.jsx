import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { auth, db } from './firebase';

const Ctx = createContext(null);
export const useShop = () => useContext(Ctx);
export const pending = { name: '' }; // name typed on the sign-up form

export function Provider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [products, setProducts] = useState(null);
  const [reviews, setReviews] = useState([]); // review text + rating only; photos load on the item page
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tk-cart')) || {}; } catch { return {}; }
  });

  useEffect(() => onAuthStateChanged(auth, async u => {
    if (!u) return setUser(null);
    const base = { uid: u.uid, email: u.email };
    try {
      const ref = doc(db, 'users', u.uid);
      let snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, { name: pending.name || u.displayName || '', email: u.email, role: 'customer', createdAt: Date.now() });
        snap = await getDoc(ref);
      }
      setUser({ ...base, ...snap.data() });
    } catch (e) {
      console.error(e);
      setUser({ ...base, name: u.displayName || '', role: 'customer' });
    }
  }), []);

  useEffect(() => onSnapshot(collection(db, 'products'), s => {
    setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  }, () => setProducts([])), []);

  useEffect(() => onSnapshot(collection(db, 'reviews'), s => {
    setReviews(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  }, () => setReviews([])), []);

  // Average rating and count per product.
  const ratings = {};
  reviews.forEach(r => { const x = ratings[r.productId] ||= { sum: 0, count: 0 }; x.sum += r.rating; x.count++; });
  Object.values(ratings).forEach(x => { x.avg = x.sum / x.count; });

  useEffect(() => { try { localStorage.setItem('tk-cart', JSON.stringify(cart)); } catch {} }, [cart]);

  const add = (id, d) => setCart(c => {
    const n = { ...c, [id]: Math.max(0, (c[id] || 0) + d) };
    if (!n[id]) delete n[id];
    return n;
  });
  const clear = () => setCart({});
  const count = Object.values(cart).reduce((s, q) => s + q, 0);

  return <Ctx.Provider value={{ user, setUser, products, reviews, ratings, cart, add, clear, count }}>{children}</Ctx.Provider>;
}
