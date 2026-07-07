# Prompt para Replicar Sistema POS Completo

## Instrucciones para la IA

Copia este prompt y úsalo con cualquier IA de desarrollo (Claude, ChatGPT, etc.) para recrear esta aplicación completa.

---

## PROMPT COMPLETO

Necesito que crees un **Sistema POS (Punto de Venta) profesional y completo** con las siguientes especificaciones técnicas y funcionales:

### STACK TECNOLÓGICO OBLIGATORIO

**Frontend:**
- React 18 con TypeScript
- Vite como build tool
- Tailwind CSS para estilos
- Lucide React para iconos
- React-PDF para generación de PDFs
- JsBarcode para códigos de barras

**Backend:**
- Supabase (PostgreSQL + Auth + RLS)
- Todas las operaciones deben usar funciones de PostgreSQL
- Row Level Security en todas las tablas
- Triggers automáticos para mantener consistencia

### MÓDULOS Y FUNCIONALIDADES REQUERIDAS

#### 1. SISTEMA DE AUTENTICACIÓN
- Login con username/password (NO email)
- Tres roles: admin, vendedor, cajero
- Sin usuarios por defecto: cada rol se crea manualmente con su propia contraseña
  - admin (todos los permisos)
  - vendedor (ventas, clientes, reportes)
  - cajero (solo caja)
- Context API para estado global de autenticación
- Protección de rutas por rol

#### 2. DASHBOARD
Mostrar en tarjetas:
- Ventas del día (total en $)
- Ventas del mes (total en $)
- Productos con stock bajo (contador)
- Cuentas corrientes pendientes (total deuda)
- Top 5 productos más vendidos
- Gráfico simple de ventas de los últimos 7 días

#### 3. GESTIÓN DE PRODUCTOS
**Tabla: products**
- id (uuid)
- name (text, convertir a MAYÚSCULAS automáticamente)
- description (text, opcional)
- category_id (uuid, FK a categories)
- cost_price (decimal)
- sale_price (decimal)
- stock (integer)
- min_stock (integer, para alertas)
- barcode (text, único, generado automáticamente)
- created_at, updated_at

**Funcionalidades:**
- CRUD completo de productos
- Búsqueda en tiempo real por nombre o código de barras
- Filtro por categoría
- Alertas visuales cuando stock < min_stock
- Generación automática de código de barras único (formato: POS-XXXXXX)
- Validación: precio de venta debe ser mayor a precio de costo

**Tabla: categories**
- id, name, description, created_at

#### 4. SISTEMA DE CAJA (MÓDULO PRINCIPAL)
**Funcionalidad de Venta:**
- Búsqueda rápida de productos (por nombre o escaneo de código de barras)
- Agregar productos a carrito con cantidad
- Cálculo automático de subtotal, total
- Mostrar stock disponible del producto
- Eliminar items del carrito
- Limpiar carrito completo

**Métodos de Pago:**
1. Efectivo (calcular vuelto automáticamente)
2. Tarjeta de débito
3. Tarjeta de crédito
4. Cuenta corriente (requiere seleccionar cliente)
5. Gift Card (buscar por código, validar saldo)
6. Pago mixto (combinar métodos)

**Apertura/Cierre de Caja:**
- Registrar monto inicial al abrir
- Solo permitir ventas si hay caja abierta
- Al cerrar: mostrar resumen por método de pago
- Calcular diferencia entre esperado y real
- Tabla: cashbox_closures (id, user_id, opened_at, closed_at, initial_amount, final_amount, total_cash, total_card, etc.)

**Tabla: sales**
- id, sale_number (secuencial), client_id (nullable), user_id
- payment_method (enum), total_amount, paid_amount, change_amount
- status (completed, pending, cancelled)
- sale_date, created_at

**Tabla: sale_items**
- id, sale_id, product_id, quantity, unit_price, subtotal
- Trigger: actualizar stock del producto automáticamente al insertar

#### 5. CLIENTES Y CUENTAS CORRIENTES
**Tabla: clients**
- id, name, phone, email (opcional), address (opcional)
- credit_limit (decimal), current_balance (decimal)
- status (active, inactive, blocked)
- created_at, updated_at

**Tabla: account_movements**
- id, client_id, sale_id (nullable), movement_type (charge, payment)
- amount, balance_before, balance_after
- payment_method (si es payment), notes
- created_at, created_by

**Funcionalidades:**
- Vista de clientes con saldo actual
- Indicador visual de deuda (rojo si debe, verde si está al día)
- Desglose de antigüedad de deuda:
  - 0-30 días
  - 31-60 días
  - 61-90 días
  - Más de 90 días
- Registrar pagos parciales o totales
- Historial completo de movimientos por cliente
- Bloquear ventas si excede límite de crédito
- Función PostgreSQL: `get_current_accounts_with_aging()`

#### 6. GIFT CARDS (TARJETAS DE REGALO)
**Tabla: gift_cards**
- id, code (único, formato: GC-XXXXXX)
- initial_amount, current_balance
- status (active, redeemed, expired)
- message_to, message_from (campos de personalización)
- activated_at, expires_at, created_at

**Tabla: gift_card_transactions**
- id, gift_card_id, transaction_type (sale, redemption)
- amount, sale_id (si aplica)
- created_at

**Funcionalidades:**
- Crear gift card con monto personalizado
- Campos "PARA:" y "DE:" para personalización
- Al crear, genera una venta automática (categoria especial "GIFT CARD")
- Imprimir en formato A4 con 3 tarjetas por hoja
- Cada tarjeta muestra: código de barras, monto, mensajes personalizados
- Buscar gift card por código en la venta
- Validar saldo disponible
- Reporte de gift cards vendidas y canjeadas

**Función PostgreSQL:** `create_gift_card_with_sale()`

#### 7. REPORTES AVANZADOS
Cada reporte debe tener:
- Filtros por rango de fechas
- Exportación a PDF
- Responsive (móvil y desktop)

**Reportes requeridos:**

**a) Ventas por Período**
- Filtros: fecha inicio/fin, categoría, usuario
- Mostrar: total ventas, cantidad de transacciones, promedio por venta
- Desglose por método de pago
- Función: `get_sales_by_period(start_date, end_date, category_id, user_id)`

**b) Ventas por Hora**
- Agrupar ventas por hora del día (0-23)
- Identificar horarios pico
- Función: `get_sales_by_hour(date)`

**c) Resumen de Caja**
- Filtros: fecha o rango
- Totales por método de pago
- Ventas en cuenta corriente
- Pagos recibidos de cuentas
- Función: `get_cashbox_summary(start_date, end_date)`

**d) Estado de Cuentas Corrientes**
- Lista de clientes con deuda
- Monto adeudado por cliente
- Antigüedad de deuda (0-30, 31-60, 61-90, +90 días)
- Ordenar por deuda o antigüedad

**e) Pagos de Cuenta Corriente**
- Filtros: fecha, cliente
- Historial de todos los pagos recibidos
- Total cobrado en el período

**f) Reporte de Gift Cards**
- Gift cards vendidas en el período
- Gift cards canjeadas
- Saldo pendiente total
- Desglose por estado

**g) Stock de Productos**
- Inventario completo con valores
- Alertas de bajo stock
- Valor total de inventario (cost_price * stock)

**h) Gestión de Ventas**
- Listado completo de todas las ventas
- Filtros: fecha, cliente, usuario, método de pago
- Ver detalle de items
- Editar venta (con recalculo de stock)
- Eliminar venta (reversar stock)
- Función: `delete_sale(sale_id)` - debe reversar stock y movimientos de cuenta

#### 8. IMPRESIÓN
**Ticket Térmico (58mm o 80mm):**
- Encabezado con nombre del negocio
- Fecha y hora
- Número de venta
- Listado de productos: nombre, cant, precio, subtotal
- Total
- Método de pago
- Vuelto (si aplica)
- Pie de página "Gracias por su compra"

**Implementación:**
- Usar window.print() con CSS específico para impresión
- Media query @media print
- Opción para imprimir automáticamente o manual

**Gift Cards:**
- Diseño A4 con 3 tarjetas
- Cada tarjeta: código de barras, monto, "PARA:", "DE:", mensaje personalizado
- Línea punteada para recortar

**Reportes PDF:**
- Usar @react-pdf/renderer
- Encabezado con logo y nombre
- Tablas con datos del reporte
- Totales destacados
- Fecha de generación

#### 9. GESTIÓN DE USUARIOS
**Solo para admin:**
- Listar usuarios con roles
- Crear nuevo usuario (username, password, role)
- Editar usuario (cambiar contraseña, rol, estado)
- Desactivar/activar usuario
- NO permitir eliminar usuarios con ventas registradas

**Tabla: user_profiles**
- id (coincide con auth.users.id)
- username (único)
- role (enum: admin, vendedor, cajero)
- is_active (boolean)
- created_at

**Funciones PostgreSQL:**
- `create_user_account(username, password, role)`
- `update_user_password(user_id, new_password)`

#### 10. CONFIGURACIÓN DEL SISTEMA
Página de ajustes para admin:
- Nombre del negocio
- Dirección, teléfono
- Configuración de impresora (tamaño papel)
- Logo del negocio
- Moneda (símbolo y formato)
- Zona horaria
- Guardar en tabla: settings (key-value)

### DISEÑO Y UX

**Layout General:**
- Sidebar izquierdo con navegación (iconos + texto)
- Header con nombre de usuario y botón logout
- Área de contenido principal
- Responsive: en móvil, sidebar colapsable

**Menú de Navegación:**
- Dashboard
- Caja
- Productos
- Clientes
- Cuentas Corrientes
- Gift Cards
- Reportes (submenu con todos los reportes)
- Usuarios (solo admin)
- Configuración (solo admin)

**Paleta de Colores:**
- Primario: azul (#3B82F6) - NO usar violeta/morado
- Secundario: gris oscuro (#1F2937)
- Éxito: verde (#10B981)
- Advertencia: amarillo (#F59E0B)
- Error: rojo (#EF4444)
- Fondo: gris claro (#F3F4F6)

**Componentes Reutilizables:**
- Button (variants: primary, secondary, danger, success)
- Input con validación visual
- Select/Dropdown
- Modal
- Card
- StatCard (para métricas)
- Toast/Notification
- ConfirmDialog
- Table con ordenamiento y paginación

### BASE DE DATOS - ESTRUCTURA COMPLETA

**Migraciones en orden:**

1. Crear extensión uuid
2. Crear enum types (payment_method, user_role, etc.)
3. Crear tablas base:
   - categories
   - products (con trigger para mayúsculas en name)
   - clients
   - user_profiles
   - settings

4. Crear tablas de transacciones:
   - sales
   - sale_items (con trigger para actualizar stock)
   - account_movements
   - cashbox_closures
   - gift_cards
   - gift_card_transactions

5. Crear índices:
   - products: (name, barcode, category_id)
   - sales: (sale_date, user_id, client_id)
   - sale_items: (sale_id, product_id)
   - clients: (name, status)
   - account_movements: (client_id, created_at)

6. Configurar RLS en TODAS las tablas:
   - Políticas para authenticated users
   - Restricciones por rol donde aplique
   - Políticas de lectura, inserción, actualización, eliminación

7. Crear funciones:
   - `update_product_stock(product_id, quantity_sold)` - retorna boolean
   - `get_sales_by_period(...)`
   - `get_sales_by_hour(...)`
   - `get_cashbox_summary(...)`
   - `get_current_accounts_with_aging()`
   - `create_gift_card_with_sale(...)`
   - `delete_sale(sale_id)` - reversa stock, movimientos, etc.
   - `edit_sale_with_items(...)` - actualiza venta completa
   - `create_user_account(...)`
   - `update_user_password(...)`

8. Crear triggers:
   - `sync_sale_amounts` - actualizar total de venta al cambiar items
   - `update_stock_on_sale` - reducir stock automáticamente
   - `update_client_balance` - actualizar saldo al registrar movimiento
   - `uppercase_product_name` - convertir nombre a mayúsculas

9. Insertar datos iniciales:
   - Usuarios por defecto
   - Categorías ejemplo
   - Configuración básica

### VALIDACIONES CRÍTICAS

**En el Frontend:**
- No permitir stock negativo en ventas
- Validar que precio de venta > precio de costo
- No permitir cerrar caja si hay ventas pendientes
- Validar límite de crédito antes de venta en cuenta corriente
- Validar saldo de gift card antes de usar
- Confirmar acciones destructivas (eliminar venta, producto, etc.)

**En el Backend (PostgreSQL):**
- Constraints de NOT NULL en campos requeridos
- UNIQUE constraints (barcode, username, gift_card code)
- CHECK constraints (sale_price > 0, stock >= 0)
- Foreign keys con ON DELETE RESTRICT donde no se debe permitir borrado
- Triggers para mantener integridad referencial

### CARACTERÍSTICAS ADICIONALES IMPORTANTES

1. **Búsqueda Inteligente:**
   - Búsqueda fuzzy en productos (tolerante a errores)
   - Autocompletado en tiempo real
   - Resaltar coincidencias

2. **Feedback Visual:**
   - Loading spinners en operaciones asíncronas
   - Toast notifications para éxito/error
   - Animaciones suaves en transiciones
   - Indicadores de estado (activo/inactivo, disponible/agotado)

3. **Performance:**
   - Lazy loading de componentes pesados
   - Debounce en búsquedas
   - Paginación en tablas grandes
   - Índices en BD para queries frecuentes

4. **Accesibilidad:**
   - Navegación por teclado
   - Atajos: Ctrl+S para guardar, Esc para cerrar modales
   - Labels en todos los inputs
   - Contraste adecuado de colores

5. **Manejo de Errores:**
   - Try-catch en todas las operaciones async
   - Mensajes de error claros y específicos
   - Logging de errores en consola (desarrollo)
   - Fallbacks para cuando falla la carga de datos

### FLUJO DE TRABAJO TÍPICO

**Venta en Efectivo:**
1. Usuario abre caja al inicio del día (registra monto inicial)
2. Busca producto por nombre o código de barras
3. Agrega al carrito (verifica stock disponible)
4. Selecciona método de pago "Efectivo"
5. Ingresa monto recibido
6. Sistema calcula vuelto
7. Confirma venta
8. Stock se actualiza automáticamente
9. Opción de imprimir ticket

**Venta en Cuenta Corriente:**
1. Busca y agrega productos al carrito
2. Selecciona cliente de lista
3. Verifica límite de crédito disponible
4. Selecciona "Cuenta Corriente" como método de pago
5. Confirma venta
6. Sistema registra la deuda en account_movements
7. Actualiza balance del cliente
8. Genera comprobante

**Creación y Uso de Gift Card:**
1. Cliente compra gift card de $1000
2. Sistema crea registro en gift_cards con código único
3. Genera venta automática (categoria "GIFT CARD")
4. Imprime tarjeta con código de barras y datos personalizados
5. Luego, en una venta, cliente presenta gift card
6. Cajero escanea código
7. Sistema valida saldo disponible
8. Aplica monto como método de pago
9. Actualiza current_balance de la gift card
10. Registra transacción

### TESTING RECOMENDADO

**Casos de Prueba Críticos:**
- Venta con stock insuficiente (debe rechazar)
- Venta en cuenta corriente excediendo límite (debe rechazar)
- Eliminar venta (stock debe revertirse)
- Editar venta (recalcular stock correctamente)
- Cerrar caja con cálculos correctos
- Gift card sin saldo (debe rechazar)
- Pago mixto (sumar correctamente todos los métodos)

### ENTREGABLES ESPERADOS

1. **Código fuente completo** con estructura organizada
2. **Migraciones de Supabase** en archivos SQL separados
3. **README.md** con:
   - Instrucciones de instalación
   - Configuración de variables de entorno
   - Cómo ejecutar las migraciones
   - Usuarios de prueba
   - Guía de uso básico

4. **Archivo .env.example** con variables necesarias
5. **Documentación** de funciones de BD importantes
6. **Componentes reutilizables** bien documentados
7. **Sistema funcionando** sin errores en consola

### PRIORIDADES DE IMPLEMENTACIÓN

**Fase 1 (Core):**
- Autenticación
- Productos y categorías
- Sistema de ventas básico (efectivo y tarjeta)
- Dashboard simple

**Fase 2 (Avanzado):**
- Cuentas corrientes
- Apertura/cierre de caja
- Reportes básicos
- Gestión de usuarios

**Fase 3 (Premium):**
- Gift cards
- Reportes avanzados
- Impresión de tickets
- Edición y eliminación de ventas

### RESTRICCIONES Y CONSIDERACIONES

- **NO** usar librerías de UI como Material-UI, Chakra, etc.
- **SÍ** usar Tailwind CSS puro
- **NO** crear componentes innecesariamente complejos
- **SÍ** mantener componentes simples y reutilizables
- **NO** hardcodear valores, usar variables de entorno
- **SÍ** validar SIEMPRE en frontend y backend
- **NO** permitir operaciones sin autenticación
- **SÍ** implementar RLS correctamente en todas las tablas

### NOTAS FINALES

Este es un sistema POS profesional y completo. Debe ser:
- ✅ Fácil de usar para personal sin experiencia técnica
- ✅ Rápido y responsive
- ✅ Seguro (RLS, validaciones, autenticación)
- ✅ Escalable (código limpio, funciones reutilizables)
- ✅ Mantenible (comentarios en funciones complejas)
- ✅ Confiable (manejo de errores, validaciones)

**IMPORTANTE:** Implementa TODO lo descrito. No omitas funcionalidades. Este prompt debe resultar en un sistema POS completamente funcional y listo para producción.

---

## PROMPT ALTERNATIVO SIMPLIFICADO

Si necesitas una versión más corta, usa este:

```
Crea un Sistema POS completo con React + TypeScript + Supabase que incluya:

MÓDULOS:
1. Auth (admin/vendedor/cajero)
2. Dashboard con métricas
3. Productos con código de barras y stock
4. Sistema de caja con apertura/cierre
5. Ventas (efectivo, tarjeta, cuenta corriente, gift card)
6. Clientes con cuentas corrientes y antigüedad de deuda
7. Gift cards personalizadas con impresión
8. Reportes: ventas por período, por hora, cashbox, cuentas, pagos, gift cards, stock
9. Gestión de usuarios
10. Impresión de tickets térmicos y PDFs

CARACTERÍSTICAS TÉCNICAS:
- RLS en todas las tablas
- Funciones PostgreSQL para operaciones complejas
- Triggers automáticos (actualizar stock, sincronizar totales)
- Edición y eliminación de ventas con reversión de stock
- Validaciones en frontend y backend
- Búsqueda en tiempo real
- Responsive design
- Tailwind CSS (NO morado/violeta)

REGLAS CRÍTICAS:
- Stock no puede ser negativo
- Validar límite de crédito en cuentas corrientes
- Reversar stock al eliminar ventas
- Gift card genera venta automática
- Todos los reportes exportables a PDF
- Sin usuarios por defecto: crear cada cuenta manualmente con contraseña propia

Implementa TODO con código limpio, validaciones completas y documentación.
```

---

## CÓMO USAR ESTE PROMPT

1. **Copia el prompt completo** (sección "PROMPT COMPLETO")
2. **Pégalo en tu IA de desarrollo** (Claude, ChatGPT, etc.)
3. **Si es necesario, divide en partes:**
   - Parte 1: Setup + Auth + Productos
   - Parte 2: Sistema de ventas + Caja
   - Parte 3: Cuentas corrientes + Gift cards
   - Parte 4: Reportes e impresión

4. **Valida cada módulo** antes de continuar con el siguiente
5. **Ejecuta las migraciones** en Supabase en orden
6. **Prueba cada funcionalidad** con los casos de prueba

## RESULTADO ESPERADO

Al final tendrás una aplicación completa, funcional y profesional, idéntica o superior a este repositorio. La IA creará:

- ✅ 145+ archivos de código organizado
- ✅ 70+ migraciones de base de datos
- ✅ 10+ páginas principales
- ✅ 20+ componentes reutilizables
- ✅ 15+ funciones PostgreSQL
- ✅ 8+ reportes diferentes
- ✅ Sistema de impresión completo
- ✅ Autenticación y autorización
- ✅ Dashboard con métricas en tiempo real
- ✅ Gestión completa de inventario
- ✅ Sistema de cuentas corrientes con antigüedad
- ✅ Gift cards personalizadas
- ✅ Documentación completa

**¡Éxito en tu implementación!**
