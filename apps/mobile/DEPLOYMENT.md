# Mobile Deployment Guide

## Setup actual

- **Bundle ID:** `casa.habita.app`
- **Scheme:** `habita`
- **EAS Project ID:** `b661be21-7f51-4bfc-98ef-a61e7e2d20dd`
- **Expo slug:** `habita-mobile`
- **Expo account:** `franalemandi`

---

## Variables de entorno

Las vars `EXPO_PUBLIC_*` deben estar en `apps/mobile/.env` (Expo no lee el `.env` raíz del monorepo).

```env
EXPO_PUBLIC_API_BASE_URL="http://192.168.100.17:3001"   # cambiar por IP local o URL de prod
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="615232460202-r8buqnl4jgo1894drai2h4l9qiegutte.apps.googleusercontent.com"
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="615232460202-e89h4nrbg8cte00m600q77m832nt5170.apps.googleusercontent.com"
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="615232460202-7376tg8tkprrr87q97o54eu0g40kp9nu.apps.googleusercontent.com"
```

Los perfiles de EAS (`eas.json`) también tienen estas vars hardcodeadas para builds en la nube.

---

## Google OAuth

El login usa `expo-auth-session` con el cliente iOS nativo (`iosClientId`).

**Configuración en Google Cloud Console:**

| Cliente | Bundle ID | Para qué |
|---------|-----------|---------|
| iOS (`...r8buqnl4jgo...`) | `casa.habita.app` | Builds reales |
| Web (`...7376tg8tkprrr...`) | — | Backend NextAuth + fallback |

El `CFBundleURLSchemes` en `app.json` (`com.googleusercontent.apps.615232460202-r8buqnl4jgo1894drai2h4l9qiegutte`) es obligatorio para que el redirect de OAuth funcione en builds reales.

**Expo Go no es compatible con Google OAuth** — el custom scheme `habita://` no está permitido para clientes Web, y el cliente iOS requiere el bundle ID real (`casa.habita.app`) que Expo Go no tiene.

---

## Setup de Xcode (una sola vez)

1. Instalá **Xcode** desde el App Store de Mac (gratuito, ~15GB)
2. Abrí Xcode una vez para que termine de instalar los componentes adicionales
3. Activá las developer tools:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
4. Verificá:
   ```bash
   xcode-select -p
   # Debe mostrar: /Applications/Xcode.app/Contents/Developer
   ```

---

## Desarrollo local — Simulador iOS

No requiere iPhone físico.

```bash
# Terminal 1 — levantar backend
pnpm dev

# Terminal 2 — levantar Metro + compilar en simulador
cd apps/mobile
npx expo run:ios
```

Metro queda corriendo con hot reload. Los cambios en código se reflejan en segundos.

---

## Desarrollo local — Dispositivo físico iOS

Requiere iPhone conectado por cable y Xcode configurado (ver Setup arriba).

```bash
# Terminal 1 — levantar backend (asegurate que EXPO_PUBLIC_API_BASE_URL tenga tu IP local)
pnpm dev

# Terminal 2 — compilar e instalar en el iPhone
cd apps/mobile
npx expo run:ios --device
```

Xcode firma automáticamente con el Apple ID gratuito (sin pagar $99). La app **expira a los 7 días** y hay que reinstalar con el mismo comando.

En el iPhone, la primera vez:
- Ajustes → General → VPN y gestión del dispositivo → tu Apple ID → **Confiar**

> **Nota:** Para que el login con Google funcione, el iPhone debe estar en la **misma red WiFi** que el backend, y `EXPO_PUBLIC_API_BASE_URL` debe apuntar a tu IP local (ej: `http://192.168.100.17:3001`). Para testear contra producción, cambiarlo a `https://habita.vercel.app`.

> **Nota:** `eas device:create` y el perfil `development` de EAS requieren Apple Developer Program ($99/año). No es necesario para desarrollo personal.

---

## Build Android (APK)

### Con Android Studio instalado

```bash
cd apps/mobile
npx expo run:android --device
```

Requiere Android Studio + depuración USB activada en el dispositivo.

### Con EAS (sin Android Studio, compila en la nube)

```bash
cd apps/mobile
npx eas build --profile preview --platform android --non-interactive
```

EAS genera el APK y da un QR para instalar directo. No requiere Google Play ni cuenta de developer. Solo cuenta de Expo (gratuita).

---

## Perfiles de EAS

| Perfil | `distribution` | `API_BASE_URL` | Uso |
|--------|---------------|----------------|-----|
| `development` | `internal` | IP local | Dev con hot reload |
| `preview` | `internal` | Vercel prod | Testing interno |
| `production` | store | Vercel prod | App Store / Play Store |

```bash
# Build preview para Android (el más útil sin developer accounts)
npx eas build --profile preview --platform android

# Build production (requiere cuentas de developer)
npx eas build --profile production --platform ios
npx eas build --profile production --platform android
```

---

## Checklist antes de un build

- [ ] `apps/mobile/.env` tiene las vars correctas
- [ ] `EXPO_PUBLIC_API_BASE_URL` apunta a la URL correcta (local vs prod)
- [ ] `pnpm typecheck:all` pasa sin errores
- [ ] Google Console tiene el bundle ID `casa.habita.app` en el cliente iOS
