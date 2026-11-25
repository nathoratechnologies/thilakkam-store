# Thilakkam Lifestyle Store

Online store with three logins:

| Login | What they can do |
|---|---|
| Customer | Browse, add to bag, give address, place order, send it to your WhatsApp, track status |
| Staff | See all orders with address, update order status, message the customer on WhatsApp |
| Admin (you) | Everything staff can do, plus add/edit/delete items, update stock, create staff logins |

Built with React + Vite + Firebase (Auth + Firestore). Runs on the free Firebase Spark plan.
Product photos are compressed and saved inside Firestore, so Firebase Storage (paid plan) is not needed.

## 1. First-time setup (about 15 minutes)

1. Install Node.js 18 or newer.
2. Open https://console.firebase.google.com and create a project (e.g. `thilakkam-store`).
3. Build > Authentication > Get started > enable **Email/Password** and **Google**.
4. Build > Firestore Database > Create database > Production mode > location `asia-south1 (Mumbai)`.
5. Project settings (gear icon) > Your apps > Web (`</>`) > register app > copy the config values.
6. In this folder copy `.env.example` to `.env` and paste the values.
7. Open `src/config.js` and put your WhatsApp number (`91` + 10 digits).
8. In a terminal in this folder:

```
npm install
npm run dev
```

Open the link it prints (http://localhost:5173).

## 2. Security rules (must do)

```
npm install -g firebase-tools
firebase login
firebase use --add        (pick your project)
firebase deploy --only firestore:rules
```

Or paste the contents of `firestore.rules` into Firestore > Rules in the console and Publish.

## 3. Make yourself admin (one time)

1. On the website tap Login > Create account, using your own email.
2. Firebase console > Firestore > `users` > open your document > change `role` from `customer` to `admin`.
3. Refresh the website. You now see **Dashboard**.

Staff logins are then created from Dashboard > Staff. No console needed.

## 4. Daily use

- **Add items:** Dashboard > Products > fill name, category, stock, photos (up to 4) > Add item. Price is optional: leave it empty and the item shows "Price on request"; you quote the price on WhatsApp.
- **Photo collection:** photos in `public/products` and `public/store` are listed in `src/catalog.js`. Dashboard > Products > "Add N items" creates the shop items in one tap (items already in the shop are skipped). Store photos show in "From our store" on the home page.
- **Stock:** use the − / + buttons beside each item. Stock also goes down automatically when an order is set to Confirmed, and comes back if that order is Cancelled.
- **Orders:** Dashboard > Orders. Change the status in the dropdown. The customer sees it on their "My orders" page. "Send status on WhatsApp" opens a ready message to the customer.
- **Customer order to WhatsApp:** after a customer places an order, they tap "Send order on WhatsApp". You get the items, a link to each item (opens its photo), total, and the address. The order is saved in the Dashboard even if they skip this step.

## 5. Deploy later

```
npm run build
firebase init hosting     (public folder: dist, single-page app: yes, do not overwrite index.html)
firebase deploy
```

`firebase.json` is already set up, so `npm run build` then `firebase deploy` is enough once the project is linked.
After deploy, add your site domain in Authentication > Settings > Authorized domains if Google login complains.

## Folder map

```
src/config.js        shop name, WhatsApp number, order statuses
src/firebase.js      Firebase connection (reads .env)
src/ctx.jsx          login state, products, cart
src/App.jsx          header, routes, footer
src/pages/Home.jsx   hero, product grid, product page
src/pages/Cart.jsx   bag, address form, place order, WhatsApp message
src/pages/Orders.jsx customer order tracking
src/pages/Login.jsx  login / sign up
src/pages/Admin.jsx  dashboard: orders, products, staff
src/styles.css       all styling and animations
firestore.rules      who can read/write what
```

## Good to know

- WhatsApp cannot be sent automatically for free. The customer taps one button to send. Fully automatic messages need the paid WhatsApp Business API.
- A photo cannot be attached automatically through a WhatsApp link, so the message carries a link to the item page instead.
- "Remove access" for staff blocks their dashboard access. To delete the login fully, remove it in Firebase console > Authentication.
- Rental can be added later as a new category in `src/config.js` (`CATS`) and in the category dropdown in `src/pages/Admin.jsx`.
