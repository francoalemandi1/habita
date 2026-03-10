---
paths:
  - "src/app/api/**/*.ts"
  - "src/lib/**/*.ts"
---

# Reglas de data isolation

- TODA query a la DB DEBE filtrar por `householdId` del member autenticado
- NUNCA confiar en un householdId enviado por el cliente
- Usar `requireMember()` para obtener el householdId del contexto de sesión
- Al buscar un recurso por ID, SIEMPRE verificar que pertenece al `householdId` del member
- Notificaciones: fire-and-forget. Errores se loguean pero NUNCA propagan ni cambian el flujo
