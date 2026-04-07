# LifeOS

Dashboard personal para registrar y visualizar hábitos, sueño, entrenamiento en el gimnasio y notas. SPA con React + Vite en el frontend y API REST con Express + MongoDB en el backend.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, React Router 7, Vite 8 |
| Estilos | CSS Variables (sin framework externo) |
| Gráficas | Chart.js 4 + react-chartjs-2 |
| Backend | Express 5, Node.js |
| Base de datos | MongoDB + Mongoose 9 |
| Autenticación | JWT (access 15 min + refresh 7 días) |
| Despliegue | Vercel (cliente) + Railway (servidor) |

---

## Estructura del proyecto

```
lifeos/
├── client/          # SPA React + Vite
│   ├── src/
│   │   ├── pages/   # GymTracker, Habits, Notes, Sleep, Today, Login
│   │   ├── context/ # AuthContext, ThemeContext
│   │   ├── utils/   # exportCsv.js
│   │   └── config.js
│   └── .env.example
└── server/          # API REST Express
    ├── routes/      # auth, habits, notes, routines, sleep, workouts
    ├── models/      # User, Habit, Note, Sleep, Workout, Routine, RefreshToken
    ├── middleware/  # auth.js (verificación JWT)
    ├── scripts/     # createAdmin.js, seedRoutines.js
    └── .env.example
```

---

## Instalación y ejecución local

### Requisitos previos
- Node.js ≥ 18
- Una instancia de MongoDB (local o Atlas)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # edita MONGODB_URI y JWT_SECRET
npm start              # puerto 3001 por defecto
```

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env   # edita VITE_API_URL si el backend no corre en localhost:3001
npm run dev            # abre http://localhost:5173
```

---

## Variables de entorno

### `server/.env`

| Variable | Descripción |
|----------|-------------|
| `MONGODB_URI` | URI de conexión a MongoDB |
| `JWT_SECRET` | Secreto para firmar tokens JWT (mín. 32 chars) |
| `PORT` | Puerto del servidor (defecto: `3001`) |
| `NODE_ENV` | `development` / `production` |
| `ALLOWED_ORIGIN` | URL del frontend en producción (solo CORS) |

### `client/.env`

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL base del backend incluyendo `/api` |

---

## Funcionalidades

- **Today** — Vista diaria con hábitos interactivos, sueño de anoche, entreno del día y strip de estadísticas (racha más larga, promedio de sueño 7d, PRs del mes)
- **Hábitos** — CRUD con rachas, soporte diario/semanal, exportación CSV
- **Sueño** — Registro con gráfico de barras de los últimos 7 días, exportación CSV
- **Gym Tracker** — Series del día con filtro de fecha, historial paginado, récords personales, comparativa semanal, exportación CSV
- **Notas** — CRUD con etiquetas, búsqueda de texto completo (MongoDB $text), paginación, exportación CSV
- **Autenticación** — Registro/login con JWT de corta duración (15 min) + refresh token (7 días) con rotación automática

---

## Scripts útiles

```bash
# Crear usuario administrador
cd server && node scripts/createAdmin.js

# Cargar rutinas semilla
cd server && node scripts/seedRoutines.js
```

---

## Despliegue

1. **Backend en Railway** — conecta el repo, configura las variables de entorno del `server/.env`, Railway detecta el `start` script automáticamente.
2. **Frontend en Vercel** — raíz `client/`, variable `VITE_API_URL` apuntando al backend de Railway.

> El archivo `client/vercel.json` ya incluye la rewrite necesaria para el SPA routing de React Router.
