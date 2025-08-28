// script.js
// Funciones comunes: sidebar, tema, sesión, flip de card (wallet) y cambio de moneda (cambio)

// Espero a que cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
  // 1) Menú hamburguesa y sidebar
  const menu = document.getElementById('menu');
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main'); // solo existe en wallet

  if (menu && sidebar) {
    menu.addEventListener('click', () => {
      sidebar.classList.toggle('menu-toggle');
      menu.classList.toggle('menu-toggle');
      if (main) main.classList.toggle('menu-toggle');
    });
  }

  // 2) Marcar link activo en el sidebar
  const here = location.pathname.split('/').pop() || 'wallet.html';
  document.querySelectorAll('.sidebar a').forEach(a => {
    a.classList.toggle('selected', a.getAttribute('href') === here);
  });

  // 3) Esta parte da la opción de Tema oscuro o claro
  const darkBtn = document.getElementById('darkToggle');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') document.body.classList.add('dark');
  if (savedTheme === 'light') document.body.classList.remove('dark');

  if (darkBtn) {
    darkBtn.addEventListener('click', e => {
      e.preventDefault();
      const isDark = document.body.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }

  // 4) Sesión y nombre de usuario
  const headerName = document.getElementById('userName');     // header
  const cardName = document.getElementById('cardUserName');   // tarjeta (wallet)

  const token = localStorage.getItem('authToken');
  const rawUser = localStorage.getItem('sessionUser');
  let user = null;

  if (rawUser) {
    try { user = JSON.parse(rawUser); } catch {}
  }

  // Si no hay user pero sí token, lo pido al backend
  async function ensureUser() {
    if (!user && token) {
      try {
        const res = await fetch('http://localhost:3000/api/me', {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (res.ok) {
          const data = await res.json();
          user = data.user || null;
          if (user) localStorage.setItem('sessionUser', JSON.stringify(user));
        }
      } catch {}
    }
  }

  (async () => {
    await ensureUser();

    // Sin sesión válida regreso al login
    if (!user) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('sessionUser');
      window.location.href = 'index.html';
      return;
    }

    // Pinto el nombre donde exista
    if (headerName) headerName.textContent = user.name || '';
    if (cardName) cardName.textContent = (user.name || '').toUpperCase();

    // 5) Flip de tarjetas solo en wallet.html
    document.querySelectorAll('.card-stack').forEach(stack => {
      const cards = Array.from(stack.querySelectorAll('.flip-card'));
      if (cards.length === 0) return;

      const bringToFront = clicked => {
        cards.forEach(c => {
          c.classList.remove('is-front', 'is-back');
          c.classList.add(c === clicked ? 'is-front' : 'is-back');
        });
      };

      cards.forEach(c => c.addEventListener('click', () => bringToFront(c)));
      if (!cards.some(c => c.classList.contains('is-front'))) bringToFront(cards[0]);
    });

    // 6) Convertidor de moneda solo en cambio.html
    const form = document.querySelector('.exchange-form');
    if (form) {
      const amountInput = document.getElementById('amount');
      const fromSelect = document.getElementById('from');
      const toSelect = document.getElementById('to');
      const rateHint = document.querySelector('.rate-hint');
      const resultBox = document.querySelector('.result');
      const swapBtn = document.querySelector('.swap');

      if (swapBtn) {
        swapBtn.addEventListener('click', () => {
          const t = fromSelect.value;
          fromSelect.value = toSelect.value;
          toSelect.value = t;
        });
      }

      async function convertAmount({ from, to, amount }) {
        //Selección de proveedor 1: USO DE API //api de uso público
        try {
          const url1 = `https://api.exchangerate.host/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}&places=6`;
          const r1 = await fetch(url1, { cache: 'no-store' });
          if (!r1.ok) throw new Error();
          const d1 = await r1.json();
          if (d1?.info?.rate && typeof d1.result === 'number') {
            return { rate: d1.info.rate, total: d1.result, provider: 'exchangerate.host', date: d1.date };
          }
        } catch {}

        //Selección de proveedor 2: USO DE API
        try {
          const url2 = `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`;
          const r2 = await fetch(url2, { cache: 'no-store' });
          if (!r2.ok) throw new Error();
          const d2 = await r2.json();
          const rate = d2?.rates?.[to];
          if (d2?.result === 'success' && typeof rate === 'number') {
            return { rate, total: rate * amount, provider: 'open.er-api.com', date: d2.time_last_update_utc };
          }
        } catch {}

        throw new Error('No se pudo obtener la tasa');
      }

      form.addEventListener('submit', async e => {
        e.preventDefault();

        const amount = parseFloat(amountInput.value);
        const from = fromSelect.value;
        const to = toSelect.value;

        if (isNaN(amount) || amount <= 0) {
          rateHint.textContent = '';
          resultBox.innerHTML = `<p class="muted">Ingresa un monto válido</p>`;
          return;
        }

        if (from === to) {
          rateHint.textContent = `1 ${from} = 1 ${to}`;
          resultBox.innerHTML = `<p><strong>${amount.toFixed(2)} ${from}</strong> = <strong>${amount.toFixed(2)} ${to}</strong></p>`;
          return;
        }

        try {
          const { rate, total, provider, date } = await convertAmount({ from, to, amount });
          rateHint.textContent = `1 ${from} = ${rate.toFixed(4)} ${to} (${provider}${date ? ', ' + date : ''})`;
          resultBox.innerHTML = `<p><strong>${amount.toFixed(2)} ${from}</strong> = <strong>${total.toFixed(2)} ${to}</strong></p>`;
        } catch {
          rateHint.textContent = '';
          resultBox.innerHTML = `<p class="muted">Error consultando la API</p>`;
        }
      });
    }
  })();
});
