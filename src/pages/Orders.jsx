import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useShop } from '../ctx';
import { STATUSES, shortId, lineText, totalText } from '../config';
import { Loader } from '../ui';

const STEPS = STATUSES.filter(s => s !== 'Cancelled');
export const when = t => new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function Orders() {
  const { user } = useShop();
  const [orders, setOrders] = useState(null);

  useEffect(() => onSnapshot(query(collection(db, 'orders'), where('uid', '==', user.uid)), s => {
    setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt));
  }, () => setOrders([])), [user.uid]);

  if (!orders) return <Loader />;
  return (
    <div className="wrap page narrow fade">
      <h1 className="h1">My orders</h1>
      {!orders.length && <><p className="muted">You have not placed an order yet.</p><Link to="/" className="btn">Browse the shop</Link></>}
      {orders.map(o => {
        const at = STEPS.indexOf(o.status);
        return (
          <article className="panel order" key={o.id}>
            <div className="ohead">
              <strong>{shortId(o.id)}</strong>
              <span className="muted">{when(o.createdAt)}</span>
              <span className={'pill s-' + o.status.toLowerCase()}>{o.status}</span>
            </div>
            {o.status !== 'Cancelled' && (
              <ol className="track" aria-label={'Status: ' + o.status}>
                {STEPS.map((s, i) => <li key={s} className={i <= at ? 'on' : ''}><i />{s}</li>)}
              </ol>
            )}
            <ul className="items">
              {o.items.map(i => <li key={i.id}><span>{i.name} × {i.qty}</span><span>{lineText(i.price, i.qty)}</span></li>)}
              <li className="sum"><span>Total</span><span>{totalText(o.items, o.total)}</span></li>
            </ul>
          </article>
        );
      })}
    </div>
  );
}
