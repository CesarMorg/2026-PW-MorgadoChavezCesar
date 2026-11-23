// La página solo hace fetch a la API. El navegador manda la cookie solo (misma página, mismo servidor).
const $ = (id) => document.getElementById(id);

// ETAPA 1 · Una sola función para hablar con la API.
// Así todos los botones usan el mismo camino y no repetimos fetch por todos lados.
async function llamar(metodo, url, cuerpo) {
  const opciones = { method: metodo };

  // El encabezado solo se manda cuando hay cuerpo: express.json() lo necesita para leerlo,
  // y en un GET no hay nada que leer.
  if (cuerpo !== undefined) {
    opciones.headers = { 'Content-Type': 'application/json' };
    opciones.body = JSON.stringify(cuerpo);
  }

  // fetch NO falla con un 401 o 403: solo falla si no hay red. El código está en respuesta.status.
  const respuesta = await fetch(url, opciones);

  // Si el servidor responde algo que no es JSON, preferimos null a que el programa truene.
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (error) {
    datos = null;
  }

  // No hace falta credentials: 'include' porque la página y la API son el mismo origen:
  // el navegador ya manda la cookie solo. Con otro puerto (Next.js) sí haría falta.
  return { status: respuesta.status, datos };
}

// ETAPA 2 · La bitácora
// Elegimos la clase de color según el código para que se vea de un vistazo si fue bien o mal.
function claseCodigo(status) {
  if (status >= 200 && status < 300) return 'codigo ok';
  if (status === 401) return 'codigo e401';
  if (status === 403) return 'codigo e403';
  return 'codigo error';
}

// Todo el texto que viene del servidor entra con textContent, nunca con innerHTML:
// un nombre como <img onerror=...> se mostraría como texto y no se ejecutaría (XSS).
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
  // prepend inserta al principio: lo más nuevo queda arriba.
  $('bitacora').prepend(li);
}

// ETAPA 3 · El estado
// Le preguntamos al servidor quién cree que somos: la verdad la tiene él, no la página.
async function pintarEstado() {
  const { status, datos } = await llamar('GET', '/api/sesion');
  const estado = $('estado');

  if (status === 200) {
    estado.textContent =
      `${datos.usuario.nombre} (${datos.usuario.rol}) · sesión ${datos.sesion} · vence en ${datos.expiraEnSegundos} s`;
    estado.className = 'estado con-sesion';
  } else {
    estado.textContent = 'Sin sesión (el servidor responde 401)';
    estado.className = 'estado sin-sesion';
  }

  // Con httpOnly: true, document.cookie sale vacío aunque haya sesión: el navegador
  // guarda la cookie y la manda, pero no deja que el JavaScript la lea.
  $('cookie-js').textContent = document.cookie || '(vacío)';
}

// ETAPA 4 · La tabla del servidor
function crearCelda(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

async function pintarTabla() {
  const { datos } = await llamar('GET', '/api/diagnostico/sesiones');
  if (!datos) return;

  $('donde').textContent = datos.almacen === 'mysql'
    ? 'En MySQL, tabla sessions: sobreviven a un reinicio del servidor'
    : 'En la memoria del servidor: se pierden al reiniciar';

  // Se vacía antes de llenar; si no, cada clic agregaría las mismas filas otra vez.
  const cuerpo = $('tabla-sesiones');
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
    if (s.esLaTuya) fila.className = 'tuya';

    // expira llega como texto ISO; new Date lo convierte y toLocaleString lo deja en hora local.
    const vence = s.expira ? new Date(s.expira).toLocaleString() : '—';

    fila.append(
      crearCelda(s.esLaTuya ? `${s.sesion} (la tuya)` : s.sesion),
      crearCelda(s.usuario),
      crearCelda(s.visitas),
      crearCelda(vence)
    );
    cuerpo.append(fila);
  });
}

// ETAPA 5 · Los eventos
// Después de cada acción refrescamos las dos cosas, para que la pantalla siempre
// muestre lo que el servidor tiene ahora.
async function refrescarTodo() {
  await pintarEstado();
  await pintarTabla();
}

// Login: preventDefault evita que el formulario recargue la página.
$('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const cuerpo = { usuario: $('usuario').value, contrasena: $('contrasena').value };
  const { status, datos } = await llamar('POST', '/api/login', cuerpo);
  anotar('POST', '/api/login', status, datos);
  await refrescarTodo();
});

// Un solo recorrido para todos los botones: leen su método y su ruta del HTML (dataset),
// así agregar un botón nuevo no obliga a tocar este código.
document.querySelectorAll('[data-url]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const { metodo, url } = boton.dataset;
    const { status, datos } = await llamar(metodo, url);
    anotar(metodo, url, status, datos);
    await refrescarTodo();
  });
});

// Al cambiar de usuario ponemos su contraseña de ejemplo (<usuario>12345).
$('usuario').addEventListener('change', () => {
  $('contrasena').value = `${$('usuario').value}12345`;
});

$('btn-refrescar').addEventListener('click', refrescarTodo);
$('btn-sesiones').addEventListener('click', pintarTabla);

// ETAPA 6 · Al cargar la página
// No hace falta esperar a DOMContentLoaded: el <script> está al final del <body>,
// así que todos los elementos ya existen cuando este código corre.
async function iniciar() {
  const { datos } = await llamar('GET', '/api/config');
  $('config').textContent = JSON.stringify(datos, null, 2);
  await refrescarTodo();
}

iniciar();