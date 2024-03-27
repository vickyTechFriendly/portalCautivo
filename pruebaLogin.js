const axios = require('axios');
const https = require('https');
require('dotenv').config();

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

  loginUniFi();

//http://82.223.9.122:8880/guest/s/default/?ap=d0:21:f9:36:ed:7e&ec=pqFq9mHSpzfMMV3bO_e14Xe9ImGsTfad3FL3vxCSp3JQK52E8tpEg9_NeJVSQwS98na_iECA7DWl_c4CUeoU6pn9Snt5XRduhgs-sxdpodWHZIGTJnTgCDWneYGOSTYmkRvWSZvJ4ilun1i2R8dkXoiG8Pd4_Ff9Y659z3moDiE6i8JrZuRTYHKd-7wW74gZ