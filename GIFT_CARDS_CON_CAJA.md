# Sistema de Gift Cards con Registro en Caja

## Resumen de Cambios

Se ha actualizado el sistema de Gift Cards para que **toda venta de gift card registre el ingreso en caja** automáticamente.

## Cómo Funciona Ahora

### Antes (❌ INCORRECTO)
1. Cliente paga $10,000 por una gift card
2. Se crea la gift card en el sistema
3. **El dinero NO aparecía en caja**

### Ahora (✅ CORRECTO)
1. Cliente paga $10,000 por una gift card
2. Se elige el método de pago (efectivo, transferencia, tarjeta)
3. Se crea la gift card
4. **Se registra automáticamente una venta por $10,000 en caja**
5. **Ese ingreso aparece en el reporte diario de caja**

## Cambios Técnicos Realizados

### 1. Base de Datos
- **Nueva migración**: `update_create_gift_card_with_sale.sql`
- La función `create_gift_card()` ahora:
  - Acepta el parámetro `p_payment_method` (efectivo, transferencia, tarjeta_debito, tarjeta_credito)
  - Crea una transacción (sale) en la tabla `transactions`
  - Vincula la gift card con esa venta
  - El dinero queda registrado en caja

### 2. Frontend
- **Archivo modificado**: `src/pages/GiftCardsPage.tsx`
- Se agregó un selector de "Método de Pago" en el formulario de creación
- Opciones disponibles:
  - Efectivo
  - Transferencia
  - Tarjeta de Débito
  - Tarjeta de Crédito
- El método de pago se envía a la base de datos y queda registrado

### 3. Flujo Completo

```
Usuario crea Gift Card
  ↓
Ingresa monto: $10,000
  ↓
Selecciona método: "Efectivo"
  ↓
Se ejecuta create_gift_card()
  ↓
├─ Crea venta en tabla "transactions"
│  └─ type: 'sale'
│  └─ total_amount: $10,000
│  └─ payment_method: 'efectivo'
│  └─ notes: 'Venta de Gift Card GC-XXXXXX'
│
└─ Crea gift card en tabla "gift_cards"
   └─ code: 'GC-XXXXXX'
   └─ initial_amount: $10,000
   └─ current_balance: $10,000

Resultado:
✅ Gift card creada
✅ Dinero registrado en caja
✅ Aparece en reporte diario de ventas
```

## Beneficios

1. **Control de caja preciso**: Ahora sabes exactamente cuánto dinero entra por ventas de gift cards
2. **Reporte completo**: Las gift cards aparecen en el reporte de ventas del día
3. **Trazabilidad**: Cada gift card está vinculada a una venta específica
4. **Métodos de pago**: Puedes ver si las gift cards se pagaron en efectivo, transferencia, etc.

## Uso en la Aplicación

1. Ve a **Gift Cards** en el menú
2. Haz clic en **"Nueva Gift Card"**
3. Completa el formulario:
   - **Monto**: Ej. 10000
   - **Método de Pago**: Selecciona cómo te pagaron (efectivo, transferencia, etc.)
   - **DE**: Nombre de quien regala (opcional)
   - **PARA**: Nombre de quien recibe (opcional)
   - **Cliente asociado**: (opcional)
   - **Notas**: (opcional)
4. Haz clic en **"Crear Gift Card"**

El sistema automáticamente:
- Crea la gift card con un código único (ej. GC-AB12CD)
- Registra el ingreso en caja
- Muestra el mensaje: "Gift card GC-AB12CD creada exitosamente. Ingreso registrado en caja."

## Reportes

El dinero de las gift cards ahora aparece en:
- ✅ **Reporte de Caja del Día**
- ✅ **Ventas por Período**
- ✅ **Resumen de Caja**

La venta se identifica con la nota: "Venta de Gift Card GC-XXXXXX"

## Validaciones

El sistema valida:
- ✅ Monto debe ser mayor a 0
- ✅ Método de pago debe ser válido (efectivo, transferencia, tarjeta_debito, tarjeta_credito)
- ✅ Usuario debe estar autenticado
- ✅ Se genera un código único para cada gift card

## Notas Importantes

- **No se puede crear una gift card sin método de pago**: Es obligatorio seleccionar cómo te pagaron
- **Default**: Si no se especifica, el método de pago por defecto es "efectivo"
- **Vinculación**: Cada gift card queda vinculada a su venta mediante `transaction_id`
- **Historial**: En el historial de la gift card, la primera transacción muestra el método de pago usado

## Fecha de Implementación

- **Fecha**: 25 de Febrero de 2026
- **Migración**: `update_create_gift_card_with_sale.sql`
