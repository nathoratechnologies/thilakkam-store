import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useShop, pending } from '../ctx';

const MSG = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/email-already-in-use': 'This email already has an account. Login instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
};

export default function Login() {
  const { user, count } = useShop();
  const [up, setUp] = useState(false);
  const [f, setF] = useState({ name: '', email: '', pass: '' });
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  if (user) return <Navigate to={user.role !== 'customer' ? '/admin' : count ? '/cart' : '/'} replace />;

  async function run(fn) {
    setErr(''); setInfo(''); setBusy(true);
    try { await fn(); } catch (e) { setErr(MSG[e.code] || 'Something went wrong. Try again.'); }
    setBusy(false);
  }
  const submit = e => {
    e.preventDefault();
    run(() => {
      if (up) { pending.name = f.name.trim(); return createUserWithEmailAndPassword(auth, f.email.trim(), f.pass); }
      return signInWithEmailAndPassword(auth, f.email.trim(), f.pass);
    });
  };
  const forgot = () => {
    if (!f.email.trim()) return setErr('Type your email first, then tap Forgot password.');
    run(async () => { await sendPasswordResetEmail(auth, f.email.trim()); setInfo('Password reset link sent to your email.'); });
  };

  return (
    <div className="wrap page narrow fade">
      <div className="panel">
        <h1 className="h1">{up ? 'Create account' : 'Login'}</h1>
        <p className="muted">{up ? 'Create an account to order and track your status.' : 'Customers, staff and admin all login here.'}</p>
        <form className="form" onSubmit={submit}>
          {up && <label htmlFor="l-name">Full name<input id="l-name" required value={f.name} onChange={set('name')} autoComplete="name" /></label>}
          <label htmlFor="l-email">Email<input id="l-email" type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></label>
          <label htmlFor="l-pass">Password<input id="l-pass" type="password" required minLength={6} value={f.pass} onChange={set('pass')} autoComplete={up ? 'new-password' : 'current-password'} /></label>
          {err && <p className="err" role="alert">{err}</p>}
          {info && <p className="ok" role="status">{info}</p>}
          <button className="btn" disabled={busy}>{up ? 'Create account' : 'Login'}</button>
        </form>
        <button className="btn ghost full" disabled={busy} onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}>Continue with Google</button>
        <div className="switch">
          <button className="link" onClick={() => { setUp(!up); setErr(''); }}>{up ? 'I already have an account' : 'New here? Create account'}</button>
          {!up && <button className="link" onClick={forgot}>Forgot password</button>}
        </div>
      </div>
    </div>
  );
}
