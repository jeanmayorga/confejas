# Confejas

Aplicación full-stack construida con Next.js, Bun, shadcn/ui, Drizzle ORM y
PostgreSQL en Neon.

## Desarrollo

```bash
bun install
bun dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Base de datos

Crea `.env.local` a partir de `.env.example` y configura `DATABASE_URL` con la
cadena de conexión de Neon.

```bash
bun run db:check
bun run db:generate
bun run db:migrate
bun run db:studio
```

Las migraciones SQL generadas se guardan en `drizzle/`.

## Verificación

```bash
bun run lint
bun run build
```

## Estructura

- `src/app`: rutas, layouts y endpoints de Next.js.
- `src/components/ui`: componentes base administrados por shadcn/ui.
- `src/modules`: módulos del negocio y sus límites cliente/servidor.
- `src/server/db`: conexión y esquema central de Drizzle.
- `src/lib`: utilidades compartidas e integraciones de infraestructura.

El despliegue de producción se realizará en Vercel.
