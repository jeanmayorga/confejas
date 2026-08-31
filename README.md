# Confejas

Aplicación full-stack construida con Next.js, Bun y shadcn/ui.

## Desarrollo

```bash
bun install
bun dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Verificación

```bash
bun run lint
bun run build
```

## Estructura

- `src/app`: rutas, layouts y endpoints de Next.js.
- `src/components/ui`: componentes base administrados por shadcn/ui.
- `src/modules`: módulos del negocio y sus límites cliente/servidor.
- `src/lib`: utilidades compartidas e integraciones de infraestructura.

El despliegue de producción se realizará en Vercel.
