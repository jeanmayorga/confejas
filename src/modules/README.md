# Módulos de negocio

Cada dominio de la aplicación vive en su propia carpeta dentro de `modules`.

```text
participants/
├── components/  # Interfaz del módulo
├── schemas/     # Validación compartida
├── server/      # Servicios, consultas y repositorios
└── types.ts     # Tipos compartidos
```

Los archivos dentro de `server` deben comenzar con `import "server-only"`.
Los componentes interactivos usan el sufijo `.client.tsx` y la directiva
`"use client"`. Las rutas y los endpoints permanecen en `src/app`.
