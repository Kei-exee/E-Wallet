// Referencias a elementos del layout
const menu = document.getElementById('menu');      // botón hamburguesa
const sidebar = document.getElementById('sidebar'); // menú lateral
const main = document.getElementById('main');       // contenedor principal

// Toggle del sidebar al hacer clic en el botón hamburguesa
menu.addEventListener('click', () => {
  // Alterna la clase 'menu-toggle' en 3 lugares:
  // 1) sidebar: para expandir/colapsar
  // 2) menu: para animar el icono
  // 3) main: para ajustar el margen del contenido
  sidebar.classList.toggle('menu-toggle');
  menu.classList.toggle('menu-toggle');
  main.classList.toggle('menu-toggle');
});

// Cuando el DOM está listo, marcar en el sidebar el link de la página actual
document.addEventListener('DOMContentLoaded', () => {
  // Obtiene el nombre del archivo actual, por ejemplo wallet.html
  const here = location.pathname.split('/').pop() || 'wallet.html';

  // Recorre todos los enlaces del sidebar y marca como seleccionado
  // el que coincide con la página actual
  document.querySelectorAll('.sidebar a').forEach(a => {
    const href = a.getAttribute('href');
    a.classList.toggle('selected', href === here);
  });
});


// Modo oscuro / claro
const darkBtn = document.getElementById('darkToggle'); // botón del header para cambiar tema

// Al cargar, aplica el tema guardado en localStorage si existe
(function initTheme() {
  const saved = localStorage.getItem('theme'); // puede ser 'dark' o 'light'
  if (saved === 'dark') {
    document.body.classList.add('dark');  // activa modo oscuro
    return;
  }
  if (saved === 'light') {
    document.body.classList.remove('dark'); // fuerza modo claro
    return;
  }
  // Si no hay preferencia guardada, se queda como esté el body por defecto
})();

// Al hacer clic en el botón de tema, alterna y guarda la preferencia
if (darkBtn) {
  darkBtn.addEventListener('click', e => {
    e.preventDefault(); // evita navegación si el botón es un <a>
    // Alterna la clase 'dark' en el body y guarda el resultado
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}


// --------------------------------------------------------------------
// Autenticación en el lado del cliente y pintado del nombre del usuario
// --------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const headerName = document.getElementById("userName");      // nombre en el header
  const cardName   = document.getElementById("cardUserName");   // nombre en la tarjeta

  // Sesión guardada localmente por login.js
  const raw   = localStorage.getItem("sessionUser"); // JSON con {id, name, email}
  const token = localStorage.getItem("authToken");   // JWT si tu backend lo envía

  // Intenta obtener el usuario desde el cache local
  let user = null;
  if (raw) {
    try { user = JSON.parse(raw); } catch { user = null; } // por si el JSON está corrupto
  }

  // Si no hay usuario en cache pero sí hay token, intenta validarlo con el backend
  if (!user && token) {
    try {
      const res = await fetch("http://localhost:3000/api/me", {
        headers: { Authorization: "Bearer " + token }
      });
      if (res.ok) {
        const data = await res.json();
        user = data.user || null;
        // Si el backend devolvió el perfil, actualiza el cache
        if (user) localStorage.setItem("sessionUser", JSON.stringify(user));
      }
      // Si no es ok, no redirigimos todavía. Más abajo se maneja el caso sin user.
    } catch {
      // Errores de red se silencian aquí para no romper la UI
    }
  }

  // Si seguimos sin usuario, no hay sesión válida. Regresa al login y limpia residuos.
  if (!user) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("sessionUser");
    window.location.href = "index.html";
    return;
  }

  // Pintar el nombre en el header y en la tarjeta
  const name = user.name || "";
  if (headerName) headerName.textContent = name;
  if (cardName)   cardName.textContent   = name.toUpperCase(); // estilo tarjeta
});



//card

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

    // listeners de clic
    cards.forEach(c => c.addEventListener('click', () => bringToFront(c)));

    // estado inicial: si ninguna tiene is-front, haces front la primera
    if (!cards.some(c => c.classList.contains('is-front'))) {
      bringToFront(cards[0]);
    }
  });
});

