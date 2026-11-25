// ===== Shop details: change these =====
export const SHOP = {
  name: 'Thilakkam',
  malayalam: 'തിളക്കം',
  tagline: 'Lifestyle Store',
  whatsapp: '919446760354', // your WhatsApp number: country code + number, no + or spaces
  instagram: '',            // e.g. thilakkam.store (optional)
};

export const STATUSES = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
// Shop categories [key, label]. Only categories that have items show on the shop page.
export const CATS = [
  ['all', 'All'], ['earrings', 'Earrings'], ['jhumkas', 'Jhumkas'], ['necklaces', 'Necklaces & Chains'], ['bracelets', 'Bracelets'],
  ['hair', 'Hair Accessories'], ['ladies', 'Ladies'], ['gents', 'Gents'],
];
export const catName = k => (CATS.find(c => c[0] === k) || [k, k])[1];
export const rupee = n => '₹' + Number(n || 0).toLocaleString('en-IN');
// Price is optional. Items without a price show "Price on request" and are priced on WhatsApp.
export const hasPrice = n => n !== null && n !== undefined && n !== '' && Number(n) > 0;
export const ASK = 'Price on request';
export const priceText = n => hasPrice(n) ? rupee(n) : ASK;
export const lineText = (price, qty) => hasPrice(price) ? rupee(price * qty) : ASK;
// Order total; mentions items that still need a price.
export const totalText = (items, total) => {
  const ask = items.some(i => !hasPrice(i.price));
  if (!ask) return rupee(total);
  return total > 0 ? `${rupee(total)} + items on request` : ASK;
};
export const shortId = id => '#' + id.slice(-6).toUpperCase();
// WhatsApp link for a customer to ask the shop the price of an item that has none.
export const askPriceLink = p => `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(
  `Hi ${SHOP.name}, I would like to know the price of this item:\n${p.name}\n${location.origin}/p/${p.id}`)}`;
