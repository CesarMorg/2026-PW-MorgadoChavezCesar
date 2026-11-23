// Consultas a la tabla usuarios. Siempre con ? (consulta parametrizada), nunca pegando texto en el SQL.
const bcrypt = require('bcryptjs');

function crearModeloUsuarios(pool) {
  // Regresa el usuario (sin el hash) si la contraseña es correcta, o null si no.
  async function verificar(usuario, contrasena) {
    // Si llega algo que no es texto (por ejemplo un body vacío), no consultamos la base.
    if (typeof usuario !== 'string' || typeof contrasena !== 'string') return null;

    // El ? evita la inyección SQL: el valor viaja aparte y nunca se interpreta como código.
    const [filas] = await pool.query(
      'SELECT id, usuario, nombre, rol, contrasena_hash FROM usuarios WHERE usuario = ?',
      [usuario]
    );
    if (filas.length === 0) return null; // el usuario no existe

    const fila = filas[0];
    // bcrypt compara la contraseña con el hash guardado: la contraseña nunca se guarda en texto.
    const correcta = await bcrypt.compare(contrasena, fila.contrasena_hash);
    if (!correcta) return null;

    // Los dos fallos regresan null: así el mensaje es el mismo y no revelamos qué usuarios existen.
    const { contrasena_hash, ...sinHash } = fila;
    return sinHash;
  }

  return { verificar };
}

module.exports = { crearModeloUsuarios };