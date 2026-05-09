# Portal de notas /Estudiantil

Portal de Gestión de Notas de Estudiantes. Un sistemacon un frontend en React (Vite) y un backend en Node.js (Express), gestionando datos a través de PostgreSQL con Drizzle ORM.

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalados los siguientes componentes:
- **Node.js** (versión 20 o superior recomendada)
- **pnpm** (gestor de paquetes, versión 9+)
- **PostgreSQL** (base de datos relacional)

---

##  1. Instalación de Dependencias

El proyecto utiliza un entorno de Monorepo basado en pnpm workspaces. En la raíz del proyecto, ejecuta:

```bash
pnpm install
```

---

##  2. Configuración de Variables de Entorno

El proyecto requiere ciertas variables de entorno para funcionar, tanto para la base de datos como para el servidor web.
Puedes exportarlas o crear un archivo `.env` en la raíz (si tu entorno lo soporta) con el siguiente formato:

```env
# URL de conexión a PostgreSQL
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/estudiantes"

# Puerto en el que correrán los servidores (API Server y Vite)
PORT=5000

# Ruta base para el frontend (generalmente "/")
BASE_PATH="/"

# Secreto para la firma de las sesiones
SESSION_SECRET="tu-secreto"
```

*Asegúrate de reemplazar los valores de la `DATABASE_URL` con las credenciales correctas de tu base de datos local o remota.*

---

##  3. Base de Datos (Migración y Semilla)

Una vez creada tu base de datos PostgreSQL y configurada la variable `DATABASE_URL`, el siguiente paso es empujar el esquema de la base de datos (crear tablas) usando Drizzle ORM.

Ejecuta el siguiente comando para **migrar el esquema**:

```bash
pnpm --filter @workspace/db run push
```

**(Opcional)** Para poblar la base de datos con datos iniciales (Seed):

```bash
pnpm --filter @workspace/scripts run seed
```

---

##  4. Entorno de Desarrollo (Local)

Para ejecutar el proyecto en tu máquina local en modo desarrollo (con recarga en caliente), debes levantar tanto el servidor de la API como el Frontend:

**Terminal 1 (Backend - API Server):**
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 (Frontend - Interfaz de Notas):**
```bash
pnpm --filter @workspace/notas run dev
```

---

##  5. Construcción para Producción (Deploy)

Para desplegar el proyecto a producción, es necesario compilar el código TypeScript/React y luego iniciar los servicios de forma optimizada.

### 5.1 Construir el Proyecto

Ejecuta los comandos de compilación (build) en el servidor API y el frontend:

```bash
# Construir Backend
pnpm --filter @workspace/api-server run build

# Construir Frontend
pnpm --filter @workspace/notas run build
```

### 5.2 Levantar Servicios en Producción

Una vez compilado, puedes iniciar la API para que sirva el backend:

```bash
# Iniciar Servidor de la API en producción
pnpm --filter @workspace/api-server run start
```
*O también puedes iniciarlo directamente ejecutando:* `node ./artifacts/api-server/dist/index.mjs`

El frontend compilado se encontrará en `artifacts/notas/dist/public`. Puedes servirlo con el mismo servidor de la API (si está configurado para servir archivos estáticos) o usar un servidor Nginx/Apache o una plataforma de hosting de frontend (como Vercel, Netlify, o Vite preview).

Para probar el frontend de producción de manera rápida puedes usar:
```bash
pnpm --filter @workspace/notas run serve
```
