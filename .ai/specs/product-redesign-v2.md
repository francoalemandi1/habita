# Product Redesign V2: Household Task Manager

## Visión del Producto

Transformar el Household Task Manager de una simple app de tareas a un **sistema inteligente de gestión del hogar** que promueve equidad, motivación y armonía familiar.

---

## 1. Onboarding Rediseñado

### 1.1 Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│  PASO 1: Bienvenida + Nombre del Hogar                      │
│  "¿Cómo se llama tu hogar?"                                 │
│  [Casa de los García____________]                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 2: Agregar Miembros (OBLIGATORIO, mínimo 2)           │
│                                                             │
│  👤 Franco (tú) - Adulto                                    │
│  👤 María - Adulto                    [+ Agregar miembro]   │
│  👶 Tomás - Niño (8 años)                                   │
│                                                             │
│  Tipo: ○ Adulto  ○ Adolescente  ○ Niño                     │
│  Disponibilidad semanal: [____] horas                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 3: Catálogo de Tareas Predefinidas                    │
│                                                             │
│  🧹 LIMPIEZA                    🍳 COCINA                   │
│  ☑️ Barrer pisos               ☑️ Preparar desayuno        │
│  ☑️ Trapear                    ☑️ Preparar almuerzo        │
│  ☑️ Aspirar                    ☑️ Preparar cena            │
│  ☑️ Limpiar baños              ☐ Lavar platos              │
│  ☐ Limpiar ventanas            ☐ Ordenar despensa          │
│                                                             │
│  🛏️ HABITACIONES               🌿 EXTERIOR                  │
│  ☑️ Tender camas               ☐ Regar plantas             │
│  ☐ Cambiar sábanas             ☐ Cortar césped             │
│  ☐ Ordenar closets             ☐ Sacar basura              │
│                                                             │
│  👕 LAVANDERÍA                  🐕 MASCOTAS                  │
│  ☑️ Lavar ropa                 ☐ Alimentar mascota         │
│  ☐ Planchar                    ☐ Pasear perro              │
│  ☐ Doblar ropa                 ☐ Limpiar arenero           │
│                                                             │
│  [+ Agregar tarea personalizada con IA]                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 4: Configuración de Tareas Seleccionadas              │
│                                                             │
│  Para cada tarea seleccionada:                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🧹 Barrer pisos                                      │   │
│  │                                                      │   │
│  │ Frecuencia: ○ Diaria  ● Semanal  ○ Quincenal        │   │
│  │ Dificultad: ○ ○ ● ○ ○  (3/5)                        │   │
│  │ Tiempo estimado: [15] minutos                        │   │
│  │ Día preferido: [Lunes ▼] (opcional)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 IA: "Basado en tu hogar, sugiero barrer 2x por semana" │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 5: Preferencias de Miembros                           │
│                                                             │
│  👤 Franco, ¿qué tareas prefieres?                          │
│                                                             │
│  👍 Me gusta    😐 Neutral    👎 Prefiero evitar            │
│  ───────────────────────────────────────────────────────   │
│  Cocinar         ●            ○            ○               │
│  Lavar platos    ○            ○            ●               │
│  Barrer          ○            ●            ○               │
│  ...                                                        │
│                                                             │
│  [Siguiente miembro →]                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 6: Resumen + Primera Distribución                     │
│                                                             │
│  🏠 Casa de los García                                      │
│  👥 3 miembros  |  📋 12 tareas  |  ⚖️ Distribución justa   │
│                                                             │
│  Esta semana:                                               │
│  Franco: 4 tareas (28 puntos)                               │
│  María: 4 tareas (30 puntos)                                │
│  Tomás: 2 tareas (8 puntos) - ajustado por edad             │
│                                                             │
│  [🎉 Comenzar]                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Input de Lenguaje Natural

```
┌─────────────────────────────────────────────────────────────┐
│  [+ Agregar tarea personalizada con IA]                     │
│                                                             │
│  "Describí la tarea que querés agregar..."                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Limpiar el filtro del aire acondicionado cada mes   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ✨ IA detectó:                                             │
│  • Tarea: Limpiar filtro de A/C                            │
│  • Frecuencia sugerida: Mensual                            │
│  • Dificultad estimada: 2/5                                │
│  • Tiempo estimado: 20 min                                 │
│                                                             │
│  [Agregar tarea]  [Modificar]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Sistema de Puntos y Gamificación

### 2.1 Cálculo de Puntos Base

| Factor | Multiplicador | Descripción |
|--------|---------------|-------------|
| Dificultad | 1x-5x | Basado en esfuerzo físico/mental |
| Tiempo | +1 por cada 15min | Duración estimada |
| Frecuencia | 1.5x diaria, 1x semanal, 0.8x mensual | Tareas frecuentes valen más |
| Desagrado | +2 puntos | Bonus por hacer tareas que no te gustan |

**Fórmula:**
```
puntos = (dificultad × tiempo_factor) × frecuencia_mult + bonus_desagrado
```

### 2.2 Sistema de Niveles y Logros

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 TU PROGRESO                                             │
│                                                             │
│  Nivel 7: "Maestro del Hogar"                               │
│  ████████████░░░░░░░░ 340/500 XP                           │
│                                                             │
│  📊 ESTADÍSTICAS                                            │
│  • Racha actual: 🔥 12 días                                 │
│  • Mejor racha: 🏅 23 días                                  │
│  • Tareas completadas: 156                                  │
│  • Puntos totales: 2,340                                    │
│                                                             │
│  🎖️ LOGROS RECIENTES                                        │
│  [🌟] Madrugador - Completaste 5 tareas antes de las 9am   │
│  [⚡] Rayo - Terminaste una tarea en menos tiempo          │
│  [🤝] Solidario - Ayudaste a otro miembro 3 veces          │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Catálogo de Logros

| Logro | Icono | Requisito |
|-------|-------|-----------|
| Primera Tarea | 🎯 | Completar primera tarea |
| Racha de 7 | 🔥 | 7 días consecutivos completando tareas |
| Racha de 30 | 💎 | 30 días consecutivos |
| Madrugador | 🌅 | 5 tareas antes de las 9am |
| Noctámbulo | 🌙 | 5 tareas después de las 9pm |
| Velocista | ⚡ | Completar tarea en 50% del tiempo estimado |
| Solidario | 🤝 | Aceptar 3 transferencias de otros |
| Sacrificio | 💪 | Completar 10 tareas "no preferidas" |
| Perfeccionista | ✨ | 0 tareas vencidas en un mes |
| Equilibrista | ⚖️ | Mantener fairness >90% por 2 semanas |
| Explorador | 🗺️ | Completar todos los tipos de tareas |
| Mentor | 👨‍🏫 | Ayudar a un niño a completar 5 tareas |

### 2.4 Recompensas del Hogar

```
┌─────────────────────────────────────────────────────────────┐
│  🎁 RECOMPENSAS DEL HOGAR                                   │
│                                                             │
│  El hogar puede configurar recompensas canjeables:          │
│                                                             │
│  [🍕] Elegir cena del viernes     - 50 puntos              │
│  [🎮] 1 hora extra de videojuegos - 30 puntos              │
│  [📺] Elegir película familiar    - 40 puntos              │
│  [💤] Dormir 1 hora más el finde  - 60 puntos              │
│  [🛒] Snack especial del super    - 25 puntos              │
│                                                             │
│  [+ Crear recompensa personalizada]                         │
│                                                             │
│  Tus puntos canjeables: 145 🪙                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Sistema de Distribución Equitativa

### 3.1 Factores de Capacidad por Miembro

```typescript
interface MemberCapacity {
  baseCapacity: number;      // 100 para adultos
  ageMultiplier: number;     // 0.3 niños, 0.6 adolescentes, 1.0 adultos
  availabilityHours: number; // Horas semanales disponibles
  physicalLimitations: string[]; // Restricciones físicas
  skillLevel: Record<TaskCategory, 1|2|3>; // Habilidad por categoría
}
```

### 3.2 Algoritmo de Distribución

```
Para cada período de asignación:

1. Calcular carga objetivo por miembro:
   carga_objetivo[m] = total_puntos × (capacidad[m] / suma_capacidades)

2. Para cada tarea sin asignar (ordenadas por urgencia):
   - Calcular score para cada miembro elegible:
     score = preferencia_bonus
           + (carga_objetivo - carga_actual) × 10
           + recencia_bonus
           + skill_bonus
           - fatiga_penalty

   - Asignar al miembro con mayor score

3. Verificar balance:
   - Si desviación > 15%, rebalancear
```

### 3.3 Ajustes Automáticos

| Situación | Ajuste |
|-----------|--------|
| Miembro enfermo | Redistribuir temporalmente, marcar como "ayuda" |
| Viaje/ausencia | Excluir de asignaciones en ese período |
| Semana de exámenes (niños) | Reducir carga 50% |
| Sobrecarga detectada | Sugerir transferencia a otros |

---

## 4. Transferencias de Tareas

### 4.1 Flujo de Transferencia

```
┌─────────────────────────────────────────────────────────────┐
│  📤 TRANSFERIR TAREA                                        │
│                                                             │
│  Tarea: Lavar platos (hoy)                                  │
│  Puntos: 8                                                  │
│                                                             │
│  ¿A quién querés transferir?                                │
│                                                             │
│  👤 María                                                   │
│     Carga actual: 24 pts (normal)                           │
│     Probabilidad de aceptar: Alta ✓                         │
│                                                             │
│  👤 Tomás                                                   │
│     Carga actual: 12 pts (baja)                             │
│     Probabilidad de aceptar: Media                          │
│     ⚠️ Esta tarea no es apta para su edad                   │
│                                                             │
│  Mensaje (opcional):                                        │
│  [Tengo una reunión de trabajo, ¿podés cubrirme?]          │
│                                                             │
│  ○ Ofrecer mis puntos (+8 pts para quien acepte)           │
│  ● Intercambiar por otra tarea                              │
│                                                             │
│  [Enviar solicitud]                                         │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Notificación de Solicitud

```
┌─────────────────────────────────────────────────────────────┐
│  📬 SOLICITUD DE TRANSFERENCIA                              │
│                                                             │
│  Franco te pide ayuda con:                                  │
│  🍽️ Lavar platos - Hoy antes de las 21:00                  │
│                                                             │
│  "Tengo una reunión de trabajo, ¿podés cubrirme?"          │
│                                                             │
│  A cambio ofrece:                                           │
│  • Intercambiar por una de tus tareas                       │
│                                                             │
│  [✓ Aceptar]  [✗ Rechazar]  [💬 Negociar]                  │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Reglas de Transferencia

- Máximo 3 transferencias por semana por miembro
- No se puede transferir tareas ya vencidas
- Las transferencias aceptadas afectan el fairness score
- Historial de transferencias visible en dashboard

---

## 5. Scheduling Inteligente con Recordatorios

### 5.1 Configuración de Horarios

```
┌─────────────────────────────────────────────────────────────┐
│  ⏰ CONFIGURACIÓN DE TAREA                                  │
│                                                             │
│  🧹 Barrer pisos                                            │
│                                                             │
│  Frecuencia: [Semanal ▼]                                    │
│  Día específico: [Lunes ▼]                                  │
│  Hora límite: [18:00 ▼]                                     │
│                                                             │
│  📅 VENTANA DE EJECUCIÓN                                    │
│  Puede completarse desde: [Domingo 12:00]                   │
│  Hasta: [Lunes 18:00]                                       │
│                                                             │
│  🔔 RECORDATORIOS                                           │
│  ☑️ 1 día antes (Domingo 18:00)                            │
│  ☑️ 3 horas antes (Lunes 15:00)                            │
│  ☑️ Al vencer (Lunes 18:00)                                │
│  ☐ Personalizado: [____]                                    │
│                                                             │
│  ⚙️ SI NO SE COMPLETA A TIEMPO                             │
│  ○ Marcar como vencida inmediatamente                       │
│  ● Extender 24h con penalización (-2 pts)                   │
│  ○ Extender hasta fin de semana                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Vista de Calendario

```
┌─────────────────────────────────────────────────────────────┐
│  📅 FEBRERO 2025                                            │
│                                                             │
│  Lu   Ma   Mi   Ju   Vi   Sa   Do                          │
│  ─────────────────────────────────────                      │
│  3    4    5    6    7    8    9                            │
│  🔴2  ·    🟡1  ·    🟢3  ·    ·                            │
│                                                             │
│  10   11   12   13   14   15   16                          │
│  🟢2  ·    🟡1  ·    🟢2  ❤️   ·                            │
│                                                             │
│  🔴 Vencidas  🟡 Hoy  🟢 Próximas  ❤️ Evento especial       │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Banner de Estado

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ ATENCIÓN                                                │
│                                                             │
│  Tenés 2 tareas vencidas:                                   │
│  • Sacar basura (vencida hace 1 día) → -2 pts              │
│  • Lavar platos (vencida hace 3h)                          │
│                                                             │
│  [Completar ahora]  [Solicitar extensión]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Penalizaciones y Extensiones

### 6.1 Sistema de Penalizaciones

| Situación | Penalización |
|-----------|--------------|
| Tarea vencida < 24h | -1 punto, marca "tardía" |
| Tarea vencida 24-48h | -2 puntos |
| Tarea vencida > 48h | -3 puntos + notificación al hogar |
| 3+ tareas vencidas en semana | -5 puntos + badge "En deuda" |
| No completar tarea transferida aceptada | -4 puntos |

### 6.2 Extensiones Automáticas

```typescript
interface ExtensionPolicy {
  autoExtend: boolean;
  maxExtensions: number;        // Máximo de extensiones automáticas
  extensionHours: number;       // Horas por extensión
  penaltyPerExtension: number;  // Puntos perdidos
  notifyHousehold: boolean;     // Avisar a otros miembros
}
```

### 6.3 Solicitud de Extensión Manual

```
┌─────────────────────────────────────────────────────────────┐
│  🕐 SOLICITAR EXTENSIÓN                                     │
│                                                             │
│  Tarea: Limpiar baños                                       │
│  Vence: Hoy 18:00                                           │
│                                                             │
│  Nueva fecha límite:                                        │
│  ○ +6 horas (hoy 00:00) - Sin penalización                 │
│  ● +24 horas (mañana 18:00) - 1 punto                       │
│  ○ +48 horas (pasado 18:00) - 2 puntos                      │
│                                                             │
│  Motivo (opcional):                                         │
│  [Tuve que quedarme tarde en el trabajo___________]        │
│                                                             │
│  [Confirmar extensión]                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. UI Generativa con IA

### 7.1 Asistente de Hogar

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 ASISTENTE DEL HOGAR                                     │
│                                                             │
│  💬 "Hola Franco! Noté algunas cosas:"                      │
│                                                             │
│  📊 INSIGHTS DE LA SEMANA                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • María completó 30% más tareas que el promedio     │   │
│  │   → Sugerencia: Redistribuir 2 tareas a otros       │   │
│  │                                                      │   │
│  │ • Las tareas de cocina siempre se completan tarde   │   │
│  │   → Sugerencia: Adelantar horario límite 2 horas    │   │
│  │                                                      │   │
│  │ • Tomás ha mejorado su racha 🔥                      │   │
│  │   → Sugerencia: Considerar agregar 1 tarea más      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Aplicar sugerencias]  [Ver más detalles]  [Ignorar]      │
│                                                             │
│  💭 Preguntame lo que quieras sobre el hogar...            │
│  [____________________________________________] [Enviar]    │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Recomendaciones Contextuales

```
┌─────────────────────────────────────────────────────────────┐
│  💡 RECOMENDACIÓN INTELIGENTE                               │
│                                                             │
│  Detecté que mañana es feriado 🎉                          │
│                                                             │
│  Sugerencias:                                               │
│  • Adelantar "Sacar basura" a hoy (no hay recolección)     │
│  • Aprovechar para "Limpiar ventanas" (más tiempo)         │
│  • Posponer tareas no urgentes al martes                   │
│                                                             │
│  [Ajustar automáticamente]  [Revisar cambios]              │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Tips Generados

```
┌─────────────────────────────────────────────────────────────┐
│  💡 TIP DEL DÍA                                             │
│                                                             │
│  "Barrer antes de trapear reduce el tiempo total en 40%.   │
│   Considerá agrupar estas tareas en el mismo día."         │
│                                                             │
│  [👍 Útil]  [👎 No relevante]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Dashboard de Fairness Mejorado

### 8.1 Vista Principal

```
┌─────────────────────────────────────────────────────────────┐
│  ⚖️ EQUIDAD DEL HOGAR                                       │
│                                                             │
│  Score General: 87% ✓                   [Semana ▼]         │
│  ████████████████░░░                                        │
│                                                             │
│  📊 CONTRIBUCIÓN POR MIEMBRO                                │
│                                                             │
│  Franco  ████████████░░░░░░░░  42 pts (35%)                │
│          Objetivo: 45 pts     Desviación: -7%               │
│                                                             │
│  María   ██████████████░░░░░░  52 pts (43%)                │
│          Objetivo: 45 pts     Desviación: +16% ⚠️           │
│                                                             │
│  Tomás   ████████░░░░░░░░░░░░  26 pts (22%)                │
│          Objetivo: 30 pts     Desviación: -13%              │
│          (ajustado por edad)                                │
│                                                             │
│  📈 TENDENCIA (últimas 4 semanas)                          │
│  ┌────────────────────────────────────────┐                │
│  │    ╭─╮                                 │                │
│  │ ╭──╯ ╰──╮     ╭──                     │                │
│  │─╯        ╰────╯                        │                │
│  │  S1   S2   S3   S4                     │                │
│  └────────────────────────────────────────┘                │
│                                                             │
│  [Ver detalles]  [Ajustar distribución]                    │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Desglose por Categoría

```
┌─────────────────────────────────────────────────────────────┐
│  📋 CONTRIBUCIÓN POR CATEGORÍA                              │
│                                                             │
│  🧹 Limpieza        Franco: 40%  María: 45%  Tomás: 15%    │
│  🍳 Cocina          Franco: 60%  María: 35%  Tomás: 5%     │
│  👕 Lavandería      Franco: 20%  María: 70%  Tomás: 10%    │
│  🌿 Exterior        Franco: 50%  María: 30%  Tomás: 20%    │
│                                                             │
│  ⚠️ Desequilibrios detectados:                              │
│  • María hace el 70% de la lavandería                      │
│  • Tomás podría ayudar más en limpieza                     │
│                                                             │
│  [Sugerir redistribución]                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Features Adicionales Innovadoras

### 9.1 Modo Competencia Familiar

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 COMPETENCIA SEMANAL                                     │
│                                                             │
│  "Semana de la Limpieza Profunda"                          │
│  Termina en: 3 días 14 horas                               │
│                                                             │
│  🥇 María - 156 pts                                         │
│  🥈 Franco - 142 pts                                        │
│  🥉 Tomás - 89 pts                                          │
│                                                             │
│  Premio: El ganador elige el paseo del domingo 🎯          │
│                                                             │
│  [Ver tareas bonus]  [Reglas]                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Tareas Colaborativas

```
┌─────────────────────────────────────────────────────────────┐
│  👥 TAREA EN EQUIPO                                         │
│                                                             │
│  🧹 Limpieza general del sábado                            │
│  Participantes: Franco + María + Tomás                     │
│  Puntos: 25 (divididos equitativamente)                    │
│                                                             │
│  Subtareas:                                                 │
│  ☑️ Franco - Aspirar living y comedor                      │
│  ☐ María - Limpiar cocina                                  │
│  ☐ Tomás - Ordenar su habitación                           │
│                                                             │
│  Progreso del equipo: ████░░░░░░ 33%                       │
│                                                             │
│  💬 Chat del equipo: "¡Ya casi termino!" - Franco          │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 Rotación Inteligente

```
┌─────────────────────────────────────────────────────────────┐
│  🔄 ROTACIÓN AUTOMÁTICA                                     │
│                                                             │
│  Algunas tareas rotan automáticamente para que todos       │
│  aprendan y compartan responsabilidades:                   │
│                                                             │
│  🍳 Cocinar cena                                            │
│  Semana actual: María                                       │
│  Próxima: Franco → Tomás → María...                        │
│                                                             │
│  🗑️ Sacar basura                                            │
│  Semana actual: Tomás                                       │
│  Próxima: Franco → María → Tomás...                        │
│                                                             │
│  [Configurar rotaciones]                                    │
└─────────────────────────────────────────────────────────────┘
```

### 9.4 Integración con Calendarios

```
┌─────────────────────────────────────────────────────────────┐
│  📅 SINCRONIZACIÓN DE CALENDARIOS                           │
│                                                             │
│  Conectar calendarios para asignación inteligente:         │
│                                                             │
│  ☑️ Franco - Google Calendar conectado                     │
│     → Detectado: Reunión mañana 14-16h                     │
│     → Ajuste: Mover "Preparar cena" a María                │
│                                                             │
│  ☑️ María - iCloud Calendar conectado                      │
│  ☐ Tomás - Sin calendario                                  │
│                                                             │
│  [Conectar calendario]  [Configurar]                        │
└─────────────────────────────────────────────────────────────┘
```

### 9.5 Historial y Estadísticas

```
┌─────────────────────────────────────────────────────────────┐
│  📈 ESTADÍSTICAS DEL HOGAR                                  │
│                                                             │
│  Período: [Último mes ▼]                                    │
│                                                             │
│  📊 MÉTRICAS GENERALES                                      │
│  • Tareas completadas: 127 / 134 (95%)                     │
│  • Promedio de cumplimiento: 94%                           │
│  • Tareas más veces tardías: Lavar platos (4)              │
│  • Mejor racha del hogar: 18 días                          │
│                                                             │
│  👤 TOP PERFORMERS                                          │
│  • Más consistente: María (98% a tiempo)                   │
│  • Más puntos: Franco (520 pts)                            │
│  • Mayor mejora: Tomás (+23% vs mes anterior)              │
│                                                             │
│  [Exportar reporte]  [Compartir con familia]               │
└─────────────────────────────────────────────────────────────┘
```

### 9.6 Sistema de Ausencias

```
┌─────────────────────────────────────────────────────────────┐
│  🏖️ GESTIONAR AUSENCIA                                      │
│                                                             │
│  👤 Franco estará ausente:                                  │
│  Desde: [15/02/2025]  Hasta: [18/02/2025]                  │
│                                                             │
│  Motivo: ○ Viaje  ○ Enfermedad  ○ Trabajo  ● Otro          │
│                                                             │
│  Mis tareas durante ausencia:                               │
│  ○ Redistribuir automáticamente entre disponibles          │
│  ● Asignar a miembro específico: [María ▼]                 │
│  ○ Posponer hasta mi regreso                               │
│                                                             │
│  ☐ Compensar cuando vuelva (+20% carga temporal)           │
│                                                             │
│  [Confirmar ausencia]                                       │
└─────────────────────────────────────────────────────────────┘
```

### 9.7 Modo Niños

```
┌─────────────────────────────────────────────────────────────┐
│  👶 VISTA PARA TOMÁS                                        │
│                                                             │
│  ¡Hola Tomás! 🌟                                           │
│                                                             │
│  TUS MISIONES DE HOY:                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🛏️ MISIÓN 1: Tender tu cama                        │   │
│  │  ⭐⭐ (2 estrellas)                                  │   │
│  │  [¡Completar!]                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🧹 MISIÓN 2: Ordenar tus juguetes                  │   │
│  │  ⭐⭐⭐ (3 estrellas)                                │   │
│  │  [¡Completar!]                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  TUS ESTRELLAS: ⭐⭐⭐⭐⭐⭐⭐ (32)                          │
│  Próxima recompensa: 🍦 Helado (38 estrellas)              │
│                                                             │
│  🎮 LOGROS: [🥇][🎯][🔥][⭐]                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Schema de Base de Datos Actualizado

```typescript
// Nuevas tablas necesarias

// Niveles y XP de usuarios
export const memberLevels = sqliteTable("member_levels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Logros desbloqueados
export const memberAchievements = sqliteTable("member_achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  achievementKey: text("achievement_key").notNull(),
  unlockedAt: integer("unlocked_at", { mode: "timestamp" }).notNull(),
});

// Recompensas del hogar
export const householdRewards = sqliteTable("household_rewards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  icon: text("icon"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Canjes de recompensas
export const rewardRedemptions = sqliteTable("reward_redemptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rewardId: integer("reward_id").notNull(),
  memberId: integer("member_id").notNull(),
  pointsSpent: integer("points_spent").notNull(),
  redeemedAt: integer("redeemed_at", { mode: "timestamp" }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'fulfilled' | 'cancelled'
});

// Transferencias de tareas
export const taskTransfers = sqliteTable("task_transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assignmentId: integer("assignment_id").notNull(),
  fromMemberId: integer("from_member_id").notNull(),
  toMemberId: integer("to_member_id").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'rejected'
  message: text("message"),
  offerType: text("offer_type").notNull(), // 'points' | 'exchange'
  exchangeAssignmentId: integer("exchange_assignment_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  respondedAt: integer("responded_at", { mode: "timestamp" }),
});

// Ausencias programadas
export const memberAbsences = sqliteTable("member_absences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  reason: text("reason"),
  redistributionPolicy: text("redistribution_policy").notNull(), // 'auto' | 'specific' | 'postpone'
  assignToMemberId: integer("assign_to_member_id"),
  compensateOnReturn: integer("compensate_on_return", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Competencias familiares
export const competitions = sqliteTable("competitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  prize: text("prize"),
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'cancelled'
  winnerId: integer("winner_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Puntos de competencia
export const competitionScores = sqliteTable("competition_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  competitionId: integer("competition_id").notNull(),
  memberId: integer("member_id").notNull(),
  points: integer("points").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Catálogo de tareas predefinidas
export const taskCatalog = sqliteTable("task_catalog", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'cleaning' | 'cooking' | 'laundry' | 'outdoor' | 'pets' | 'rooms'
  defaultFrequency: text("default_frequency").notNull(),
  defaultWeight: integer("default_weight").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  minAge: integer("min_age"), // Edad mínima recomendada
  icon: text("icon"),
});

// Recordatorios configurados
export const taskReminders = sqliteTable("task_reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  reminderType: text("reminder_type").notNull(), // 'before_1day' | 'before_3h' | 'on_due' | 'custom'
  customMinutesBefore: integer("custom_minutes_before"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// Historial de penalizaciones
export const penalties = sqliteTable("penalties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  assignmentId: integer("assignment_id").notNull(),
  reason: text("reason").notNull(), // 'overdue_24h' | 'overdue_48h' | 'transfer_failed' | etc
  pointsDeducted: integer("points_deducted").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Capacidad de miembros
export const memberCapacity = sqliteTable("member_capacity", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  memberType: text("member_type").notNull(), // 'adult' | 'teen' | 'child'
  birthDate: integer("birth_date", { mode: "timestamp" }),
  weeklyAvailabilityHours: integer("weekly_availability_hours"),
  physicalLimitations: text("physical_limitations"), // JSON array
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Rotaciones de tareas
export const taskRotations = sqliteTable("task_rotations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  rotationOrder: text("rotation_order").notNull(), // JSON array of member IDs
  currentIndex: integer("current_index").notNull().default(0),
  rotationFrequency: text("rotation_frequency").notNull(), // 'weekly' | 'monthly'
  lastRotatedAt: integer("last_rotated_at", { mode: "timestamp" }),
});

// Tips y recomendaciones de IA
export const aiRecommendations = sqliteTable("ai_recommendations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id").notNull(),
  type: text("type").notNull(), // 'redistribution' | 'schedule' | 'tip' | 'insight'
  title: text("title").notNull(),
  content: text("content").notNull(),
  actionData: text("action_data"), // JSON with action details
  status: text("status").notNull().default("pending"), // 'pending' | 'applied' | 'dismissed'
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  respondedAt: integer("responded_at", { mode: "timestamp" }),
});
```

---

## 11. Prioridad de Implementación

### Fase 1: Core Mejorado (Sprint 1-2)
1. ✅ Schema actualizado con todas las tablas
2. Onboarding con catálogo de tareas
3. Sistema de puntos base
4. Recordatorios y banners de vencimiento

### Fase 2: Gamificación (Sprint 3-4)
1. Sistema de niveles y XP
2. Logros y badges
3. Recompensas canjeables
4. Modo niños

### Fase 3: Colaboración (Sprint 5-6)
1. Transferencias de tareas
2. Sistema de ausencias
3. Rotaciones automáticas
4. Tareas colaborativas

### Fase 4: Inteligencia (Sprint 7-8)
1. Dashboard de fairness mejorado
2. Recomendaciones de IA
3. Tips generativos
4. Integración de calendarios

### Fase 5: Social (Sprint 9-10)
1. Competencias familiares
2. Estadísticas avanzadas
3. Compartir y exportar
4. Notificaciones push

---

## 12. Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Tasa de onboarding completado | >80% |
| Tareas completadas a tiempo | >85% |
| Fairness score promedio | >75% |
| Usuarios activos semanales | >70% del hogar |
| Transferencias exitosas | >60% de solicitudes |
| Logros desbloqueados por usuario/mes | >3 |
| NPS | >50 |
