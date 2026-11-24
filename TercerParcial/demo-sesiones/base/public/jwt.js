(() => {
  // Este JavaScript trabaja únicamente dentro de la sección JWT.
  const $ = (id) => document.querySelector(`#jwt [id="${id}"]`);

  const CLAVE = 'token';

  // ---------- localStorage ----------

  // Puede fallar si el almacenamiento está bloqueado.
  // Por eso usamos try/catch.
  function leerToken() {
    try {
      return localStorage.getItem(CLAVE) || '';
    } catch (error) {
      return '';
    }
  }

  function guardarToken(token) {
    try {
      localStorage.setItem(CLAVE, token);
    } catch (error) {
      // El almacenamiento puede estar bloqueado.
    }
  }

  function borrarToken() {
    try {
      localStorage.removeItem(CLAVE);
    } catch (error) {
      // El almacenamiento puede estar bloqueado.
    }
  }

  // ---------- Decodificar el token ----------

  // JWT utiliza base64url.
  // TextDecoder permite leer correctamente caracteres como López.

  function decodificarParte(texto) {
    const b64 = texto
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(
        Math.ceil(texto.length / 4) * 4,
        '='
      );

    const bytes = Uint8Array.from(
      atob(b64),
      (caracter) => caracter.charCodeAt(0)
    );

    return JSON.parse(
      new TextDecoder().decode(bytes)
    );
  }

  function codificarParte(objeto) {
    const bytes = new TextEncoder().encode(
      JSON.stringify(objeto)
    );

    let binario = '';

    bytes.forEach((byte) => {
      binario += String.fromCharCode(byte);
    });

    return btoa(binario)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Regresa cabecera, payload y partes.
  // Si el texto no parece un JWT, regresa null.

  function leerPartes(token) {
    const partes = token.split('.');

    if (partes.length !== 3) {
      return null;
    }

    try {
      return {
        cabecera: decodificarParte(partes[0]),
        payload: decodificarParte(partes[1]),
        partes
      };
    } catch (error) {
      return null;
    }
  }

  // iat y exp están en segundos.
  // Date necesita milisegundos.

  const hora = (segundos) =>
    new Date(segundos * 1000).toLocaleTimeString();

  // ---------- Pintar el token ----------

  function pintarToken() {
    const token = leerToken();
    const estado = $('token-estado');
    const info = leerPartes(token);

    $('robo').textContent =
      token || '(no hay token)';

    if (!info) {
      estado.textContent = token
        ? 'El texto guardado no es un JWT válido'
        : 'Sin token';

      estado.className = 'estado sin-sesion';

      $('token-partes').replaceChildren();
      $('token-cabecera').textContent = '…';
      $('token-payload').textContent = '…';

      return;
    }

    const restan =
      info.payload.exp -
      Math.floor(Date.now() / 1000);

    // El reloj del navegador es orientativo.
    // El servidor decide si el token realmente venció.

    estado.textContent = restan > 0
      ? `Token de ${info.payload.usuario} · ` +
        `rol ${info.payload.rol} · ` +
        `vence en ${restan} s ` +
        `(según el reloj del navegador)`
      : `Token de ${info.payload.usuario} · ` +
        `VENCIDO hace ${-restan} s ` +
        `(según el reloj del navegador)`;

    estado.className = restan > 0
      ? 'estado con-sesion'
      : 'estado sin-sesion';

    // Las tres partes tienen colores diferentes.

    const contenedor = $('token-partes');
    contenedor.replaceChildren();

    [
      't-cabecera',
      't-payload',
      't-firma'
    ].forEach((clase, indice) => {
      const span = document.createElement('span');

      span.className = clase;

      span.textContent =
        info.partes[indice] +
        (indice < 2 ? '.' : '');

      contenedor.append(span);
    });

    $('token-cabecera').textContent =
      JSON.stringify(info.cabecera, null, 2);

    const legible = {
      ...info.payload
    };

    legible.iat =
      `${info.payload.iat} ` +
      `(${hora(info.payload.iat)})`;

    legible.exp =
      `${info.payload.exp} ` +
      `(${hora(info.payload.exp)})`;

    $('token-payload').textContent =
      JSON.stringify(legible, null, 2);
  }

  // ---------- Hablar con la API ----------

  async function llamarJWT(
    metodo,
    url,
    cuerpo,
    conToken = true
  ) {
    const encabezados = {};

    const opciones = {
      method: metodo,
      headers: encabezados
    };

    if (cuerpo !== undefined) {
      encabezados['Content-Type'] =
        'application/json';

      opciones.body = JSON.stringify(cuerpo);
    }

    // El token se agrega manualmente al encabezado.
    const token = leerToken();

    if (conToken && token) {
      encabezados.Authorization =
        `Bearer ${token}`;
    }

    const respuesta = await fetch(url, opciones);

    let datos = null;

    try {
      datos = await respuesta.json();
    } catch (error) {
      datos = null;
    }

    return {
      status: respuesta.status,
      datos
    };
  }

  // ---------- Bitácora ----------

  function claseCodigo(status) {
    if (status >= 200 && status < 300) {
      return 'codigo ok';
    }

    if (status === 401) {
      return 'codigo e401';
    }

    if (status === 403) {
      return 'codigo e403';
    }

    return 'codigo error';
  }

  function anotar(
    metodo,
    url,
    status,
    datos,
    nota
  ) {
    const li = document.createElement('li');

    const codigo = document.createElement('span');
    codigo.className = claseCodigo(status);
    codigo.textContent = status;

    const ruta = document.createElement('span');

    ruta.textContent =
      ` ${metodo} ${url}` +
      (nota ? ` · ${nota}` : '');

    const pre = document.createElement('pre');
    pre.textContent =
      JSON.stringify(datos, null, 2);

    li.append(codigo, ruta, pre);

    $('bitacora').prepend(li);
  }

  // ---------- Lo que guarda el servidor ----------

  async function pintarServidor() {
    const { datos } = await llamarJWT(
      'GET',
      '/api/diagnostico/sesiones',
      undefined,
      false
    );

    if (!datos) {
      return;
    }

    $('donde').textContent =
      `Filas en la tabla sessions ` +
      `(almacén ${datos.almacen}): ` +
      `${datos.sesiones.length}`;
  }

  async function refrescar() {
    pintarToken();
    await pintarServidor();
  }

  // ---------- Eventos ----------

  $('form-login').addEventListener(
    'submit',
    async (evento) => {
      evento.preventDefault();

      const cuerpo = {
        usuario: $('usuario').value,
        contrasena: $('contrasena').value
      };

      const { status, datos } = await llamarJWT(
        'POST',
        '/api/jwt/login',
        cuerpo,
        false
      );

      anotar(
        'POST',
        '/api/jwt/login',
        status,
        datos
      );

      if (status === 200 && datos.token) {
        guardarToken(datos.token);
        $('token-texto').value = datos.token;
      }

      await refrescar();
    }
  );

  // Al cambiar de usuario ponemos su contraseña de ejemplo.

  $('usuario').addEventListener('change', () => {
    $('contrasena').value =
      `${$('usuario').value}12345`;
  });

  // Solo los botones de la sección JWT.

  document
    .querySelectorAll('#jwt [data-url]')
    .forEach((boton) => {
      boton.addEventListener('click', async () => {
        const {
          metodo,
          url,
          sinToken
        } = boton.dataset;

        const { status, datos } = await llamarJWT(
          metodo,
          url,
          undefined,
          !sinToken
        );

        anotar(
          metodo,
          url,
          status,
          datos,
          sinToken
            ? 'sin token'
            : 'con Bearer'
        );

        // Refresh devuelve un token nuevo.
        // Lo guardamos para seguir utilizándolo.

        if (
          url === '/api/jwt/refresh' &&
          status === 200 &&
          datos.token
        ) {
          guardarToken(datos.token);
          $('token-texto').value = datos.token;
        }

        await refrescar();
      });
    });

  // Usar el token que está escrito en el textarea.

  $('btn-usar').addEventListener('click', () => {
    guardarToken(
      $('token-texto').value.trim()
    );

    refrescar();
  });

  // Cambia el rol del payload y conserva la firma original.
  // El servidor debe rechazarlo porque la firma ya no coincide.

  $('btn-alterar').addEventListener('click', () => {
    const info = leerPartes(
      $('token-texto').value.trim() ||
      leerToken()
    );

    if (!info) {
      return;
    }

    info.payload.rol = 'admin';

    $('token-texto').value =
      `${info.partes[0]}.` +
      `${codificarParte(info.payload)}.` +
      `${info.partes[2]}`;
  });

  // Borrar el token del navegador.

  $('btn-borrar').addEventListener('click', () => {
    borrarToken();

    $('token-texto').value = '';

    refrescar();
  });

  $('btn-sesiones').addEventListener(
    'click',
    pintarServidor
  );

  // ---------- Al cargar ----------

  async function iniciar() {
    $('token-texto').value = leerToken();

    const { datos } = await llamarJWT(
      'GET',
      '/api/config',
      undefined,
      false
    );

    $('config').textContent =
      JSON.stringify(datos, null, 2);

    await refrescar();

    // Cuenta regresiva local.
    // No hace peticiones adicionales al servidor.

    setInterval(pintarToken, 1000);
  }

  iniciar();
})();