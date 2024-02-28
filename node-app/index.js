const axios = require('axios');
const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const pgSession = require ('connect-pg-simple')(session);
/* const https = require('https');
const fs = require('fs'); */

const pgPool = require('pg').Pool;

const app = express();

const dbParams = {
  user: 'keycloak',
  password: process.env.POSTGRES_PASSWORD,
  host: 'postgres',
  port: 5432,
  database: 'keycloak'
};
const pool = new pgPool(dbParams);

app.use(session({
  store: new pgSession({
    pool:pool,
    tableName:'session'
  }),
  secret: process.env.secretcookie,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true } 
}));

//Configurar aquí la petición al controlador WiFi
const PostControladorWiFi = async (req, res, next) => {
  const postData = {
    title: 'foo',
    body: 'bar',
    userId: 1
  };

  try {
    const response = await axios.post('https://jsonplaceholder.typicode.com/posts', postData);
    console.log('Respuesta del controlador WiFi:', response.data);
    next(); 
  } catch (error) {
    console.error('Error al intentar autenticar con el controlador WiFi:', error);
    res.status(500).send('Error interno del servidor');
  }
};

//Configurar después de haber configurado en la consola de Keycloak el cliente y el realm
const keycloakConfig = {
  clientId:process.env.clientId,
  bearerOnly: false,
  serverUrl:'http://172.17.0.1:9010', // URL del servidor Keycloak
  realm:process.env.realm,
  credentials: {
    secret: process.env.secret
  }
};

const keycloak = new Keycloak({ store: pool }, keycloakConfig);

app.use(keycloak.middleware({
  logout: '/logout',
  admin: '/',
}));

app.get('/', keycloak.protect(), PostControladorWiFi, (req, res) => {
  res.send('Página Protegida - Si estás viendo esto, estás autenticado');
});

/* // Código para iniciar el servidor con HTTPS en produ
const httpsOptions = {
  key: fs.readFileSync('/ruta/a/tu/llave-privada.key'),
  cert: fs.readFileSync('/ruta/a/tu/certificado.crt')
}; */

//Cambiar el puerto a 443 en producción (o según sea necesario)
const port = 3000;

/* https.createServer(httpsOptions, app).listen(port, () => {
  console.log(`Servidor escuchando en https://tu-dominio.com:${port}`); //dominio puerto wifi
}); */

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});