import { BrowserRouter, Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { Provider, useShop } from './ctx';
import { SHOP } from './config';
import { Gem, Loader } from './ui';
import Home, { Product } from './pages/Home';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Review from './pages/Review';

function Header() {
  const { user, count } = useShop();
  const team = user && user.role !== 'customer';
  return (
    <header className="bar">
      <div className="wrap bar-in">
        <Link to="/" className="brand"><Gem /><span>{SHOP.name}</span></Link>
        <nav>
          <NavLink to="/" end>Shop</NavLink>
          {user && !team && <NavLink to="/orders">My orders</NavLink>}
          {team && <NavLink to="/admin">Dashboard</NavLink>}
          {user ? <button className="link" onClick={() => signOut(auth)}>Logout</button> : <NavLink to="/login">Login</NavLink>}
          <Link to="/cart" className="cartbtn" key={count}>Bag <b>{count}</b></Link>
        </nav>
      </div>
    </header>
  );
}

function Guard({ team, children }) {
  const { user } = useShop();
  if (user === undefined) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (team && user.role === 'customer') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Provider>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/p/:id" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/orders" element={<Guard><Orders /></Guard>} />
            <Route path="/review/:oid/:pid" element={<Guard><Review /></Guard>} />
            <Route path="/admin" element={<Guard team><Admin /></Guard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="foot">
          <div className="wrap foot-in">
            <span className="brand small"><Gem size={20} /><span>{SHOP.name}</span></span>
            <span>{SHOP.malayalam} · {SHOP.tagline}</span>
            {SHOP.instagram && <a href={'https://instagram.com/' + SHOP.instagram} target="_blank" rel="noopener">@{SHOP.instagram}</a>}
          </div>
        </footer>
      </Provider>
    </BrowserRouter>
  );
}
