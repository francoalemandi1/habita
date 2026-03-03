# Deep Links — Habita Mobile

## Flujo de invitación

El mensaje compartido usa una **Universal Link** (iOS) / **App Link** (Android):

```
Te invito a unirte a mi hogar "Casa García" en Habita 🏠

https://habita.casa/join/MXUC42F2
```

### Qué pasa cuando el receptor toca el link

| Situación | Resultado |
|-----------|-----------|
| iOS con app instalada | iOS intercepta `https://habita.casa/join/*` → abre la app en `/(auth)/join` con el código pre-completado |
| Android con app instalada | Android App Links hace lo mismo |
| Sin app instalada | La web detecta User-Agent móvil → intenta `habita://join?code=MXUC42F2` → si no abre en 1.5s → redirige al App Store / Play Store |
| Desktop / web | Muestra la página normal de join con Google OAuth |

---

## Archivos relevantes

| Archivo | Propósito |
|---------|-----------|
| `public/.well-known/apple-app-site-association` | Autoriza a iOS a interceptar `habita.casa/join/*` |
| `public/.well-known/assetlinks.json` | Autoriza a Android a interceptar `habita.casa/join/*` |
| `src/app/(auth)/join/[code]/page.tsx` | Detecta User-Agent y redirige al deep link o al store |
| `src/app/(auth)/join/[code]/mobile-join-redirect.tsx` | Componente cliente que ejecuta el redirect JS |
| `apps/mobile/app.json` | `associatedDomains` (iOS) + `intentFilters` (Android) |
| `apps/mobile/app/(auth)/join.tsx` | Lee `code` de `useLocalSearchParams` y pre-rellena el input |

---

## Pendientes para publicar en stores

### iOS — Apple Team ID

En `public/.well-known/apple-app-site-association`, reemplazar `TEAMID` con el Apple Team ID real:

```json
"appIDs": ["TEAMID.casa.habita.app"]
```

Dónde obtenerlo: [developer.apple.com](https://developer.apple.com) → Account → Membership Details → Team ID.

### Android — SHA-256 del keystore

En `public/.well-known/assetlinks.json`, reemplazar `REPLACE_WITH_YOUR_SHA256_CERT_FINGERPRINT`:

```json
"sha256_cert_fingerprints": ["AA:BB:CC:..."]
```

Dónde obtenerlo con EAS:
```bash
eas credentials --platform android
```

O manualmente con `keytool`:
```bash
keytool -list -v -keystore release.keystore -alias habita
```

---

## Custom scheme fallback

La app también registra el scheme `habita://` (configurado en `app.json` como `"scheme": "habita"`).

Se usa como fallback cuando Universal Links no están disponibles (app no publicada aún, simulador, builds de desarrollo):

```
habita://join?code=MXUC42F2
```

La ruta `/(auth)/join` lee el param `code` de `useLocalSearchParams` y lo pre-rellena en el input.

---

## Testing en desarrollo

Con Expo Go / build de desarrollo, Universal Links no funcionan (requieren binario firmado publicado en el store). Usar el custom scheme directamente:

```bash
# iOS simulator
xcrun simctl openurl booted "habita://join?code=TEST12"

# Android emulator
adb shell am start -W -a android.intent.action.VIEW -d "habita://join?code=TEST12" casa.habita.app
```
