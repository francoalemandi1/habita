# Iconos de Habita

## Calidad y resolución

Los iconos se generan con el script `scripts/generate-icons.sh` para que se vean nítidos en pantallas retina (2x/3x) y en PWA.

- **Web**: `public/icon-192.png` y `public/icon-512.png` (PWA y metadata).
- **Mobile**: `apps/mobile/assets/logo.png`, `logo-32.png`, `logo-48.png`, `logo-96.png` (resolución 3x respecto al tamaño de visualización).

## Regenerar iconos

Desde la raíz del repo:

```bash
pnpm run generate:icons
```

Por defecto usa `src/app/favicon.ico` (48×48). Para **mejor calidad**, exportá el logo en alta resolución (1024×1024 o mayor) y guardalo como:

```
apps/mobile/assets/logo-source-1024.png
```

Volvé a ejecutar `pnpm run generate:icons`; el script usará ese archivo como fuente y generará todos los tamaños desde ahí.

**Requisitos**: macOS con `sips` (viene por defecto). En Linux/Windows podés convertir el favicon o `logo-source-1024.png` a PNG y escalar con ImageMagick o similar a 192, 512, 96, 144 y 288 px según los comentarios del script.
