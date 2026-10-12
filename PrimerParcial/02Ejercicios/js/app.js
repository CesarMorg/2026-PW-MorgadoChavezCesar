// Primera parte: Arreglos
const talleres = [
    { nombre: 'Introducción a Python', instructor: 'Ing. María López', cupo: 25, inscritos: 25 },
    { nombre: 'Fundamentos de Redes', instructor: 'Ing. Carlos Ramírez', cupo: 30, inscritos: 18 },
    { nombre: 'Diseño de Bases de Datos', instructor: 'Ing. Ana Torres', cupo: 20, inscritos: 20 },
    { nombre: 'Desarrollo Web con JS', instructor: 'Ing. María López', cupo: 25, inscritos: 10 },
];

function pintarTabla() {
    document.querySelector('#tabla-talleres tbody').innerHTML = talleres
        .map(t => `<tr><td>${t.nombre}</td><td>${t.instructor}</td><td>${t.cupo}</td><td>${t.inscritos}</td></tr>`)
        .join('');
}

const formArreglos = document.getElementById('form-arreglos');
const resultadoArreglos = document.getElementById('resultado-arreglo');

formArreglos.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const operacion = document.getElementById('operacion-arreglo').value;
    let resultado;

    switch (operacion) {
        case 'forEach':
            resultado = talleres.map(t => `${t.nombre} (${t.inscritos}/${t.cupo})`).join('\n');
            break;
        case 'map':
            resultado = talleres.map(t => t.nombre).join('\n');
            break;
        case 'filter':
            resultado = talleres.filter(t => t.inscritos >= t.cupo).map(t => t.nombre).join('\n') || 'No hay talleres con cupo lleno';
            break;
        case 'find':
            resultado = talleres.find(t => t.instructor === 'Ing. María López')?.nombre || 'No se encontró el taller';
            break;
        case 'reduce':
            resultado = `Total de inscritos: ${talleres.reduce((acc, t) => acc + t.inscritos, 0)}`;
            break;
        case 'filterMap':
            resultado = talleres.filter(t => t.inscritos < t.cupo).map(t => t.nombre).join('\n') || 'No hay talleres con cupo disponible';
            break;
    }

    resultadoArreglos.textContent = resultado;
});

pintarTabla();


// Segunda parte: Objetos y JSON

const formObjeto = document.getElementById('form-objeto');
const resultadoObjeto = document.getElementById('resultado-objeto');

formObjeto.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const taller = {
        nombre: document.getElementById('obj-nombre').value,
        instructor: document.getElementById('obj-instructor').value,
        cupo: Number(document.getElementById('obj-cupo').value),
        inscritos: Number(document.getElementById('obj-inscritos').value)
    };

    const operacion = document.getElementById('operacion-objeto').value;
    let resultado;

    switch (operacion) {
        case 'keys':
            resultado = JSON.stringify(Object.keys(taller));
            break;
        case 'values':
            resultado = JSON.stringify(Object.values(taller));
            break;
        case 'entries':
            resultado = Object.entries(taller).map(([campo, valor]) => `${campo}: ${valor}`).join('\n');
            break;
        case 'stringify':
            resultado = JSON.stringify(taller, null, 2);
            break;
        case 'roundtrip': {
            const textoJson = JSON.stringify(taller, null, 2);
            const objetoDeVuelta = JSON.parse(textoJson);
            resultado = `${textoJson}\n\nTipo: ${typeof objetoDeVuelta}\nNombre: ${objetoDeVuelta.nombre}`;
            break;
        }
    }

    resultadoObjeto.textContent = resultado;
});


// Tercera parte: Strings y fechas

function fechaDesdeTexto(texto) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) return null;

    const [dia, mes, anio] = texto.split('/').map(Number);
    const fecha = new Date(anio, mes - 1, dia);

    return fecha.getDate() === dia && fecha.getMonth() === mes - 1 && fecha.getFullYear() === anio ? fecha : null;
}

const formTexto = document.getElementById('form-texto');

formTexto.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const entrada = document.getElementById('nombre-texto').value;
    const cupo = Number(document.getElementById('cupo-texto').value);
    const textoFecha = document.getElementById('fecha-texto').value.trim();
    const error = document.getElementById('error-fecha');
    const resultado = document.getElementById('resultado-texto');
    const fecha = fechaDesdeTexto(textoFecha);

    if (!fecha) {
        error.textContent = 'Escribe una fecha válida en formato DD/MM/AAAA.';
        resultado.textContent = '';
        return;
    }

    error.textContent = '';

    const hoy = new Date();
    const diferencia = Math.round((Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) - Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000);

    resultado.textContent = [
        `trim: ${entrada.trim()}`,
        `split: ${JSON.stringify(entrada.trim().split(/\s+/))}`,
        `includes (@): ${'correo@cecyt9.ipn.mx'.includes('@')}`,
        `replace: ${textoFecha.replace('/', '-')}`,
        `replaceAll: ${textoFecha.replaceAll('/', '-')}`,
        `${entrada.trim()} se inscribió en un taller con cupo para ${cupo} personas.`,
        `Fecha: ${fecha.toLocaleDateString('es-MX')}`,
        `Día de la semana (0=domingo): ${fecha.getDay()}`,
        `Diferencia respecto a hoy: ${diferencia} día(s)`
    ].join('\n');
});