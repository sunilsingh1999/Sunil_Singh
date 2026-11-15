import type { GenerationPayload } from '../types/builder';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtmlDoc(
  title: string,
  bodyHtml: string,
  extraHead = ''
): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — AI1999</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="styles.css" />
  ${extraHead}
</head>
<body class="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/30">
  ${bodyHtml}
  <script src="script.js" defer></script>
</body>
</html>`;
}

const SHARED_STYLES = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

body {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  background: radial-gradient(circle at top left, rgba(56, 189, 248, 0.14), transparent 42%),
              radial-gradient(circle at bottom right, rgba(245, 158, 11, 0.12), transparent 45%),
              #070711;
}

.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.tap-btn {
  transition: transform 0.15s ease, filter 0.15s ease;
}
.tap-btn:active {
  transform: scale(0.97);
}
`;

function generateHindiGkQuiz(): GenerationPayload {
  return {
    projectTitle: 'Hindi GK Quiz Pro',
    summary:
      'Generated a complete interactive Hindi GK Quiz web app with 10 curated questions, live score counter, streak tracker, instant answer feedback, and restart mode.',
    followUpSuggestions: [
      'Add UPSC and SSC level filter tabs',
      'Add a 15-second countdown timer per question',
      'Include Hindi audio question reader',
    ],
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: buildHtmlDoc(
          'Hindi GK Quiz Pro',
          `<div class="max-w-2xl mx-auto px-4 py-6 space-y-5">
    <header class="glass-card rounded-3xl p-5 flex items-center justify-between gap-3">
      <div>
        <div class="text-xs font-semibold text-amber-300">AI1999 • सामान्य ज्ञान परीक्षा</div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-white mt-0.5">Hindi GK Quiz Master</h1>
      </div>
      <div class="text-right">
        <div class="text-[11px] text-slate-400">Live Score</div>
        <div id="score-badge" class="text-xl font-extrabold text-emerald-400">0 / 10</div>
      </div>
    </header>

    <div class="glass-card rounded-2xl p-3 flex items-center justify-between text-xs">
      <span id="progress-label" class="font-semibold text-cyan-300">प्रश्न 1 / 10</span>
      <span id="streak-label" class="font-semibold text-amber-300">Streak: 0 🔥</span>
    </div>

    <main id="quiz-card" class="glass-card rounded-3xl p-5 sm:p-6 space-y-4">
      <h2 id="question-text" class="text-lg sm:text-xl font-bold text-white leading-snug">Loading...</h2>
      <div id="options-list" class="grid grid-cols-1 gap-2.5"></div>
      <div id="feedback-box" class="hidden rounded-2xl p-3.5 text-sm font-medium"></div>
      <div class="flex justify-end pt-1">
        <button id="next-btn" type="button" class="hidden tap-btn px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-sm text-white">अगला प्रश्न →</button>
      </div>
    </main>

    <section id="result-card" class="hidden glass-card rounded-3xl p-6 text-center space-y-4">
      <div class="text-4xl">🏆</div>
      <h2 class="text-2xl font-extrabold text-amber-300">क्विज़ पूरा हुआ!</h2>
      <p id="final-score-text" class="text-base text-slate-200"></p>
      <button id="restart-btn" type="button" class="tap-btn px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-sm">फिर से खेलें (Restart)</button>
    </section>
  </div>`
        ),
      },
      { path: 'styles.css', language: 'css', content: SHARED_STYLES },
      {
        path: 'script.js',
        language: 'javascript',
        content: `const QUESTIONS = [
  { q: 'भारत के प्रथम राष्ट्रपति कौन थे?', opts: ['डॉ. राजेंद्र प्रसाद', 'पं. जवाहरलाल नेहरू', 'डॉ. सर्वपल्ली राधाकृष्णन', 'सरदार पटेल'], ans: 0 },
  { q: 'भारत का राष्ट्रीय पुष्प क्या है?', opts: ['गुलाब', 'कमल', 'सूरजमुखी', 'चमेली'], ans: 1 },
  { q: 'विश्व की सबसे ऊँची पर्वत चोटी कौन सी है?', opts: ['कंचनजंगा', 'माउंट एवरेस्ट', 'के2 (K2)', 'धौलागिरी'], ans: 1 },
  { q: 'भारत में "गुलाबी शहर" (Pink City) किसे कहा जाता है?', opts: ['उदयपुर', 'जोधपुर', 'जयपुर', 'आगरा'], ans: 2 },
  { q: 'मानव शरीर की सबसे बड़ी ग्रंथि कौन सी है?', opts: ['अग्न्याशय', 'थायरॉइड', 'यकृत (Liver)', 'पीयूष ग्रंथि'], ans: 2 },
  { q: 'भारत का संविधान कब लागू हुआ था?', opts: ['15 अगस्त 1947', '26 जनवरी 1950', '26 नवंबर 1949', '2 अक्टूबर 1948'], ans: 1 },
  { q: 'सौरमंडल का सबसे बड़ा ग्रह कौन सा है?', opts: ['पृथ्वी', 'शनि', 'बृहस्पति (Jupiter)', 'मंगल'], ans: 2 },
  { q: 'कंप्यूटर का जनक (Father of Computer) किसे कहा जाता है?', opts: ['एलन ट्यूरिंग', 'चार्ल्स बैबेज', 'बिल गेट्स', 'स्टीव जॉब्स'], ans: 1 },
  { q: 'भारत की सबसे लंबी नदी कौन सी है?', opts: ['यमुना', 'गोदावरी', 'गंगा', 'ब्रह्मपुत्र'], ans: 2 },
  { q: '"जय जवान, जय किसान" का नारा किसने दिया था?', opts: ['महात्मा गांधी', 'सुभाष चंद्र बोस', 'लाल बहादुर शास्त्री', 'भगत सिंह'], ans: 2 }
];

let current = 0, score = 0, streak = 0, locked = false;
const qText = document.getElementById('question-text');
const optsEl = document.getElementById('options-list');
const fbBox = document.getElementById('feedback-box');
const nextBtn = document.getElementById('next-btn');
const scoreBadge = document.getElementById('score-badge');
const progressLabel = document.getElementById('progress-label');
const streakLabel = document.getElementById('streak-label');
const quizCard = document.getElementById('quiz-card');
const resultCard = document.getElementById('result-card');

function renderQuestion() {
  locked = false;
  const item = QUESTIONS[current];
  qText.textContent = (current + 1) + '. ' + item.q;
  progressLabel.textContent = 'प्रश्न ' + (current + 1) + ' / ' + QUESTIONS.length;
  scoreBadge.textContent = score + ' / ' + QUESTIONS.length;
  streakLabel.textContent = 'Streak: ' + streak + ' 🔥';
  fbBox.classList.add('hidden');
  nextBtn.classList.add('hidden');
  optsEl.innerHTML = '';

  item.opts.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tap-btn w-full text-left px-4 py-3 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 font-medium text-sm text-slate-100';
    btn.textContent = ['A', 'B', 'C', 'D'][idx] + '. ' + opt;
    btn.onclick = () => selectOption(idx);
    optsEl.appendChild(btn);
  });
}

function selectOption(chosen) {
  if (locked) return;
  locked = true;
  const item = QUESTIONS[current];
  const buttons = optsEl.querySelectorAll('button');
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === item.ans) {
      btn.className = 'w-full text-left px-4 py-3 rounded-2xl border border-emerald-400 bg-emerald-500/25 font-bold text-sm text-emerald-100';
    } else if (idx === chosen) {
      btn.className = 'w-full text-left px-4 py-3 rounded-2xl border border-rose-400 bg-rose-500/25 font-bold text-sm text-rose-100';
    }
  });

  if (chosen === item.ans) {
    score += 1;
    streak += 1;
    fbBox.className = 'rounded-2xl p-3.5 text-sm font-semibold bg-emerald-500/20 border border-emerald-400/40 text-emerald-200';
    fbBox.textContent = '✅ बिल्कुल सही उत्तर! शाबाश!';
  } else {
    streak = 0;
    fbBox.className = 'rounded-2xl p-3.5 text-sm font-semibold bg-rose-500/20 border border-rose-400/40 text-rose-200';
    fbBox.textContent = '❌ गलत उत्तर! सही जवाब: ' + item.opts[item.ans];
  }
  fbBox.classList.remove('hidden');
  scoreBadge.textContent = score + ' / ' + QUESTIONS.length;
  streakLabel.textContent = 'Streak: ' + streak + ' 🔥';
  nextBtn.textContent = current === QUESTIONS.length - 1 ? 'परिणाम देखें →' : 'अगला प्रश्न →';
  nextBtn.classList.remove('hidden');
}

nextBtn.onclick = () => {
  if (current < QUESTIONS.length - 1) {
    current += 1;
    renderQuestion();
  } else {
    quizCard.classList.add('hidden');
    resultCard.classList.remove('hidden');
    document.getElementById('final-score-text').textContent =
      'आपने ' + QUESTIONS.length + ' में से ' + score + ' प्रश्नों के सही उत्तर दिए! (' + Math.round((score / QUESTIONS.length) * 100) + '%)';
  }
};

document.getElementById('restart-btn').onclick = () => {
  current = 0; score = 0; streak = 0;
  resultCard.classList.add('hidden');
  quizCard.classList.remove('hidden');
  renderQuestion();
};

renderQuestion();`,
      },
    ],
  };
}

function generateOnlineStore(prompt: string): GenerationPayload {
  const titleMatch = prompt.match(/(?:store|shop|dukaan|mart)\s*(?:for|of)?\s*([a-zA-Z0-9\s]{2,24})/i);
  const storeName = titleMatch?.[1]?.trim() ? `${titleMatch[1].trim()} Store` : 'Bharat Super Store';
  return {
    projectTitle: storeName,
    summary: `Built a complete interactive ${storeName} e-commerce storefront with category filters, live shopping cart drawer, quantity controls, GST summary, and instant UPI checkout.`,
    followUpSuggestions: [
      'Add product search and discount coupon codes',
      'Add wishlist hearts and customer reviews',
      'Add WhatsApp order confirmation button',
    ],
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: buildHtmlDoc(
          storeName,
          `<div class="max-w-5xl mx-auto px-4 py-5 space-y-5">
    <header class="glass-card rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3 sticky top-3 z-20">
      <div>
        <div class="text-xs font-semibold text-amber-300">AI1999 • Instant Storefront</div>
        <h1 class="text-lg sm:text-2xl font-extrabold text-white">${escapeHtml(storeName)}</h1>
      </div>
      <button id="cart-toggle" type="button" class="tap-btn px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs sm:text-sm font-bold text-white flex items-center gap-2">
        🛒 Cart (<span id="cart-count">0</span>) · ₹<span id="cart-mini-total">0</span>
      </button>
    </header>

    <div id="category-tabs" class="flex flex-wrap gap-2"></div>
    <main id="product-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></main>

    <section id="cart-panel" class="hidden glass-card rounded-3xl p-5 space-y-4">
      <div class="flex items-center justify-between border-b border-white/10 pb-3">
        <h2 class="text-lg font-extrabold text-white">Your Shopping Cart</h2>
        <button id="close-cart" type="button" class="text-xs text-slate-400 hover:text-white">Close ✕</button>
      </div>
      <div id="cart-items" class="space-y-2.5 text-sm"></div>
      <div class="border-t border-white/10 pt-3 flex items-center justify-between text-base font-extrabold">
        <span>Total Payable (incl. Free Delivery)</span>
        <span class="text-emerald-400">₹<span id="cart-total">0</span></span>
      </div>
      <button id="checkout-btn" type="button" class="tap-btn w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-sm">Place Order via UPI / COD</button>
      <div id="order-msg" class="hidden rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-3 text-xs text-emerald-200 font-semibold"></div>
    </section>
  </div>`
        ),
      },
      { path: 'styles.css', language: 'css', content: SHARED_STYLES },
      {
        path: 'script.js',
        language: 'javascript',
        content: `const PRODUCTS = [
  { id: 1, name: 'Ultra Pro Wireless Earbuds', cat: 'Electronics', price: 1499, badge: '🔥 Bestseller', emoji: '🎧' },
  { id: 2, name: 'AMOLED Smart Fitness Watch', cat: 'Electronics', price: 2499, badge: '⚡ New', emoji: '⌚' },
  { id: 3, name: 'Premium Cotton Kurta Set', cat: 'Fashion', price: 1199, badge: '✨ Trending', emoji: '👕' },
  { id: 4, name: 'Classic Running Sneakers', cat: 'Fashion', price: 1899, badge: '🏃 Comfort', emoji: '👟' },
  { id: 5, name: 'RGB Sunset Ambient Lamp', cat: 'Home', price: 799, badge: '🌙 Top Rated', emoji: '💡' },
  { id: 6, name: 'Stainless Steel Vacuum Flask', cat: 'Home', price: 649, badge: '💧 24h Cold', emoji: '🥤' }
];
let activeCat = 'All';
const cart = new Map();

function renderCats() {
  const cats = ['All', 'Electronics', 'Fashion', 'Home'];
  const el = document.getElementById('category-tabs');
  el.innerHTML = '';
  cats.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = c;
    b.className = c === activeCat
      ? 'px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs'
      : 'px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-slate-300 text-xs font-semibold';
    b.onclick = () => { activeCat = c; renderCats(); renderProducts(); };
    el.appendChild(b);
  });
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';
  const list = activeCat === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.cat === activeCat);
  list.forEach((p) => {
    const qty = cart.get(p.id) || 0;
    const card = document.createElement('div');
    card.className = 'glass-card rounded-3xl p-4 flex flex-col justify-between gap-3';
    card.innerHTML = \`
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="px-2.5 py-1 rounded-full bg-white/10 text-amber-300 font-semibold">\${p.badge}</span>
          <span class="text-slate-400">\${p.cat}</span>
        </div>
        <div class="h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-5xl">\${p.emoji}</div>
        <h3 class="font-bold text-base text-white">\${p.name}</h3>
        <div class="text-lg font-extrabold text-emerald-400">₹\${p.price.toLocaleString('en-IN')}</div>
      </div>
      <button type="button" data-add="\${p.id}" class="tap-btn w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white">
        \${qty > 0 ? 'Added (' + qty + ') • + Add More' : 'Add to Cart'}
      </button>\`;
    card.querySelector('[data-add]').onclick = () => {
      cart.set(p.id, (cart.get(p.id) || 0) + 1);
      syncCart();
      renderProducts();
    };
    grid.appendChild(card);
  });
}

function syncCart() {
  let count = 0, total = 0;
  const itemsEl = document.getElementById('cart-items');
  itemsEl.innerHTML = '';
  cart.forEach((qty, id) => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p || qty <= 0) return;
    count += qty;
    total += p.price * qty;
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-2 bg-white/5 rounded-2xl p-3';
    row.innerHTML = \`<div><div class="font-bold">\${p.emoji} \${p.name}</div><div class="text-xs text-slate-400">₹\${p.price} × \${qty}</div></div>
      <div class="flex items-center gap-2">
        <button class="px-2.5 py-1 rounded-lg bg-white/10 font-bold" data-dec="\${id}">-</button>
        <span class="font-mono font-bold">\${qty}</span>
        <button class="px-2.5 py-1 rounded-lg bg-white/10 font-bold" data-inc="\${id}">+</button>
      </div>\`;
    row.querySelector('[data-dec]').onclick = () => { if (qty <= 1) cart.delete(id); else cart.set(id, qty - 1); syncCart(); renderProducts(); };
    row.querySelector('[data-inc]').onclick = () => { cart.set(id, qty + 1); syncCart(); renderProducts(); };
    itemsEl.appendChild(row);
  });
  if (count === 0) itemsEl.innerHTML = '<div class="text-slate-400 text-xs">Your cart is empty. Add items above!</div>';
  document.getElementById('cart-count').textContent = String(count);
  document.getElementById('cart-mini-total').textContent = total.toLocaleString('en-IN');
  document.getElementById('cart-total').textContent = total.toLocaleString('en-IN');
}

document.getElementById('cart-toggle').onclick = () => document.getElementById('cart-panel').classList.toggle('hidden');
document.getElementById('close-cart').onclick = () => document.getElementById('cart-panel').classList.add('hidden');
document.getElementById('checkout-btn').onclick = () => {
  if (cart.size === 0) return;
  const msg = document.getElementById('order-msg');
  msg.textContent = '✅ Order Confirmed! Receipt #' + Math.floor(100000 + Math.random() * 899999) + ' ready.';
  msg.classList.remove('hidden');
  cart.clear();
  syncCart();
  renderProducts();
};

renderCats(); renderProducts(); syncCart();`,
      },
    ],
  };
}

function generateDigitalCard(): GenerationPayload {
  return {
    projectTitle: 'Digital Visiting Card',
    summary:
      'Created a luxury interactive Digital Visiting Card with editable business details, one-tap Copy Contact / WhatsApp links, vCard (.vcf) download, and services showcase.',
    followUpSuggestions: [
      'Add a UPI QR payment link section',
      'Add client testimonials carousel',
      'Add appointment booking request form',
    ],
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: buildHtmlDoc(
          'Digital Visiting Card',
          `<div class="max-w-md mx-auto px-4 py-8 space-y-5">
    <div class="glass-card rounded-3xl p-6 text-center space-y-4">
      <div class="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-600 flex items-center justify-center text-3xl font-extrabold text-slate-950 shadow-xl">SS</div>
      <div>
        <h1 id="card-name" class="text-2xl font-extrabold text-white">Sunil Singh</h1>
        <p id="card-role" class="text-xs font-semibold text-cyan-300 mt-0.5">Founder &amp; Digital Creator • AI1999</p>
      </div>
      <div class="grid grid-cols-2 gap-2.5 pt-1">
        <a href="tel:+919541441025" class="tap-btn py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">📞 Call Now</a>
        <a href="https://wa.me/919541441025" target="_blank" rel="noopener noreferrer" class="tap-btn py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs">💬 WhatsApp</a>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button id="copy-phone" type="button" class="tap-btn py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-semibold">Copy Phone</button>
        <button id="download-vcf" type="button" class="tap-btn py-2 rounded-xl border border-amber-400/40 bg-amber-500/15 text-amber-200 text-xs font-semibold">Save Contact (.vcf)</button>
      </div>
      <div id="status-banner" class="hidden text-xs font-semibold text-emerald-300"></div>
    </div>

    <div class="glass-card rounded-3xl p-5 space-y-3">
      <h2 class="text-sm font-bold text-amber-300">Customize Card Live</h2>
      <input id="edit-name" type="text" placeholder="Your Full Name" value="Sunil Singh" class="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none" />
      <input id="edit-role" type="text" placeholder="Title / Business" value="Founder & Digital Creator • AI1999" class="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none" />
    </div>
  </div>`
        ),
      },
      { path: 'styles.css', language: 'css', content: SHARED_STYLES },
      {
        path: 'script.js',
        language: 'javascript',
        content: `const nameInput = document.getElementById('edit-name');
const roleInput = document.getElementById('edit-role');
const cardName = document.getElementById('card-name');
const cardRole = document.getElementById('card-role');
const banner = document.getElementById('status-banner');

nameInput.oninput = () => { cardName.textContent = nameInput.value || 'Your Name'; };
roleInput.oninput = () => { cardRole.textContent = roleInput.value || 'Your Role'; };

document.getElementById('copy-phone').onclick = () => {
  navigator.clipboard?.writeText('9541441025');
  banner.textContent = '✅ Number 9541441025 copied to clipboard!';
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 2000);
};

document.getElementById('download-vcf').onclick = () => {
  const vcf = 'BEGIN:VCARD\\nVERSION:3.0\\nFN:' + cardName.textContent + '\\nTITLE:' + cardRole.textContent + '\\nTEL;TYPE=CELL:+919541441025\\nEND:VCARD';
  const blob = new Blob([vcf], { type: 'text/vcard' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'contact.vcf';
  a.click();
};`,
      },
    ],
  };
}

function generateFitnessApp(): GenerationPayload {
  return {
    projectTitle: 'FitBharat Workout & BMI',
    summary:
      'Generated an interactive Fitness & Workout Tracker with live HIIT stopwatch timer, BMI & calorie calculator, daily workout checklist, and water intake tracker.',
    followUpSuggestions: [
      'Add vegetarian Indian high-protein meal planner',
      'Add 7-day weekly workout split tabs',
      'Add local progress history chart',
    ],
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: buildHtmlDoc(
          'FitBharat Workout & BMI',
          `<div class="max-w-3xl mx-auto px-4 py-6 space-y-5">
    <header class="glass-card rounded-3xl p-5 flex items-center justify-between">
      <div>
        <div class="text-xs font-semibold text-emerald-300">AI1999 • Fitness Companion</div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-white">FitBharat Pro Tracker</h1>
      </div>
      <div class="text-right">
        <div class="text-[11px] text-slate-400">Water Intake</div>
        <div id="water-val" class="text-lg font-extrabold text-cyan-300">0 / 8 Glasses</div>
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <section class="glass-card rounded-3xl p-5 space-y-3 text-center">
        <h2 class="text-sm font-bold text-amber-300">Workout Stopwatch</h2>
        <div id="timer-display" class="font-mono text-4xl font-extrabold text-white">00:00</div>
        <div class="flex justify-center gap-2">
          <button id="timer-toggle" type="button" class="tap-btn px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Start</button>
          <button id="timer-reset" type="button" class="tap-btn px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs">Reset</button>
        </div>
      </section>

      <section class="glass-card rounded-3xl p-5 space-y-3">
        <h2 class="text-sm font-bold text-cyan-300">Instant BMI Calculator</h2>
        <div class="grid grid-cols-2 gap-2">
          <input id="wt-input" type="number" value="68" placeholder="Weight (kg)" class="rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-xs text-white" />
          <input id="ht-input" type="number" value="172" placeholder="Height (cm)" class="rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-xs text-white" />
        </div>
        <button id="calc-bmi" type="button" class="tap-btn w-full py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">Calculate BMI</button>
        <div id="bmi-out" class="text-xs font-semibold text-emerald-300">BMI: 23.0 (Healthy Weight)</div>
      </section>
    </div>

    <section class="glass-card rounded-3xl p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-white">Today's Exercises &amp; Hydration</h2>
        <button id="add-water" type="button" class="tap-btn px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold">+1 Glass Water 💧</button>
      </div>
      <div id="workout-list" class="space-y-2"></div>
    </section>
  </div>`
        ),
      },
      { path: 'styles.css', language: 'css', content: SHARED_STYLES },
      {
        path: 'script.js',
        language: 'javascript',
        content: `let sec = 0, running = false, timerId = null, glasses = 0;
const workouts = ['Push-ups (3 × 15)', 'Squats (3 × 20)', 'Plank Hold (60 sec)', 'Jumping Jacks (3 × 30)', 'Surya Namaskar (10 Rounds)'];

function updateTimer() {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  document.getElementById('timer-display').textContent = m + ':' + s;
}
document.getElementById('timer-toggle').onclick = (e) => {
  running = !running;
  e.target.textContent = running ? 'Pause' : 'Start';
  if (running) { timerId = setInterval(() => { sec++; updateTimer(); }, 1000); }
  else clearInterval(timerId);
};
document.getElementById('timer-reset').onclick = () => {
  running = false; clearInterval(timerId); sec = 0; updateTimer();
  document.getElementById('timer-toggle').textContent = 'Start';
};

document.getElementById('calc-bmi').onclick = () => {
  const w = Number(document.getElementById('wt-input').value) || 68;
  const h = (Number(document.getElementById('ht-input').value) || 172) / 100;
  const bmi = w / (h * h);
  const tag = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy Weight' : bmi < 30 ? 'Overweight' : 'Obese';
  document.getElementById('bmi-out').textContent = 'BMI: ' + bmi.toFixed(1) + ' (' + tag + ')';
};

document.getElementById('add-water').onclick = () => {
  glasses = Math.min(12, glasses + 1);
  document.getElementById('water-val').textContent = glasses + ' / 8 Glasses';
};

const listEl = document.getElementById('workout-list');
workouts.forEach((w) => {
  const row = document.createElement('label');
  row.className = 'flex items-center gap-3 p-3 rounded-2xl bg-white/5 cursor-pointer text-sm';
  row.innerHTML = '<input type="checkbox" class="w-4 h-4 accent-emerald-400" /><span>' + w + '</span>';
  listEl.appendChild(row);
});`,
      },
    ],
  };
}

function generateShayariApp(): GenerationPayload {
  return {
    projectTitle: 'Hindi Shayari Studio',
    summary:
      'Built an interactive Hindi & Urdu Shayari status collection app with Love, Attitude, Motivation & Dosti categories, one-tap Copy, Favorites filter, and Random Shayari generator.',
    followUpSuggestions: [
      'Add custom status poster card downloader',
      'Add daily Shayari notification reminder',
      'Add user submit new Shayari box',
    ],
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: buildHtmlDoc(
          'Hindi Shayari Studio',
          `<div class="max-w-2xl mx-auto px-4 py-6 space-y-5">
    <header class="glass-card rounded-3xl p-5 flex items-center justify-between gap-3">
      <div>
        <div class="text-xs font-semibold text-pink-300">AI1999 • हिंदी शायरी संग्रह</div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-white">Dil Ki Baat Shayari</h1>
      </div>
      <button id="random-btn" type="button" class="tap-btn px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-amber-500 text-xs font-bold text-white">🎲 Random</button>
    </header>
    <div id="cat-row" class="flex flex-wrap gap-2"></div>
    <main id="shayari-list" class="space-y-3.5"></main>
  </div>`
        ),
      },
      { path: 'styles.css', language: 'css', content: SHARED_STYLES },
      {
        path: 'script.js',
        language: 'javascript',
        content: `const SHAYARI = [
  { id: 1, cat: 'Motivation', text: 'मंज़िल उन्हीं को मिलती है, जिनके सपनों में जान होती है,\\nपंख से कुछ नहीं होता, हौसलों से उड़ान होती है।' },
  { id: 2, cat: 'Attitude', text: 'हम अपना वक़्त बर्बाद नहीं करते,\\nजो हमें भूल गए हम उन्हें याद नहीं करते।' },
  { id: 3, cat: 'Love', text: 'तुम्हारी मुस्कान ही मेरी पहचान है,\\nतुम साथ हो तो हर मुश्किल आसान है।' },
  { id: 4, cat: 'Dosti', text: 'सच्ची दोस्ती वो नहीं जो जान देती है,\\nसच्ची दोस्ती वो है जो चेहरे पे मुस्कान देती है।' },
  { id: 5, cat: 'Motivation', text: 'वक़्त से लड़कर जो नसीब बदल दे,\\nइंसान वही जो अपनी तक़दीर बदल दे।' },
  { id: 6, cat: 'Love', text: 'दिल की धड़कन में बस एक नाम तुम्हारा है,\\nइस दुनिया में सबसे प्यारा साथ तुम्हारा है।' }
];
let cat = 'All';
const favs = new Set();

function renderCats() {
  const row = document.getElementById('cat-row');
  row.innerHTML = '';
  ['All', 'Motivation', 'Attitude', 'Love', 'Dosti', 'Favorites'].forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = c;
    btn.className = c === cat
      ? 'px-3.5 py-1.5 rounded-xl bg-pink-500 text-white font-bold text-xs'
      : 'px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-slate-300 text-xs font-semibold';
    btn.onclick = () => { cat = c; renderCats(); renderList(); };
    row.appendChild(btn);
  });
}

function renderList(onlyOne) {
  const el = document.getElementById('shayari-list');
  el.innerHTML = '';
  const items = onlyOne ? [onlyOne] : SHAYARI.filter((s) => {
    if (cat === 'All') return true;
    if (cat === 'Favorites') return favs.has(s.id);
    return s.cat === cat;
  });
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-3xl p-5 space-y-3';
    card.innerHTML = \`
      <div class="text-[11px] font-bold text-amber-300">\${item.cat}</div>
      <p class="text-base sm:text-lg font-semibold text-white whitespace-pre-line leading-relaxed">\${item.text}</p>
      <div class="flex items-center gap-2 pt-1">
        <button data-copy type="button" class="tap-btn px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold">📋 Copy</button>
        <button data-fav type="button" class="tap-btn px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold">\${favs.has(item.id) ? '❤️ Saved' : '🤍 Like'}</button>
      </div>\`;
    card.querySelector('[data-copy]').onclick = (e) => {
      navigator.clipboard?.writeText(item.text);
      e.target.textContent = '✅ Copied!';
      setTimeout(() => { e.target.textContent = '📋 Copy'; }, 1400);
    };
    card.querySelector('[data-fav]').onclick = () => {
      if (favs.has(item.id)) favs.delete(item.id); else favs.add(item.id);
      renderList();
    };
    el.appendChild(card);
  });
}

document.getElementById('random-btn').onclick = () => {
  renderList(SHAYARI[Math.floor(Math.random() * SHAYARI.length)]);
};

renderCats(); renderList();`,
      },
    ],
  };
}

function generateCustomApp(prompt: string): GenerationPayload {
  const words = prompt.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const shortTitle = words.slice(0, 4).join(' ') || 'Smart AI Web App';
  const capitalizedTitle = shortTitle.replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    projectTitle: capitalizedTitle,
    summary: `Instantly built a responsive interactive "${capitalizedTitle}" web app with live item manager, real-time analytics counter, quick search filter, and one-click export.`,
    followUpSuggestions: [
      'Add dark and light theme toggle button',
      'Add CSV download for saved records',
      'Add custom categories and priority tags',
    ],
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: buildHtmlDoc(
          capitalizedTitle,
          `<div class="max-w-3xl mx-auto px-4 py-6 space-y-5">
    <header class="glass-card rounded-3xl p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="text-xs font-semibold text-cyan-300">AI1999 Instant Engine</div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-white">${escapeHtml(capitalizedTitle)}</h1>
        <p class="text-xs text-slate-400 mt-0.5">${escapeHtml(prompt.slice(0, 110))}</p>
      </div>
      <div class="text-right">
        <div class="text-[11px] text-slate-400">Active Entries</div>
        <div id="total-count" class="text-2xl font-extrabold text-amber-300">3</div>
      </div>
    </header>

    <form id="add-form" class="glass-card rounded-3xl p-4 flex flex-col sm:flex-row gap-2.5">
      <input id="entry-title" type="text" placeholder="Add new item, note, or task..." class="flex-1 rounded-xl bg-black/40 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400" required />
      <select id="entry-tag" class="rounded-xl bg-black/40 border border-white/15 px-3 py-2.5 text-xs font-semibold text-white">
        <option value="Priority">⚡ Priority</option>
        <option value="Featured">✨ Featured</option>
        <option value="Completed">✅ Done</option>
      </select>
      <button type="submit" class="tap-btn px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm">+ Add</button>
    </form>

    <div class="flex items-center justify-between gap-2">
      <input id="search-box" type="search" placeholder="Filter entries..." class="flex-1 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none" />
      <button id="export-json" type="button" class="tap-btn px-3.5 py-2 rounded-xl border border-amber-400/40 bg-amber-500/15 text-amber-200 text-xs font-bold">Export JSON</button>
    </div>

    <main id="entries-list" class="space-y-2.5"></main>
  </div>`
        ),
      },
      { path: 'styles.css', language: 'css', content: SHARED_STYLES },
      {
        path: 'script.js',
        language: 'javascript',
        content: `let entries = [
  { id: 1, title: 'Welcome to ${capitalizedTitle.replace(/'/g, '')}', tag: 'Featured', done: false },
  { id: 2, title: 'Click any item to toggle status or add your own below', tag: 'Priority', done: false },
  { id: 3, title: 'Export HTML or ZIP anytime with 1 tap', tag: 'Completed', done: true }
];

const listEl = document.getElementById('entries-list');
const searchBox = document.getElementById('search-box');

function render() {
  const q = searchBox.value.trim().toLowerCase();
  const filtered = entries.filter(e => e.title.toLowerCase().includes(q) || e.tag.toLowerCase().includes(q));
  document.getElementById('total-count').textContent = String(entries.length);
  listEl.innerHTML = '';
  filtered.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'glass-card rounded-2xl p-4 flex items-center justify-between gap-3';
    row.innerHTML = \`
      <div class="flex items-center gap-3 min-w-0">
        <input type="checkbox" \${item.done ? 'checked' : ''} class="w-4 h-4 accent-cyan-400 cursor-pointer" />
        <div class="min-w-0">
          <div class="text-sm font-bold \${item.done ? 'line-through text-slate-400' : 'text-white'} truncate">\${item.title}</div>
          <div class="text-[11px] text-amber-300 font-semibold">\${item.tag}</div>
        </div>
      </div>
      <button type="button" data-del class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1">Delete</button>\`;
    row.querySelector('input').onchange = () => { item.done = !item.done; render(); };
    row.querySelector('[data-del]').onclick = () => { entries = entries.filter(x => x.id !== item.id); render(); };
    listEl.appendChild(row);
  });
}

document.getElementById('add-form').onsubmit = (e) => {
  e.preventDefault();
  const inp = document.getElementById('entry-title');
  const tag = document.getElementById('entry-tag').value;
  if (!inp.value.trim()) return;
  entries.unshift({ id: Date.now(), title: inp.value.trim(), tag, done: false });
  inp.value = '';
  render();
};

searchBox.oninput = render;
document.getElementById('export-json').onclick = () => {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'app-data.json';
  a.click();
};

render();`,
      },
    ],
  };
}

export function generateInstantApp(prompt: string): GenerationPayload {
  const lower = prompt.toLowerCase();
  if (/(gk|quiz|mcq|प्रश्न|सामान्य ज्ञान|exam|test)/.test(lower)) {
    return generateHindiGkQuiz();
  }
  if (/(store|shop|ecommerce|e-commerce|cart|mart|dukaan|product|sell)/.test(lower)) {
    return generateOnlineStore(prompt);
  }
  if (/(card|visiting|vcard|portfolio|bio|resume|profile)/.test(lower)) {
    return generateDigitalCard();
  }
  if (/(fit|workout|gym|bmi|health|exercise|calorie|yoga)/.test(lower)) {
    return generateFitnessApp();
  }
  if (/(shayari|poetry|quote|status|poem|शायरी)/.test(lower)) {
    return generateShayariApp();
  }
  return generateCustomApp(prompt);
}
