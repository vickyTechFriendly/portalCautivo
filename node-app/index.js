const axios = require('axios');
const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const pgSession = require ('connect-pg-simple')(session);

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
  cookie: { secure: false }  
}));

const autenticarEnControladorWiFi = async (req, res, next) => {
  // Ejemplo de datos para hacer el POST
  const postData = {
    title: 'foo',
    body: 'bar',
    userId: 1
  };

  try {
    const response = await axios.post('https://jsonplaceholder.typicode.com/posts', postData);
    // Muestra en la consola la respuesta para verificar
    console.log('Respuesta del controlador WiFi:', response.data);
    next(); 
  } catch (error) {
    console.error('Error al intentar autenticar con el controlador WiFi:', error);
    res.status(500).send('Error interno del servidor');
  }
};

// Configura la sesión
app.use(session({
  secret: process.env.secretcookie,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Para desarrollo, en producción debería ser true
}));

// Configuración de Keycloak
const keycloakConfig = {
  clientId: 'SANXENXO_WIFI',
  bearerOnly: false,
  serverUrl: 'http://localhost:9010',
  realm: 'Concello_de_Sanxenxo',
  credentials: {
    secret: 'Hy9PX1dl5hcR3UDJrM1mAAdLUpQSQUxV'
  }
};

const keycloak = new Keycloak({ store: pool }, keycloakConfig);

app.use(keycloak.middleware({
  logout: '/logout',
  admin: '/',
}));

// Rutas
app.get('/', (req, res) => {
  res.send('Página Principal - No protegida');
});

app.get('/protected', keycloak.protect(), autenticarEnControladorWiFi, (req, res) => {
  res.send('Página Protegida - Si estás viendo esto, estás autenticado');
});

// Iniciar el servidor
const port = 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});