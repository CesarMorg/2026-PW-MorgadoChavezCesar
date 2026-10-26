// Misma regla que valida el backend: la boleta son exactamente 10 dígitos.
export function validarBoleta(boleta) {
  return /^\d{10}$/.test(String(boleta).trim());
}
