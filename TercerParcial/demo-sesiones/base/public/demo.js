// La página solo hace fetch a la API. El navegador manda la cookie solo (misma página, mismo servidor).
const $ = (id) => document.getElementById(id);

// Etapa 1: una sola función para todas las peticiones, así no repito fetch en cada botón.
async function llamar(metodo, url, cuerpo) {
  const opciones = { method: metodo, headers: {} };

  // Content-Type solo cuando hay cuerpo: express.json() lo necesita para leerlo.
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(url, opciones);

  // fetch no lanza error con 401/403; el código está en respuesta.status.
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null; // la respuesta no era JSON
  }
  return { status: respuesta.status, datos };
}

// Etapa 2: agrega cada respuesta arriba. Uso textContent y no innerHTML
// porque el JSON puede traer texto ajeno (riesgo de XSS).
function anotarBitacora(metodo, url, status, datos) {
  let clase = 'error';
  if (status >= 200 && status < 300) clase = 'ok';
  else if (status === 401) clase = 'e401';
  else if (status === 403) clase = 'e403';

  const li = document.createElement('li');

  const codigo = document.createElement('span');
  codigo.className = 'codigo ' + clase;
  codigo.textContent = status;

  const ruta = document.createElement('strong');
  ruta.textContent = ' ' + metodo + ' ' + url;

  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(datos, null, 2);

  li.append(codigo, ruta, pre);
  $('bitacora').prepend(li);
}

// Etapa 3: pregunta al servidor quién soy.
async function pintarEstado() {
  const { status, datos } = await llamar('GET', '/api/sesion');
  const caja = $('estado');

  if (status === 200) {
    caja.textContent = datos.usuario.nombre + ' (' + datos.usuario.rol + ') · sesión ' +
      datos.sesion + ' · vence en ' + datos.expiraEnSegundos + ' s';
    caja.className = 'estado con-sesion';
  } else {
    caja.textContent = 'Sin sesión (el servidor responde 401)';
    caja.className = 'estado sin-sesion';
  }

  // Con httpOnly:true JavaScript no ve la cookie, por eso sale vacío aunque haya sesión.
  $('cookie-js').textContent = document.cookie || '(vacío)';
}

// Etapa 4: muestra las sesiones que guarda el servidor.
async function pintarTabla() {
  const { datos } = await llamar('GET', '/api/diagnostico/sesiones');

  $('donde').textContent =
    datos.almacen === 'mysql'
      ? 'En MySQL, tabla sessions'
      : 'En la memoria del servidor (se pierde al reiniciar)';

  const tbody = $('tabla-sesiones');
  tbody.replaceChildren(); // vacío antes de llenar; si no, las filas se duplican

  if (datos.sesiones.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = '(sin sesiones)';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const s of datos.sesiones) {
    const tr = document.createElement('tr');
    if (s.esLaTuya) tr.className = 'tuya';

    const valores = [
      s.sesion + (s.esLaTuya ? ' (la tuya)' : ''),
      s.usuario,
      s.visitas,
      new Date(s.expira).toLocaleTimeString(), // de texto ISO a hora local
    ];
    for (const v of valores) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

// Etapa 5: después de cada acción refresco estado y tabla.
async function refrescarTodo() {
  await pintarEstado();
  await pintarTabla();
}

async function accion(metodo, url, cuerpo) {
  const { status, datos } = await llamar(metodo, url, cuerpo);
  anotarBitacora(metodo, url, status, datos);
  await refrescarTodo();
}

// preventDefault evita que el formulario recargue la página.
$('form-login').addEventListener('submit', (e) => {
  e.preventDefault();
  accion('POST', '/api/login', {
    usuario: $('usuario').value,
    contrasena: $('contrasena').value,
  });
});

// Un solo recorrido para todos los botones con data-url.
document.querySelectorAll('[data-url]').forEach((boton) => {
  boton.addEventListener('click', () => {
    accion(boton.dataset.metodo, boton.dataset.url);
  });
});

// Al cambiar de usuario pongo su contraseña de ejemplo.
$('usuario').addEventListener('change', (e) => {
  $('contrasena').value = e.target.value + '12345';
});

$('btn-refrescar').addEventListener('click', refrescarTodo);
$('btn-sesiones').addEventListener('click', pintarTabla);

// Etapa 6: al cargar. No uso DOMContentLoaded porque el <script> está al final del <body>.
async function iniciar() {
  const { datos } = await llamar('GET', '/api/config');
  $('config').textContent = JSON.stringify(datos, null, 2);
  await refrescarTodo();
}
iniciar();