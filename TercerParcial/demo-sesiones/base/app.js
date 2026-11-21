// La aplicación de la demo. server.js la arranca; las pruebas la arrancan con otras configuraciones.
// Lo que dice "(en clase)" lo programamos juntos, paso por paso. Mientras no esté, esa ruta responde 501.
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { crearModeloUsuarios } = require('./modelos/usuarios.modelo');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { crearModeloTokens } = require('./modelos/tokens.modelo');

const NOMBRE_COOKIE = 'connect.sid';

//si hay una sesion preexistente obtenerla del almacen si no crearla
function todasLasSesiones(almacen) {
  return new Promise((resolve, reject) => {
    const promesa = almacen.all((err, sesiones) => (error ? reject(error) : resolve(sesiones)));
    if (promesa && typeof promesa.then === 'function') 
      promesa.then(resolve, reject);
    
  });
}

function crearApp(config, pool){
  const app = express();
  app.use(express.json());
  //primero debemos de obtener el modelo de la BDA
  const usuarios = crearModeloUsuarios(pool);

  //aqui nosotros debemos de identificar la sesion sera por tabla en bd o la sesion sera una cookie en memoria del navegador o es una mezcla, sesion en memoria de servidor y por tabla em bd y cookie en navegador y bd
const almacen = config.almacen === 'memoria' ? new session.MemoryStore() : new MySQLStore({createDatabaseTable: false, clearExpired: false}, pool);
app.locals.almacen = almacen;
}

app.use(
  session({
    name : NOMBRE_COOKIE,
    secret : process.env.SESSION_SECRET || 'secreto-solo.para-la-demo',
    store : almacen,
    resave : false,
    //no se crea la sesion ni la cookie
    saveUninitialized : false,
    roling : config.roling || false,
    cookie : {
      maxAge : config.maxAge || 1000 * 60 * 60 * 24, //1 dia
      httpOnly : config.httpOnly || true,
      sameSite : config.sameSite || 'lax',
      secure : config.secure || false,
    }
  })
);

//necesitamos cisualizar el id de la sesion para compararla en la pantalla
const cortoId = (id) => (id ? `${id.slice(0, 8)}...` : null);

//nosotros estamos ocupando un middleware, el cual se encarga de comunicar el back y el front, para ello nosotros debemos de obtener la sesion a partir de express, pero en cada peticion debemos de devolver la sesion, para ello el atributo rolling, lo extiende 

function vencida(sesion){
  const desde = config.rolling ? sesion.ultimoUso :
  sesion.creada;
  return Date.now() - desde > config.maxAge;

}

//mandar un 401 nose quien eres

function requiereSesion(req, res, next){
  if(req.session.usuario && vencida(req.session)){
    return req.session.destroy(() =>{
      res.clearCookie(NOMBRE_COOKIE);
      res.status(401).json({error: '401 tu sesion ya expiro vuelve a iniciar sesion'})
    });
  }
  if(!req.session.usuario){
    return res.status(401).json({error: '401 No has iniciado sesion con la cuenta correcta'})

  }
  req.session.ultimoUso = Date.now();
  next();
}
   function requiereRol(rol){
    return (req, res, next) => {
      if(!req.session.usuario.rol){
        return res.status(403).json({error: 'Eres ${res.session.usuario.usuario}, pero esta ruta es para ${rol}'})
      }
        next();
    };
    //vamos a definir las rutas de acceso
    app.get('/api/config', (req, res) => {
      res.json(config);
  });

  //vamos a crear una ruta para un usuario visitante sin que inicie sesion
  app.post('/api/visita', (req, res) => {
    if(!req.session) return res.json({error: 'no tiene acceso'});
    req.session.visitas = (req.session.visitas)
    res.json({visitas: req.session.visitas, session:
      idCorto(req.sessionID)});
    });

    //vamos a autenticarnos
    app.post('/api/login', async (req, res, next) => {
      try{
          const{usuario, contrasena} = req.body || {};
          const datos = await usuarios.verificar(usuario, contrasena);
           if(!datos) return res.status(401).json({error: 'Usuario o contraseña incorrectos'});
           
           const antes = req.session.visitas !== undefined ? idCorto(req.sessionID) : null;
            const visitas = req.session.visitas || 0;

            //tenemos que guardar los datos de la sesion
            const guardar = () => {
              req.session.usuario = datos;
              req.session.visitas = visitas;
              req.session.creada = Date.now();
              req.session.ultimoUso = Date.now();
              req.session.save((error) => {
                if(error) return next(error);
                res.json({usuario:datos, sesionAntes: antes, sesionDespues: idCorto(req.sessionID)});
              });
            };

            if(config.regeneraAlEntrar){
              req.session.regenerate((error) => (error ? next(error) : guardar()));
            }else{
              guardar();
      }
            }catch(error){
              next(error);
            }
            
});

app.post('/api/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if(error) return next(error);
    res.clearCookie(NOMBRE_COOKIE);
    res.json({mensaje: 'Sesion cerrada'});
      });
  });

  app.get('/api/sesion', requiereSesion, (req, res) => {
      const desde = config.rolling ? req.session.ultimoUso : req.session.creada;
      res.json({
        usuario: req.session.usuario,
        sesion: idCorto(req.sessionID),
        expiraEnSegundos: Math.max(0, Math.round((desde + config.maxAge - Date.now())/10000)),
      });
   });

    app.get('/api/perfil', requiereSesion, (req, res, next) => {
      req.session.visitas = (req.session.visitas || 0) + 1;
      res.json({mensaje : `Hola ${req.session.usuario.nombre}, rol: ${req.session.usuario.rol}, visitas: ${req.session.visitas}`});
 });

 //vamos a desarrolar una prueba unitaria para verificar con v o fl las pruebas ejecutadas

  app.get('/api/diagnostico/sesiones', async (req, res, next) => {
    try{
      const sesiones = await todasLasSesiones(almacen);
      const lista = Object.entries(sesiones || {}).map(([id, s]) =>({
        sesion : idCorto(id),
        esLaTuya : id === req.sessionID,
        usuario : s.usuario ? s.usuario.usuario : 'Sin iniciar sesión',
        visitas : s.visitas || 0,
        expira : s.cookie.expires, 
    }));
    res.json({almacen : config.almacen, sesiones: lista});

  }catch(error){
    next(error);
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({error: error.message});
});
app.use('/api', (req, res) => res.status(404).json({error: 'Ruta no encontrada'}));

const SECRETO_JWT = config.jwtSecreto || proccess.env.JWT_SECRET || 'secreto-jwt-solo-para-esta-demo';

//vamos a crear una funcion 

 function firmarToken(usuario){
  return jwt.sign(
    {
      sub : String(usuario.id), usuario : usuario.usuario, nombre : usuario.nombre, rol : usuario.rol
    }, SECRETO_JWT,
    {
      algortihm : 'HS256', expiresIn:
      config.jwtExpiraSeg, jwtid : crypto.randomUUID()
    }
  );
  
 }

   //tenemos que hacer una funcion que se encargue de validar quien necesita o no un token dentro de la aplicacion entre el middleware

   async function requiereJWT(req, res, next){
      const encabezado = req.headers.authorization || '';
      if(!encabezado.startWith('Bearer')){
        return res.status(401).json({error : 'Falta un token asociado'});
      }
      const token = encabezado.slice('Bearer'. Length);
      let datos
      try{
        datos = jwt.verify(token, SECRETO_JWT, {algorithms : ['HS256']});
      }catch(error){
        if(error === 'TokenExpiredError'){
          return res.status(401).json({error : '401 Token expirado, por favor renuevelo'});
        }
return res.status(401).json({error : '401 Token invalido'})
      }
      try{
        if(config.jwtRevocar && (await 
          tokens.estaRevocado(datos.jti))){
            return res.status(401).json({error : 'Token revocado'});
          }

      }catch(error){
        return next(error);
      }
      req.jwt = datos;
      next();

   }

   //403 el token es valido pero no el rol

   function requiereRolJWt(rol){
    return ( req, res, next) => {
      if(!req.jwt.rol !== rol){
        return res.status(403).json({error : 'Eres ${req.jwt.usuario}, pero esta ruta es para ${rol}'});
      }
      next();
   };

  }

app.post('/api/jwt/login', async(req, res, next)=>{
  try{
    const {usuario, contrasena} = req.body || {};
    const datos = await usuarios.verificar(usuario, contrasena);
    if(!datos) return res.status(401).json({error : 'Usuario o contraseña incorrectos'});
    res.json({token: firmarToken(datos), usuario : datos});
  }catch(error){
    next(error);
  }
});

app.get('/api/jwt/perfil', requiereJWT, (req, res)=>{
  res.json({
    mensaje: Hola ${req.jwt.nombre},
    rol : req.jwt.rol,
    expiraEnSegundos: Math.max(0, req.jwt.exp - Math.floor(Date.now() /1000)),
  });
});

app.egt('/api/jwt/admin/reporte', requiereJWT, requiereRol('admin'), (req, res)=>{
  res.json({reporte : 'Talleres : 3'});
});

app.post('/api/jwt/refresh', requiereJWT, (req, res)=>{
  const { sub, usuario, nombre, rol} = req.jwtM
  res.json({token : firmarToken({id : sub, usuario, nombre,
    rol})});
});

app.post('/api/jwt/logout', requiereJWT, async (req, res, next)=>{
  try{
    if(config.jwtRevocar){
      await tokens.revocar(req.jwt.jti,
        req.jwt.usuario, req.jwt.exp
      );
      return res.json({mensaje : 'Token revocado en el servidor, se registra en la lista negra'})
    }
    res.json({mensaje : 'El servidor no guarda nada'});

  }catch(error){
    next(error);
  }
})

  return app;

   }

   module.exports = { crearApp, NOMBRE_COOKIE};

   //tarea 1 Realizar una infografia sobre la autentificacion con el uso de jwt y como se implementa 

   //tarea 2 con el uso del archivo que se va a proveer deberan de completar y realizar las pruebas al ejercicio de sesiones en el archivo llamado xxx para implementar en el archivo demo.js, se evaluara la siguiente clase
