// 01-arreglos.js

const talleres = [
  { nombre: 'Introducción a Python', instructor: 'Ing. María López', cupo: 25, inscritos: 25 },
  { nombre: 'Fundamentos de Redes', instructor: 'Ing. Carlos Ramírez', cupo: 30, inscritos: 18 },
  { nombre: 'Diseño de Bases de Datos', instructor: 'Ing. Ana Torres', cupo: 20, inscritos: 20 },
  { nombre: 'Desarrollo Web con JS', instructor: 'Ing. María López', cupo: 25, inscritos: 10 },
];

// forEach
console.log("Aplicando un forEach para imprimir los talleres:");
talleres.forEach((t) => console.log(`- ${t.nombre} (${t.inscritos}/${t.cupo})`));

// map
console.log("Aplicando función Map con solo nombres:");
const nombres = talleres.map((t) => t.nombre);
console.log(nombres);

// filter
console.log("Aplicando la función Filter en los talleres:");
const llenos = talleres.filter((t) => t.inscritos >= t.cupo);
console.log(llenos.map((t) => t.nombre));

// find
console.log("Aplicando la función Find en los talleres:");
const tallerMaria = talleres.find(
  (t) => t.instructor === "Ing. María López"
);
console.log(`${tallerMaria.nombre} (${tallerMaria.inscritos}/${tallerMaria.cupo})`);

// reduce
const totalInscritos = talleres.reduce((suma, t) => suma + t.inscritos, 0);
console.log("Total de inscritos en todos los talleres: " + totalInscritos);

// filter + map
const talleresDisponibles = talleres
  .filter((t) => t.inscritos < t.cupo)
  .map((t) => t.nombre);

console.log(talleresDisponibles);