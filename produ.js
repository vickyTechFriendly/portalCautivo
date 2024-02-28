const axios = require('axios');
const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const pgSession = require('connect-pg-simple')(session);
const https = require('https');
const fs = require('fs');

const pgPool = require('pg').Pool;

const app = express();

// Configuración BD produ
const dbParams = {
  user: 'keycloak',
  password: process.env.POSTGRES_PASSWORD, // Asegurar que esté configurada
  host: 'direccion-de-tu-base-de-datos', // BD produ
  port: 5432,
  database: 'keycloak'
};
const pool = new pgPool(dbParams);

// Configuración sesión
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SECRET_COOKIE, // Asegurar que esté configurada
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true } // TRUE para produ
}));

// Configuración Keycloak
const keycloakConfig = {
  clientId: 'WIFI',
  bearerOnly: false,
  serverUrl: 'https://tu-servidor-keycloak.com', // URL del servidor Keycloak en produ
  realm: 'Concello_de_Sanxenxo',
  credentials: {
    secret: process.env.KEYCLOAK_SECRET // Asegurar que esté configurada
  }
};

const keycloak = new Keycloak({ store: pool }, keycloakConfig);

app.use(keycloak.middleware({
  logout: '/logout',
  admin: '/',
}));

app.get('/', keycloak.protect(), (req, res) => {
  res.send('Página Protegida - Si estás viendo esto, estás autenticado');
});

// Código para iniciar el servidor con HTTPS en produ
const httpsOptions = {
  key: fs.readFileSync('/ruta/a/tu/llave-privada.key'),
  cert: fs.readFileSync('/ruta/a/tu/certificado.crt')
};

// Cambiar el puerto según sea necesario para produ
const port = 3000;

https.createServer(httpsOptions, app).listen(port, () => {
  console.log(`Servidor escuchando en https://tu-dominio.com:${port}`); //dominio puerto wifi
});