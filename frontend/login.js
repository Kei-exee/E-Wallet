// Espera a que el HTML esté cargado para evitar null en los getElementById
document.addEventListener("DOMContentLoaded", () => {
  // ========== TOGGLE ENTRE VISTAS (login <-> registro) ==========
  const container   = document.getElementById("container");
  const registerBtn = document.getElementById("register"); // botón que muestra el registro
  const loginBtn    = document.getElementById("login");    // botón que vuelve al login

  // Si existen los botones, agregamos eventos
  if (registerBtn) registerBtn.addEventListener("click", () => container?.classList.add("active"));
  if (loginBtn)    loginBtn.addEventListener("click", () => container?.classList.remove("active"));

  // ========== REGISTRO (opcional) ==========
  // Requiere en el HTML: formSignUp, signupName, signupEmail, signupPassword
  const formUp    = document.getElementById("formSignUp");
  const signupErr = document.getElementById("signupErr");  // <p> para mostrar errores
  const signupMsg = document.getElementById("signupMsg");  // <p> para mostrar éxito

  if (formUp) {
    formUp.addEventListener("submit", async (e) => {
      e.preventDefault(); // evita recarga del navegador
      if (signupErr) signupErr.textContent = "";
      if (signupMsg) signupMsg.textContent = "";

      // Leemos y normalizamos datos
      const name     = document.getElementById("signupName").value.trim();
      const email    = document.getElementById("signupEmail").value.trim().toLowerCase();
      const password = document.getElementById("signupPassword").value;

      try {
        // Llamada al backend para crear el usuario
        const res  = await fetch("http://localhost:3000/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });

        // Intentamos leer JSON. Si falla, devolvemos objeto vacío para no romper
        const data = await res.json().catch(()=> ({}));
        console.log("[register]", res.status, data);

        // Si el backend respondió con error, mostramos mensaje y salimos
        if (!res.ok) {
          if (signupErr) signupErr.textContent = data.message || data.error || "No se pudo registrar";
          return;
        }

        // Registro OK. Mostramos feedback, limpiamos formulario y volvemos a la vista de login
        if (signupMsg) signupMsg.textContent = "Cuenta creada. Ahora inicia sesión";
        formUp.reset();
        container?.classList.remove("active");
      } catch (err) {
        // Error de red u otro problema no controlado
        console.error("[register] error", err);
        if (signupErr) signupErr.textContent = "Error de conexión";
      }
    });
  }

  // ========== LOGIN ==========
  // Requiere en el HTML: formSignIn y un <p id="loginError"> para mensajes
  const formIn     = document.getElementById("formSignIn");
  const loginError = document.getElementById("loginError");

  if (formIn) {
    formIn.addEventListener("submit", async (e) => {
      e.preventDefault(); // evita recarga
      if (loginError) loginError.textContent = "";

      // Leemos credenciales
      const email    = formIn.email.value.trim().toLowerCase();
      const password = formIn.password.value;

      try {
        // Llamamos al backend para autenticar
        const res  = await fetch("http://localhost:3000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        // Intentamos parsear JSON
        const data = await res.json().catch(()=> ({}));
        console.log("[login]", res.status, data);

        // Si hay error de credenciales u otro, mostramos mensaje y salimos
        if (!res.ok) {
          if (loginError) loginError.textContent = data.message || data.error || "Correo o contraseña incorrectos";
          return;
        }

        // 1. Guardamos el token si el backend lo envía
        if (data.token) {
          localStorage.setItem("authToken", data.token);
        } else {
          console.warn("[login] no vino token en la respuesta");
        }

        // 2. Conseguimos el usuario
        //    Tu front acepta dos formatos:
        //    A) { token, user: {id,name,email} }
        //    B) { id, name, email }  sin token ni user
        let user = data.user || (data.id && data.email ? { id: data.id, name: data.name, email: data.email } : null);

        // 3. Si no vino el user pero sí vino token, intentamos pedirlo a /api/me
        if (!user && data.token) {
          const me = await fetch("http://localhost:3000/api/me", {
            headers: { Authorization: "Bearer " + data.token }
          });
          const payload = await me.json().catch(()=> ({}));
          console.log("[/api/me]", me.status, payload);
          if (me.ok && payload.user) user = payload.user;
        }

        // 4. Si aún no tenemos user, no seguimos
        if (!user) {
          if (loginError) loginError.textContent = "No se pudo obtener el perfil";
          return;
        }

        // 5. Guardamos la sesión y redirigimos a la app
        localStorage.setItem("sessionUser", JSON.stringify(user));
        console.log("[login] guardado en localStorage OK");
        window.location.href = "wallet.html";
      } catch (err) {
        // Error de red u otro problema no controlado
        console.error("[login] error", err);
        if (loginError) loginError.textContent = "No se pudo conectar con el servidor";
      }
    });
  }
});


//document.addEventListener("DOMContentLoaded", () => {
  // toggle
  
 // const container   = document.getElementById("container");
 // const registerBtn = document.getElementById("register");
  //const loginBtn    = document.getElementById("login");
 // if (registerBtn) registerBtn.addEventListener("click", () => container?.classList.add("active"));
 // if (loginBtn)    loginBtn.addEventListener("click", () => container?.classList.remove("active"));

  // registro
  //const formUp = document.getElementById("formSignUp");
  //const signupErr = document.getElementById("signupErr");
  //const signupMsg = document.getElementById("signupMsg");
  //if (formUp) {
    //formUp.addEventListener("submit", async (e) => {
      //e.preventDefault();
      //signupErr && (signupErr.textContent = "");
      //signupMsg && (signupMsg.textContent = "");
     // const name = document.getElementById("signupName").value.trim();
     // const email = document.getElementById("signupEmail").value.trim().toLowerCase();
     // const password = document.getElementById("signupPassword").value;
     // const res = await fetch("http://localhost:3000/api/register", {
       // method: "POST",
       // headers: { "Content-Type": "application/json" },
       // body: JSON.stringify({ name, email, password })
     // });
     // const data = await res.json();
     // if (!res.ok) { signupErr && (signupErr.textContent = data.message || "No se pudo registrar"); return; }
      //signupMsg && (signupMsg.textContent = "Cuenta creada. Ahora inicia sesión");
     // formUp.reset();
      //container?.classList.remove("active");
   // });
  //}

  // login
 // const formIn = document.getElementById("formSignIn");
  //const loginError = document.getElementById("loginError");
  //if (formIn) {
    //formIn.addEventListener("submit", async (e) => {
     // e.preventDefault();
     // loginError && (loginError.textContent = "");
     // const email = formIn.email.value.trim().toLowerCase();
     // const password = formIn.password.value;

     // const res = await fetch("http://localhost:3000/api/login", {
       // method: "POST",
       // headers: { "Content-Type": "application/json" },
       // body: JSON.stringify({ email, password })
     // }); 
     // const data = await res.json();

      //if (!res.ok) { loginError && (loginError.textContent = data.message || "Correo o contraseña incorrectos"); return; }

      // guarda token
     // if (data.token) localStorage.setItem("authToken", data.token);

      // asegura user
     // let user = data.user || null;
     // if (!user && data.token) {
      //  const me = await fetch("http://localhost:3000/api/me", { headers: { Authorization: "Bearer " + data.token } });
       // if (me.ok) { const payload = await me.json(); user = payload.user || null; }
     // }
      //if (!user) { loginError && (loginError.textContent = "No se pudo obtener el perfil"); return; }

     // localStorage.setItem("sessionUser", JSON.stringify(user));
     // window.location.href = "wallet.html";
   // });
 // }
//}); 
