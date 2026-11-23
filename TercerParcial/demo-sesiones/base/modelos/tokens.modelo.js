// Lista negra de tokens JWT. Solo se usa cuando config.jwtRevocar es true.
// Si el SQL de la clase ya trae una tabla para esto, cambia aquí los nombres para que coincidan.
function crearModeloTokens(pool) {
  let tablaLista = false;

  // Crea la tabla la primera vez que hace falta, para no depender de que el SQL la traiga.
  async function asegurarTabla() {
    if (tablaLista) return;
    await pool.query(
      `CREATE TABLE IF NOT EXISTS tokens_revocados (
         jti VARCHAR(64) PRIMARY KEY,
         usuario VARCHAR(50) NOT NULL,
         expira DATETIME NOT NULL
       )`
    );
    tablaLista = true;
  }

  async function estaRevocado(jti) {
    await asegurarTabla();
    const [filas] = await pool.query('SELECT 1 FROM tokens_revocados WHERE jti = ?', [jti]);
    return filas.length > 0;
  }

  // exp viene en segundos (así lo guarda el JWT); FROM_UNIXTIME lo convierte a fecha de MySQL.
  async function revocar(jti, usuario, exp) {
    await asegurarTabla();
    await pool.query(
      'INSERT IGNORE INTO tokens_revocados (jti, usuario, expira) VALUES (?, ?, FROM_UNIXTIME(?))',
      [jti, usuario, exp]
    );
  }

  return { estaRevocado, revocar };
}

module.exports = { crearModeloTokens };