// ------------------------------
// Referencias al layout
// ------------------------------

// agarro elementos del DOM: el botón hamburguesa, el sidebar y el main
const menu = document.getElementById('menu');      // botón hamburguesa
const sidebar = document.getElementById('sidebar'); // menú lateral
const main = document.getElementById('main');       // contenedor principal

// cuando hago clic en el menú hamburguesa, abro o cierro el sidebar
menu.addEventListener('click', () => {
  // toggle = si no tiene la clase la pone, y si la tiene la quita
  sidebar.classList.toggle('menu-toggle'); // sidebar expandir/colapsar
  menu.classList.toggle('menu-toggle');    // animación del icono
  main.classList.toggle('menu-toggle');    // ajusta el espacio del main
});

// ------------------------------
// marcar en el menú qué página estoy viendo
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // obtengo el nombre del archivo actual (ej: wallet.html)
  const here = location.pathname.split('/').pop() || 'wallet.html';

  // recorro todos los links del sidebar
  document.querySelectorAll('.sidebar a').forEach(a => {
    const href = a.getAttribute('href');
    // si el href del link coincide con la página actual → lo marco como "selected"
    a.classList.toggle('selected', href === here);
  });
});

// ------------------------------
// Modo oscuro / claro
// ------------------------------
const darkBtn = document.getElementById('darkToggle'); // botón para cambiar tema

// función autoejecutable que corre al cargar la página
(function initTheme() {
  const saved = localStorage.getItem('theme'); // guardo preferencia del user
  if (saved === 'dark') {
    document.body.classList.add('dark');  // activo modo oscuro
    return;
  }
  if (saved === 'light') {
    document.body.classList.remove('dark'); // activo modo claro
    return;
  }
  // si nunca eligió, dejo el body como viene por defecto
})();

// al hacer clic en el botón → alterno entre claro/oscuro y lo guardo en localStorage
if (darkBtn) {
  darkBtn.addEventListener('click', e => {
    e.preventDefault(); 
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// ------------------------------
// Autenticación: mostrar el nombre del usuario logueado
// ------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const headerName = document.getElementById("userName");    // nombre en header
  const cardName   = document.getElementById("cardUserName"); // nombre en tarjeta

  // leo datos de sesión guardados por login.js
  const raw   = localStorage.getItem("sessionUser"); // JSON con {id, name, email}
  const token = localStorage.getItem("authToken");   // JWT si el backend lo envió

  let user = null;
  // si tengo datos en localStorage, intento parsear el JSON
  if (raw) {
    try { user = JSON.parse(raw); } catch { user = null; }
  }

  // si no hay user pero sí token → lo valido con el backend
  if (!user && token) {
    try {
      const res = await fetch("http://localhost:3000/api/me", {
        headers: { Authorization: "Bearer " + token }
      });
      if (res.ok) {
        const data = await res.json();
        user = data.user || null;
        // guardo el perfil en localStorage si vino bien
        if (user) localStorage.setItem("sessionUser", JSON.stringify(user));
      }
    } catch {
      // si hay error de red, lo ignoro para no romper la UI
    }
  }

  // si todavía no hay user → la sesión no sirve. limpio y redirijo al login
  if (!user) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("sessionUser");
    window.location.href = "index.html";
    return;
  }

  // pinto el nombre del user en la interfaz
  const name = user.name || "";
  if (headerName) headerName.textContent = name;
  if (cardName)   cardName.textContent   = name.toUpperCase(); // estilo tarjeta
});

// ------------------------------
// Card flipping (efecto tarjetas apiladas)
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.card-stack').forEach(stack => {
    const cards = Array.from(stack.querySelectorAll('.flip-card'));

    // función para traer una card al frente
    const bringToFront = clicked => {
      cards.forEach(c => {
        c.classList.remove('is-front', 'is-back');
        c.classList.add(c === clicked ? 'is-front' : 'is-back');
      });
    };

    // cada tarjeta responde al clic → la trae al frente
    cards.forEach(c => c.addEventListener('click', () => bringToFront(c)));

    // estado inicial: si ninguna tiene is-front, pongo al frente la primera
    if (!cards.some(c => c.classList.contains('is-front'))) {
      bringToFront(cards[0]);
    }
  });
});

// ------------------------------
// Cambio de moneda con APIs públicas
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".exchange-form");
  const amountInput = document.getElementById("amount");
  const fromSelect = document.getElementById("from");
  const toSelect = document.getElementById("to");
  const rateHint = document.querySelector(".rate-hint");
  const resultBox = document.querySelector(".result");
  const swapBtn = document.querySelector(".swap");

  if (!form) return; // si no estoy en la página de cambio, salgo

  // botón ↕ para intercambiar monedas
  if (swapBtn) {
    swapBtn.addEventListener("click", () => {
      const t = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = t;
    });
  }

  // función que intenta dos proveedores: exchangerate.host y open.er-api.com
  async function convertAmount({ from, to, amount }) {
    // proveedor 1: exchangerate.host
    try {
      const url1 = `https://api.exchangerate.host/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}&places=6`;
      const r1 = await fetch(url1, { cache: "no-store" });
      if (!r1.ok) throw new Error(`host HTTP ${r1.status}`);
      const d1 = await r1.json();
      if (d1 && d1.info && typeof d1.info.rate === "number" && typeof d1.result === "number") {
        return { rate: d1.info.rate, total: d1.result, provider: "exchangerate.host", date: d1.date };
      }
    } catch (e) {
      console.warn("exchangerate.host falló:", e);
    }

    // proveedor 2: open.er-api.com (da todas las tasas respecto a una base)
    try {
      const url2 = `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`;
      const r2 = await fetch(url2, { cache: "no-store" });
      if (!r2.ok) throw new Error(`er-api HTTP ${r2.status}`);
      const d2 = await r2.json();
      if (d2 && d2.result === "success" && d2.rates && typeof d2.rates[to] === "number") {
        const rate = d2.rates[to];
        const total = rate * amount;
        return { rate, total, provider: "open.er-api.com", date: d2.time_last_update_utc };
      }
    } catch (e) {
      console.warn("open.er-api.com falló:", e);
    }

    // si ninguno funcionó, lanzo error
    throw new Error("No se pudo obtener la tasa en ningún proveedor");
  }

  // submit del formulario
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const amount = parseFloat(amountInput.value);
    const from = fromSelect.value;
    const to = toSelect.value;

    // validación: monto válido
    if (isNaN(amount) || amount <= 0) {
      resultBox.innerHTML = `<p class="muted">Ingresa un monto válido</p>`;
      return;
    }
    // si es la misma moneda, devuelvo 1 a 1
    if (from === to) {
      rateHint.textContent = `1 ${from} = 1 ${to}`;
      resultBox.innerHTML = `<p><strong>${amount.toFixed(2)} ${from}</strong> = <strong>${amount.toFixed(2)} ${to}</strong></p>`;
      return;
    }

    // intento la conversión
    try {
      const { rate, total, provider, date } = await convertAmount({ from, to, amount });
      rateHint.textContent = `1 ${from} = ${rate.toFixed(4)} ${to} (${provider}${date ? ", " + date : ""})`;
      resultBox.innerHTML = `<p><strong>${amount.toFixed(2)} ${from}</strong> = <strong>${total.toFixed(2)} ${to}</strong></p>`;
    } catch (err) {
      console.error("Detalle del error:", err);
      resultBox.innerHTML = `<p class="muted">Error consultando la API</p>`;
    }
  });
});
