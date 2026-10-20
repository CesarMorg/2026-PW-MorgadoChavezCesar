const express = require('express');

const talleres = require('./Controlador/talleres_controlador');
const asistencia = require('./Controlador/asistencia_controlador');

const app = express();

app.use(express.json());

const PORT = 4000;

// ejemplo de una peticion por medio de una ruta principal GET
app.get('/saludo', (req, res)=>{
    res.json({mensaje:'Hola esto es una prueba en GET'});
});

app.post('/eco', (req, res)=>{
    const {texto} = req.body;
    if(!texto){
        return res.status(400).json({error:'El texto es obligatorio'});
    }
    res.status(201).json({eco:texto});
});

// rutas de talleres
app.get('/api/talleres', talleres.listarTalleres);
app.post('/api/talleres/inscribir', talleres.registrarAlumno);

// rutas de asistencia
app.post('/api/asistencia', asistencia.registrarAsistencia);
app.get('/api/talleres/:id/asistencia', asistencia.consultarAsistenciaTaller);

app.listen(PORT, () =>{
    console.log(`Servidor escuchando en el puerto: ${PORT}`);
});