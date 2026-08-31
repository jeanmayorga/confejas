# Módulos de negocio

Cada dominio de la aplicación vive en su propia carpeta dentro de `modules`.

```text
participants/
├── components/  # Interfaz del módulo
├── schemas/     # Validación compartida
├── server/      # Servicios, consultas y repositorios
└── types.ts     # Tipos compartidos
```

Los archivos ejecutables dentro de `server` deben comenzar con
`import "server-only"`. Los archivos `schema.ts` de Drizzle son la excepción:
Drizzle Kit los carga fuera del runtime de Next.js y solo contienen metadatos
de tablas, no secretos ni consultas.
Los componentes interactivos usan el sufijo `.client.tsx` y la directiva
`"use client"`. Las rutas y los endpoints permanecen en `src/app`.
