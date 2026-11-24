(() => {
  // La página solo hace fetch a la API.
  // El navegador manda la cookie automáticamente.

  // Buscamos elementos únicamente dentro de la demo de cookies.
  const $ = (id) =>
    document.querySelector(`#cookies [id="${id}"]`);

  // ETAPA 1 · Una sola función para hablar con la API.

  async function llamar(metodo, url, cuerpo) {
    const opciones = {
      method: metodo
    };

    // El encabezado se manda cuando hay cuerpo.
    if (cuerpo !== undefined) {
      opciones.headers = {
        'Content-Type': 'application/json'
      };

      opciones.body = JSON.stringify(cuerpo);
    }

    // fetch no falla con 401 o 403.
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

  // ETAPA 2 · La bitácora

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

  function anotar(metodo, url, status, datos) {
    const li = document.createElement('li');

    const codigo = document.createElement('span');
    codigo.className = claseCodigo(status);
    codigo.textContent = status;

    const ruta = document.createElement('span');
    ruta.textContent = ` ${metodo} ${url}`;

    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(datos, null, 2);

    li.append(codigo, ruta, pre);

    // Lo más nuevo queda arriba.
    $('bitacora').prepend(li);
  }

  // ETAPA 3 · El estado

  async function pintarEstado() {
    const { status, datos } = await llamar(
      'GET',
      '/api/sesion'
    );

    const estado = $('estado');

    if (status === 200 && datos && datos.usuario) {
      estado.textContent =
        `${datos.usuario.nombre} (${datos.usuario.rol}) · ` +
        `sesión ${datos.sesion} · ` +
        `vence en ${datos.expiraEnSegundos} s`;

      estado.className = 'estado con-sesion';
    } else {
      estado.textContent =
        'Sin sesión (el servidor responde 401)';

      estado.className = 'estado sin-sesion';
    }

    // La cookie httpOnly no puede leerse con JavaScript.
    $('cookie-js').textContent =
      document.cookie || '(vacío)';
  }

  // ETAPA 4 · La tabla del servidor

  function crearCelda(texto) {
    const td = document.createElement('td');
    td.textContent = texto;
    return td;
  }

  async function pintarTabla() {
    const { datos } = await llamar(
      'GET',
      '/api/diagnostico/sesiones'
    );

    if (!datos) {
      return;
    }

    $('donde').textContent =
      datos.almacen === 'mysql'
        ? 'En MySQL, tabla sessions: sobreviven a un reinicio del servidor'
        : 'En la memoria del servidor: se pierden al reiniciar';

    const cuerpo = $('tabla-sesiones');

    // Se vacía antes de llenar para evitar filas duplicadas.
    cuerpo.replaceChildren();

    if (datos.sesiones.length === 0) {
      const fila = document.createElement('tr');
      const celda = crearCelda('(sin sesiones)');

      celda.colSpan = 4;

      fila.append(celda);
      cuerpo.append(fila);

      return;
    }

    datos.sesiones.forEach((s) => {
      const fila = document.createElement('tr');

      if (s.esLaTuya) {
        fila.className = 'tuya';
      }

      const vence = s.expira
        ? new Date(s.expira).toLocaleString()
        : '—';

      fila.append(
        crearCelda(
          s.esLaTuya
            ? `${s.sesion} (la tuya)`
            : s.sesion
        ),
        crearCelda(s.usuario),
        crearCelda(s.visitas),
        crearCelda(vence)
      );

      cuerpo.append(fila);
    });
  }

  // ETAPA 5 · Refrescar todo

  async function refrescarTodo() {
    await pintarEstado();
    await pintarTabla();
  }

  // Login

  $('form-login').addEventListener(
    'submit',
    async (evento) => {
      evento.preventDefault();

      const cuerpo = {
        usuario: $('usuario').value,
        contrasena: $('contrasena').value
      };

      const { status, datos } = await llamar(
        'POST',
        '/api/login',
        cuerpo
      );

      anotar(
        'POST',
        '/api/login',
        status,
        datos
      );

      await refrescarTodo();
    }
  );

  // Botones de la demo de cookies.

  document
    .querySelectorAll('#cookies [data-url]')
    .forEach((boton) => {
      boton.addEventListener('click', async () => {
        const { metodo, url } = boton.dataset;

        const { status, datos } = await llamar(
          metodo,
          url
        );

        anotar(metodo, url, status, datos);

        await refrescarTodo();
      });
    });

  // Al cambiar de usuario, cambia la contraseña de ejemplo.

  $('usuario').addEventListener('change', () => {
    $('contrasena').value =
      `${$('usuario').value}12345`;
  });

  $('btn-refrescar').addEventListener(
    'click',
    refrescarTodo
  );

  $('btn-sesiones').addEventListener(
    'click',
    pintarTabla
  );

  // ETAPA 6 · Al cargar la página

  async function iniciar() {
    const { datos } = await llamar(
      'GET',
      '/api/config'
    );

    $('config').textContent =
      JSON.stringify(datos, null, 2);

    await refrescarTodo();
  }

  iniciar();
})();