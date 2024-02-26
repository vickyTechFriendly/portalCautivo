const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const app = express();

// Crear el almacenamiento en memoria para la sesión
const memoryStore = new session.MemoryStore();

// Configura la sesión
app.use(session({
  secret: process.env.secretcookie,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Para desarrollo, en producción debería ser true
}));

// Configuración de Keycloak
const keycloakConfig = {
  clientId: process.env.clientId,
  bearerOnly: false,
  serverUrl: 'http://localhost:9010',
  realm: process.env.realm,
  credentials: {
    secret: process.env.secret
  }
};

const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

app.use(keycloak.middleware({
  logout: '/logout',
  admin: '/',
}));

app.get('/', keycloak.protect(), (req, res) => {
  res.send('Página Protegida - Si estás viendo esto, estás autenticado');
});

// Iniciar el servidor
const port = 3010;
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});