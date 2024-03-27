const axios = require('axios');
const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const pgSession = require ('connect-pg-simple')(session);
require('dotenv').config();

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

//Configurar después de haber configurado en la consola de Keycloak el cliente y el realm
const keycloakConfig = {
  clientId:process.env.clientId,
  bearerOnly: false,
  serverUrl: process.env.serverUrl,
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

// Función para hacer login en el controlador UniFi
async function loginUniFi() {
  const unifiUrl = `${process.env.UNIFI_CONTROLLER_URL}/api/login`;
  const username = process.env.UNIFI_USERNAME;
  const password = process.env.UNIFI_PASSWORD;

  const agent = new https.Agent({  
      rejectUnauthorized: false // Ignora la verificación de certificados
  });

  try {
      const response = await axios.post(unifiUrl, {
          username,
          password
      }, {
          headers: {
              'Content-Type': 'application/json'
          },
          httpsAgent: agent
      });
      console.log(response.data);
      let unifiSesCookie = '';
      let csrfTokenCookie = '';
      if (response.headers['set-cookie']) {
          //console.log('Cookies recibidas:', response.headers['set-cookie']);
          const cookies = response.headers['set-cookie'];
          cookies.forEach(cookie => {
              if (cookie.startsWith('unifises=')) {
                  unifiSesCookie = cookie.split(';')[0].split('=')[1]; // Extrae solo el valor de la cookie
              }
              if (cookie.startsWith('csrf_token=')) {
                  csrfTokenCookie = cookie.split(';')[0].split('=')[1]; // Extrae solo el valor de la cookie
              }
          });
          //console.log('Cookie de sesión:', unifiSesCookie);
          //console.log('Token CSRF:', csrfTokenCookie);
          return { unifiSesCookie, csrfTokenCookie };
      } else {
          console.log('No se recibieron cookies');
      }
  } catch (error) {
      console.error('Error al iniciar sesión en UniFi:', error);
  }
}

const autorizarUsuario = async (req, res, next) => {
  const macAddress = '5C:87:30:82:6D:85';
  const unifiUrl = process.env.UNIFI_CONTROLLER_URL; 
  const siteId = process.env.UNIFI_SITE_ID || 'default'; 

  try {
    const { unifiSesCookie, csrfTokenCookie } = await loginUniFi();
    const cookieHeader = unifiSesCookie;
    const csrfTokenValue = csrfTokenCookie;

    //console.log('unifiSesCookie:', unifiSesCookie);
    const response = await axios.post(`${unifiUrl}/api/s/${siteId}/cmd/stamgr`, {
          cmd: 'authorize-guest',
          mac: macAddress,
          minutes: 60 // Duración de la autorización en minutos
      }, {
          headers: {
              'Content-Type': 'application/json',
              'Cookie': cookieHeader,
              'X-CSRF-Token': csrfTokenValue
          },
          rejectUnauthorized: false // NOTA: En producción, gestiona correctamente los certificados SSL
      });

      console.log('Respuesta del controlador UniFi:', response.data);
  } catch (error) {
      console.error('Error interactuando con UniFi:', error);
      res.status(500).send('Error interno del servidor');
  }
};

// Extraer la dirección MAC de la URL y almacenar en req.macAddress.
app.use((req, res, next) => { // Ejemplo de URL: https://tuPortalCautivo.com?mac=fc:db:b3:xx:xx:xx
  const macAddress = req.query.mac;
  if (macAddress) {
    console.log(`Dispositivo con MAC ${macAddress} intentando autenticarse.`);
    req.macAddress = macAddress;
  
  next();
} else {
  res.status(400).send('Error: No se proporcionó la dirección MAC del dispositivo');
}
});

app.get('/', keycloak.protect(), autorizarUsuario, (req, res) => {
  res.send(`<html>
  <head><title>Acceso Concedido</title></head>
  <body>
  <h1>Has sido autenticado con éxito</h1>
  <p>Ahora tienes acceso a la red. Puedes cerrar esta ventana y continuar navegando.</p>
  </body>
  </html>`);
});

const port = process.env.PORT || 443; 

app.listen(port, () => {
  console.log(`Servidor iniciado en el puerto ${port}`);
});