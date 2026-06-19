# Estación del Sol — Sistema Web

Hotel Estación del Sol · Las Núñez, Santa Elena, Ruta del Spondylus, Ecuador.

---

## Estructura del proyecto

```
/
├── backend/
│   ├── server.js        — Servidor Express principal (sirve también el frontend)
│   ├── .env.example     — Variables de entorno (copiar a .env)
│   ├── package.json
│   ├── frontend/
│   │   ├── index.html   — Página principal del hotel
│   │   ├── checkin.html — Formulario de check-in en línea
│   │   └── images/      — Fotos propias del hotel (opcional)
│   ├── routes/
│   │   ├── reservas.js  — POST /api/reservas, GET /api/disponibilidad
│   │   ├── checkin.js   — POST /api/checkin
│   │   ├── admin.js     — Panel de administración (protegido)
│   │   └── contacto.js  — POST /api/contacto
│   ├── models/
│   │   ├── Reserva.js   — Esquema SQLite + lógica de negocio
│   │   └── Checkin.js   — Esquema SQLite check-ins
│   ├── services/
│   │   ├── email.js     — Nodemailer (Gmail)
│   │   └── whatsapp.js  — CallMeBot (gratis)
│   ├── middleware/
│   │   └── auth.js      — API key para panel admin
│   └── uploads/
│       └── cedulas/     — Fotos de cédulas subidas
│
└── README.md
```

> Todo el proyecto vive dentro de `backend/` para que en hosting con apps Node.js administradas (ej. Hostinger Business) baste con apuntar la app a esta única carpeta — el frontend queda protegido bajo el mismo control de acceso del servidor.

---

## Instalación local

### Requisitos
- Node.js 18 o superior

### Pasos

```bash
cd backend
npm install
cp .env.example .env
# edita .env con tus datos reales
npm run dev     # desarrollo
npm start       # producción
```

El servidor inicia en `http://localhost:3000`.
El frontend se sirve automáticamente desde ahí.

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor (default 3000) |
| `DATABASE_URL` | Ruta al archivo SQLite |
| `EMAIL_USER` | Correo Gmail del hotel |
| `EMAIL_PASS` | Contraseña de aplicación Google (16 chars) |
| `ADMIN_API_KEY` | Clave para el panel admin |
| `CALLMEBOT_API_KEY` | API key gratuita de CallMeBot |
| `HOTEL_WHATSAPP` | Número sin `+` ni espacios: `593986721666` |
| `FRONTEND_URL` | URL del sitio en producción |

**Contraseña de aplicación Gmail:** Cuenta Google → Seguridad → Contraseñas de aplicaciones.

**CallMeBot (WhatsApp gratis):**
1. Agrega `+34 644 47 93 97` a tus contactos
2. Envíale: `I allow callmebot to send me messages`
3. Recibirás tu API key por WhatsApp

---

## Endpoints de la API

```
POST /api/reservas
GET  /api/disponibilidad?habitacion=B6&fecha_entrada=2026-07-01&fecha_salida=2026-07-03

POST /api/checkin          (multipart/form-data, acepta foto_cedula)
POST /api/contacto

# Panel admin — header requerido: X-Admin-Key: TU_CLAVE
GET  /api/admin/reservas
PUT  /api/admin/reservas/:id/estado   { estado: "confirmada" }
GET  /api/admin/disponibilidad/calendario
GET  /api/admin/checkins
```

---

## Habitaciones

| Código | Vista | Máx. personas |
|--------|-------|--------------|
| A1 | Montaña / Parque | 5 |
| B1 | Piscina | 3 |
| B2 | Piscina | 5 |
| B3 | Montaña | 3 |
| B4 | Montaña | 3 |
| B5 | Mar | 4 |
| B6 | Mar | 4 |

**Precio:** $20 USD / persona / noche + 15% IVA

---

## Despliegue en Hostinger (plan Business)

1. **hPanel → Node.js → Crear aplicación**
   - Node.js 18+, directorio raíz: carpeta `backend/`, archivo inicio: `server.js`

2. **Subir archivos** vía Git o FTP, luego `npm install --production` por SSH.

3. **Variables de entorno:** hPanel → Node.js → tu app → Variables de entorno (agregar una por una).

4. **Proxy inverso:** en `.htaccess` del dominio:
   ```apache
   RewriteEngine On
   RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]
   ```

5. Activar HTTPS gratuito (Let's Encrypt) en hPanel → SSL.

---

## .gitignore recomendado

```
backend/.env
backend/datos/
backend/uploads/cedulas/
backend/node_modules/
```

---

*Hecho con calma en la Ruta del Spondylus.*
