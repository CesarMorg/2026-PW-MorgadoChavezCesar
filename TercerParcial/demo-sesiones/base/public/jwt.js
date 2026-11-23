// Aquí el navegador NO manda nada solo: el token vive en localStorage y este JavaScript
// lo pone a mano en el encabezado Authorization de cada petición.
const $ = (id) => document.getElementById(id);
const CLAVE = 'token';

// ---------- localStorage ----------
// Puede fallar (modo privado, almacenamiento bloqueado), por eso va dentro de try/catch.
function leerToken() {
  try { return localStorage.getItem(CLAVE) || ''; } catch (e) { return ''; }
}
function guardarToken(token) {
  try { localStorage.setItem(CLAVE, token); } catch (e) { /* sin almacenamiento */ }
}
function borrarToken() {
  try { localStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
}

// ---------- Decodificar el token ----------
// El JWT usa base64url (con - y _ en lugar de + y /, y sin relleno =); atob solo entiende base64.
// TextDecoder hace falta para que "López" no se rompa.
function decodificarParte(texto) {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(texto.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function codificarParte(objeto) {
  const bytes = new TextEncoder().encode(JSON.stringify(objeto));
  let binario = '';
  bytes.forEach((b) => { binario += String.fromCharCode(b); });
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Regresa { cabecera, payload, partes } o null si el texto no parece un JWT.
function leerPartes(token) {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    return { cabecera: decodificarParte(partes[0]), payload: decodificarParte(partes[1]), partes };
  } catch (e) {
    return null;
  }
}

// iat y exp vienen en segundos; Date necesita milisegundos.
const hora = (segundos) => new Date(segundos * 1000).toLocaleTimeString();

// ---------- Pintar el token ----------
function pintarToken() {
  const token = leerToken();
  const estado = $('token-estado');
  const info = leerPartes(token);

  $('robo').textContent = token || '(no hay token)';

  if (!info) {
    estado.textContent = token ? 'El texto guardado no es un JWT válido' : 'Sin token';
    estado.className = 'estado sin-sesion';
    $('token-partes').replaceChildren();
    $('token-cabecera').textContent = '…';
    $('token-payload').textContent = '…';
    return;
  }

  const restan = info.payload.exp - Math.floor(Date.now() / 1000);
  // El reloj es el del navegador: el que decide si venció de verdad es el servidor.
  estado.textContent = restan > 0
    ? `Token de ${info.payload.usuario} · rol ${info.payload.rol} · vence en ${restan} s (según el reloj del navegador)`
    : `Token de ${info.payload.usuario} · VENCIDO hace ${-restan} s (según el reloj del navegador)`;
  estado.className = restan > 0 ? 'estado con-sesion' : 'estado sin-sesion';

  // Las tres partes, cada una con su color; textContent por si el token trae algo raro.
  const contenedor = $('token-partes');
  contenedor.replaceChildren();
  ['t-cabecera', 't-payload', 't-firma'].forEach((clase, i) => {
    const span = document.createElement('span');
    span.className = clase;
    span.textContent = info.partes[i] + (i < 2 ? '.' : '');
    contenedor.append(span);
  });

  $('token-cabecera').textContent = JSON.stringify(info.cabecera, null, 2);

  const legible = { ...info.payload };
  legible.iat = `${info.payload.iat} (${hora(info.payload.iat)})`;
  legible.exp = `${info.payload.exp} (${hora(info.payload.exp)})`;
  $('token-payload').textContent = JSON.stringify(legible, null, 2);
}

// ---------- Hablar con la API ----------
async function llamarJWT(metodo, url, cuerpo, conToken = true) {
  const encabezados = {};
  const opciones = { method: metodo, headers: encabezados };

  if (cuerpo !== undefined) {
    encabezados['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  // Este es el paso clave de JWT: el token viaja porque nosotros lo ponemos.
  const token = leerToken();
  if (conToken && token) encabezados.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(url, opciones);
  let datos = null;
  try { datos = await respuesta.json(); } catch (e) { datos = null; }
  return { status: respuesta.status, datos };
}

// ---------- Bitácora ----------
function claseCodigo(status) {
  if (status >= 200 && status < 300) return 'codigo ok';
  if (status === 401) return 'codigo e401';
  if (status === 403) return 'codigo e403';
  return 'codigo error';
}

function anotar(metodo, url, status, datos, nota) {
  const li = document.createElement('li');

  const codigo = document.createElement('span');
  codigo.className = claseCodigo(status);
  codigo.textContent = status;

  const ruta = document.createElement('span');
  ruta.textContent = ` ${metodo} ${url}${nota ? ` · ${nota}` : ''}`;

  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(datos, null, 2);

  li.append(codigo, ruta, pre);
  $('bitacora').prepend(li);
}

// ---------- Lo que guarda el servidor ----------
async function pintarServidor() {
  const { datos } = await llamarJWT('GET', '/api/diagnostico/sesiones', undefined, false);
  if (!datos) return;
  $('donde').textContent =
    `Filas en la tabla sessions (almacén ${datos.almacen}): ${datos.sesiones.length}`;
}

async function refrescar() {
  pintarToken();
  await pintarServidor();
}

// ---------- Eventos ----------
$('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const cuerpo = { usuario: $('usuario').value, contrasena: $('contrasena').value };
  const { status, datos } = await llamarJWT('POST', '/api/jwt/login', cuerpo, false);
  anotar('POST', '/api/jwt/login', status, datos);
  if (status === 200 && datos.token) {
    guardarToken(datos.token);
    $('token-texto').value = datos.token;
  }
  await refrescar();
});

$('usuario').addEventListener('change', () => {
  $('contrasena').value = `${$('usuario').value}12345`;
});

document.querySelectorAll('[data-url]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const { metodo, url, sinToken } = boton.dataset;
    const { status, datos } = await llamarJWT(metodo, url, undefined, !sinToken);
    anotar(metodo, url, status, datos, sinToken ? 'sin token' : 'con Bearer');
    // refresh trae un token nuevo: lo guardamos para seguir usándolo.
    if (url === '/api/jwt/refresh' && status === 200 && datos.token) {
      guardarToken(datos.token);
      $('token-texto').value = datos.token;
    }
    await refrescar();
  });
});

$('btn-usar').addEventListener('click', () => {
  guardarToken($('token-texto').value.trim());
  refrescar();
});

// Cambia el rol del payload y deja la firma ORIGINAL. El servidor lo debe rechazar con 401:
// la firma ya no corresponde al contenido, y sin el secreto no se puede firmar de nuevo.
$('btn-alterar').addEventListener('click', () => {
  const info = leerPartes($('token-texto').value.trim() || leerToken());
  if (!info) return;
  info.payload.rol = 'admin';
  $('token-texto').value = `${info.partes[0]}.${codificarParte(info.payload)}.${info.partes[2]}`;
});

$('btn-borrar').addEventListener('click', () => {
  borrarToken();
  $('token-texto').value = '';
  refrescar();
});

$('btn-sesiones').addEventListener('click', pintarServidor);

// ---------- Al cargar ----------
async function iniciar() {
  $('token-texto').value = leerToken();
  const { datos } = await llamarJWT('GET', '/api/config', undefined, false);
  $('config').textContent = JSON.stringify(datos, null, 2);
  await refrescar();
  // Cuenta regresiva: solo repinta el token, no molesta al servidor.
  setInterval(pintarToken, 1000);
}

iniciar();