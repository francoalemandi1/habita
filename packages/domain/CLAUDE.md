# Domain Logic Package

Lógica de negocio pura, platform-agnostic. Especializada en mercado argentino.

## inferExpenseSubcategory (`expense-subcategory.ts`)

Infiere subcategoría de un gasto a partir del título. 240+ keywords argentinos.

### Categorías
SUPERMERCADO, DELIVERY, FARMACIA, TRANSPORTE, ENTRETENIMIENTO, SERVICIOS, MASCOTAS, EDUCACION, OTHER

### Reglas de matching
- Input normalizado: lowercase, sin acentos, sin puntuación
- Keywords matchean por substring (no exact match)
- **El orden importa**: DELIVERY se evalúa antes que SUPERMERCADO (para que "Rappi - Coto" matchee DELIVERY, no SUPER)
- Merchants argentinos específicos: Coto, Jumbo, Disco, Rappi, PedidosYa, Farmacity, etc.

### Fallback
Si no matchea ningún keyword → retorna `null` (no "OTHER"). El caller decide qué hacer.

### Para agregar keywords
- Verificar que no colisione con otra categoría (ej: "farmacia" no debe estar en SUPER)
- Respetar el orden de evaluación
- Normalizar: sin acentos, lowercase
- Testear con variantes comunes (con/sin tilde, abreviaciones)

## parseProductUnit (`unit-parser.ts`)

Parsea unidades de productos argentinos desde strings como "1.5kg", "500ml", "1,5 L".

### Conversión a base
- g → g (ya es base)
- kg → g (× 1000)
- ml → ml (ya es base)
- L → ml (× 1000)

### Formato argentino
- Coma como decimal: "1,5 kg" → 1500g
- Punto como miles: "1.500 g" → 1500g
- Regex handles both: `/(\d+[.,]?\d*)\s*(g|kg|ml|l|lt|lts|un|u)/i`

### Return type
`{ value: number, unit: string, baseValue: number, baseUnit: string } | null`

Retorna `null` si no puede parsear. NUNCA asume unidad default.
