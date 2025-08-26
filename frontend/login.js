// Login.js
// Objetivo: manejar el cambio de vista entre login y registro, registrar usuarios,
// hacer login, guardar token y perfil en localStorage y redirigir a wallet.html.


(() => {
  const API = "http://localhost:3000";

  // Espero a que el HTML esté listo antes de tocar el DOM
  document.addEventListener("DOMContentLoaded", () => {

    // 1) Toggle login <-> registro
    // =========================
    // Si hago clic en "Registrarse" muestro el form de registro.
    // Si hago clic en "Iniciar sesión" vuelvo al form de login.
    const container   = document.getElementById("container");
    const registerBtn = document.getElementById("register");
    const loginBtn    = document.getElementById("login");

    if (registerBtn) registerBtn.addEventListener("click", () => container?.classList.add("active"));
    if (loginBtn)    loginBtn.addEventListener("click", () => container?.classList.remove("active"));


    // 2) Registro de usuario
    // =========================
    // Envio name, email, password al backend. Si está ok muestro éxito y vuelvo a login.
    const formUp    = document.getElementById("formSignUp");
    const signupErr = document.getElementById("signupErr");
    const signupMsg = document.getElementById("signupMsg");

    if (formUp) {
      formUp.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (signupErr) signupErr.textContent = "";
        if (signupMsg) signupMsg.textContent = "";

        // Tomo valores del formulario. Normalizo el email en minúsculas.
        const name     = document.getElementById("signupName").value.trim();
        const email    = document.getElementById("signupEmail").value.trim().toLowerCase();
        const password = document.getElementById("signupPassword").value;

        try {
          // Pido al backend crear el usuario
          const res  = await fetch(`${API}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
          });

          // Intento parsear la respuesta como JSON
          //parsear - parsea el cuerpo HTTP a objeto JS
          //leer y convertir un texto siguiendo reglas para obtener datos con los que el programa pueda trabajar
          const data = await res.json().catch(() => ({}));
          console.log("[register] status:", res.status, data);

          // Si el backend dijo error, lo muestro
          if (!res.ok) {
            if (signupErr) signupErr.textContent = data.message || data.error || "No se pudo registrar";
            return;
          }

          // Si salió bien: aviso, limpio el form y regreso a la vista de login
          if (signupMsg) signupMsg.textContent = "Cuenta creada. Ahora inicia sesión";
          formUp.reset();
          container?.classList.remove("active");
        } catch (err) {
          console.error("[register] error:", err);
          if (signupErr) signupErr.textContent = "Error de conexión";
        }
      });
    }

    // =========================
    // 3) Login
    // =========================
    // Envio email y password al backend. Guardo token y perfil. Redirijo a wallet.html.
    const formIn     = document.getElementById("formSignIn");
    const loginError = document.getElementById("loginError");

    if (formIn) {
      formIn.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (loginError) loginError.textContent = "";

        // Credenciales del formulario
        const email    = formIn.email.value.trim().toLowerCase();
        const password = formIn.password.value;

        try {
          // Llamo al backend para autenticar
          const res = await fetch(`${API}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });

          // Log de diagnóstico por si el server devuelve HTML o algo raro
          const ct  = res.headers.get("content-type") || "";
          const raw = await res.clone().text();
          console.log("[login] status:", res.status, "ct:", ct, "raw preview:", raw.slice(0, 200));

          // Intento leer JSON. Si no es JSON, data queda {}
          let data = {};
          try { data = await res.json(); } catch { data = {}; }

          // Si el backend respondió error, aviso al usuario
          if (!res.ok) {
            if (loginError) loginError.textContent = data.message || data.error || "Correo o contraseña incorrectos";
            return;
          }

          // Acepto distintos formatos de respuesta para evitar romper el flujo
          // Formato ideal: { token, user: { id, name, email } }
          // Alternativa: { id, name, email } sin user
          let token = data.token || "";
          let user  = null;

          if (data.user && data.user.email) user = data.user; // caso ideal
          if (!user && data.id && data.email) user = { id: data.id, name: data.name, email: data.email }; // alterno

          // Si tengo token pero no user, intento recuperar el perfil con /api/me
          if (!user && token) {
            try {
              const me = await fetch(`${API}/api/me`, {
                headers: { Authorization: "Bearer " + token }
              });
              const payload = await me.json().catch(() => ({}));
              if (me.ok && payload.user) user = payload.user;
            } catch {}
          }

          // Si a esta altura no tengo user, algo raro pasó en la respuesta
          if (!user) {
            if (loginError) loginError.textContent = "Respuesta inválida del servidor";
            console.warn("[login] formato inesperado:", data);
            return;
          }

          // Guardo token y perfil para usarlos en el resto de la app
          if (token) localStorage.setItem("authToken", token);
          localStorage.setItem("sessionUser", JSON.stringify(user));

          // Entro a la app
          window.location.href = "wallet.html";
        } catch (err) {
          console.error("[login] error:", err);
          if (loginError) loginError.textContent = "No se pudo conectar con el servidor";
        }
      });
    }
  });
})();
