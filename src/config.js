// ===== Shop details: change these =====
export const SHOP = {
  name: 'Thilakkam',
  malayalam: 'തിളക്കം',
  tagline: 'Lifestyle Store',
  whatsapp: '91XXXXXXXXXX', // your WhatsApp number: country code + number, no + or spaces
  instagram: '',            // e.g. thilakkam.store (optional)
};

export const STATUSES = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
export const CATS = [['all', 'All'], ['ladies', 'Ladies'], ['gents', 'Gents']];
export const rupee = n => '₹' + Number(n || 0).toLocaleString('en-IN');
export const shortId = id => '#' + id.slice(-6).toUpperCase();
