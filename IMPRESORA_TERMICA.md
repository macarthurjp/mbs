# Guía de Impresión Térmica - Etiquetas 50x25mm

Este sistema soporta múltiples métodos de impresión en impresoras térmicas de etiquetas con configuración profesional para rollo continuo.

## Configuración de la Impresora

### Parámetros Técnicos
```
Ancho de etiqueta:    50 mm
Alto de etiqueta:     25 mm
Tipo de medio:        Rollo continuo
Espacio entre etiq.:  0 mm
Orientación:          0° (normal)
Margen superior:      0 mm
Margen izquierdo:     0 mm
Densidad de impres.:  8 (darkness)
Velocidad:            4
Resolución:           203 DPI (8 dots/mm)
```

### Configuración en Windows

1. **Panel de Control** → **Dispositivos e impresoras**
2. Click derecho en tu impresora térmica → **Preferencias de impresión**
3. Configurar:
   - Tamaño de papel: **50mm x 25mm** (crear tamaño personalizado si no existe)
   - Tipo de medio: **Rollo continuo** / **Continuous**
   - Márgenes: **0mm en todos los lados**
   - Orientación: **Vertical** (Portrait)
   - Escala: **100%** (sin ajustar)
   - Calidad: **203 DPI**

### Configuración en Zebra Designer

Para impresoras Zebra, puedes usar Zebra Designer:

1. Abrir Zebra Designer
2. Archivo → Configuración de página
   - Ancho: 50mm
   - Alto: 25mm
   - Orientación: Vertical
   - Tipo de stock: Continuo (sin espacios)
3. Importar archivos .zpl desde el botón "Descargar ZPL"

## Métodos de Impresión

### 1. Impresora Térmica (ZPL) - Recomendado para Zebra

**Ventajas:**
- Impresión directa por USB sin drivers
- Control total de la etiqueta
- Sin márgenes automáticos del sistema
- Muy rápida

**Requisitos:**
- Navegador Chrome o Edge
- Impresora conectada por USB
- Soporte de comandos ZPL (Zebra, TSC, algunas Citizen)

**Cómo usar:**
1. Conecta la impresora térmica por USB
2. Selecciona los productos
3. Click en "Impresora Térmica (ZPL)"
4. El navegador mostrará una lista de dispositivos USB
5. Selecciona tu impresora térmica (busca Zebra, TSC, Citizen, etc.)
6. Las etiquetas se envían directamente por USB

**Protocolo ZPL (Zebra Programming Language):**
- Estándar de Zebra Technologies
- Comandos en texto plano enviados por USB
- Configuración precisa al milímetro
- Compatible con la mayoría de impresoras térmicas profesionales

**Nota:** La impresora debe estar encendida y conectada por USB. El navegador accede directamente al dispositivo USB sin necesidad de drivers instalados.

### 2. Imprimir (Driver Sistema)

**Ventajas:**
- Funciona en cualquier navegador
- No requiere permisos especiales
- Compatible con cualquier impresora

**Requisitos:**
- Driver de impresora instalado
- Configuración manual del tamaño 50x25mm en el driver

**Cómo usar:**
1. Selecciona los productos
2. Click en "Imprimir (Driver Sistema)"
3. Se abre ventana de impresión para CADA etiqueta
4. Verifica que el tamaño sea 50x25mm
5. Imprime

**Importante:**
- Asegúrate de que el driver esté configurado para 50x25mm
- Desactiva márgenes automáticos
- No escales la página

### 3. Descargar ZPL

**Ventajas:**
- Impresión offline
- Impresión por lotes
- Compatible con software profesional
- Reutilizable

**Requisitos:**
- Software que lea archivos .zpl (Zebra Designer, BarTender, etc.)
- O envío directo por línea de comandos

**Cómo usar:**
1. Selecciona los productos
2. Click en "Descargar ZPL"
3. Se descarga archivo `etiquetas-[timestamp].zpl`
4. Imprime el archivo con tu software preferido

**Envío directo por línea de comandos (Windows):**
```cmd
copy /b etiquetas-1234567890.zpl \\localhost\NombreDeTuImpresora
```

**Envío directo por línea de comandos (Linux/Mac):**
```bash
cat etiquetas-1234567890.zpl > /dev/usb/lp0
# o
lpr -P nombre_impresora etiquetas-1234567890.zpl
```

### 4. Descargar PDF

**Ventajas:**
- Universal, funciona en cualquier impresora
- Respaldo permanente
- Fácil de compartir

**Desventajas:**
- Puede tener problemas de márgenes
- Requiere configuración manual

**Cómo usar:**
1. Selecciona los productos
2. Click en "Descargar PDF"
3. Se genera PDF con todas las etiquetas
4. Imprime desde tu lector de PDF
5. Configura tamaño 50x25mm en opciones de impresión

## Contenido de las Etiquetas

Cada etiqueta de 50x25mm incluye:

```
┌─────────────────────────────────┐
│ NOMBRE DEL PRODUCTO             │  ← 8pt Bold
│ Categoría - Talle S             │  ← 6pt Regular
│                                 │
│    ║║│││║║││║│││║││║││          │  ← Código de barras
│    200400040032520              │  ← Número CODE128
│                                 │
│ $2.500,00                       │  ← 12pt Bold
└─────────────────────────────────┘
     50mm x 25mm (sin márgenes)
```

## Códigos de Barras

- **Formato:** CODE128
- **Altura:** 10mm
- **Ancho de barra:** 0.25mm (módulo mínimo)
- **Incluye dígito verificador**
- **Lectura omnidireccional**

## Solución de Problemas

### La etiqueta sale cortada

**Causa:** Márgenes automáticos del driver
**Solución:**
1. Configurar márgenes en 0mm en el driver
2. Usar método "Impresora Térmica (ZPL)" en lugar de driver sistema

### Sale en varias páginas

**Causa:** El navegador está agregando saltos de página
**Solución:**
1. Usar método "Impresora Térmica (ZPL)"
2. O configurar bien el tamaño de página en el driver (exactamente 50x25mm)

### El texto está muy grande o muy pequeño

**Causa:** Escala incorrecta
**Solución:**
1. Configurar escala al 100% en opciones de impresión
2. Usar método "Impresora Térmica (ZPL)" que no escala

### No aparece la impresora en la lista USB

**Causa:** Web USB API no disponible o impresora no detectada
**Solución:**
1. Usar Chrome o Edge (Firefox y Safari no soportan Web USB API)
2. Verificar que la impresora esté encendida y conectada por USB
3. Desconectar y volver a conectar el cable USB
4. En Windows: verificar que aparece en "Administrador de dispositivos"
5. Si no aparece, probar con método "Imprimir (Driver Sistema)"

### El código de barras no escanea

**Causa:** Densidad muy baja o muy alta
**Solución:**
1. Ajustar densidad de impresión (valor recomendado: 8)
2. Limpiar cabezal de impresora
3. Verificar que el código sea CODE128 válido

## Impresoras Compatibles

### Totalmente compatibles (ZPL nativo):
- Zebra ZD410, ZD420, ZD421
- Zebra GK420d, GX420d
- Zebra ZT410, ZT420
- TSC TTP-244CE, TTP-247
- TSC TC200, TC300
- Citizen CL-S521, CL-S621

### Compatibles con emulación ZPL:
- Brother QL-820NWB (con firmware actualizado)
- DYMO LabelWriter (algunos modelos)
- Honeywell PC42t

### Compatibles solo con Driver Sistema:
- Cualquier impresora con driver de Windows/Mac/Linux

## Comandos ZPL Generados

Ejemplo de comandos ZPL para una etiqueta:

```zpl
^XA
^PW400
^LL200
^MD8
^PR4
^MNN
^FO10,5^A0N,25,25^FDaros argolla^FS
^FO10,32^A0N,18,18^FDAccesorios - Talle S^FS
^FO50,55^BY2,2,40^BCN,40,N,N,N^FD200400040032520^FS
^FO80,100^A0N,15,15^FD200400040032520^FS
^FO10,125^A0N,40,40^FD$2.500,00^FS
^XZ
```

**Explicación:**
- `^XA` / `^XZ`: Inicio/fin de formato
- `^PW400`: Ancho 400 dots (50mm × 8dpmm)
- `^LL200`: Largo 200 dots (25mm × 8dpmm)
- `^MD8`: Densidad de impresión 8
- `^PR4`: Velocidad 4
- `^MNN`: Rollo continuo (sin espacios)
- `^FO`: Posición del campo (x,y en dots)
- `^A0N`: Fuente (tipo 0, normal)
- `^FD...^FS`: Datos del campo
- `^BC`: Código de barras CODE128

## Recomendaciones

1. **Para máxima compatibilidad:** Usa "Descargar PDF"
2. **Para máxima velocidad:** Usa "Impresora Térmica (ZPL)"
3. **Para impresión masiva:** Usa "Descargar ZPL" e imprime por lotes
4. **Para impresoras no-Zebra:** Usa "Imprimir (Driver Sistema)"

## Mantenimiento

- Limpia el cabezal de impresión cada 1000 etiquetas
- Usa etiquetas de calidad (papel térmico directo)
- Ajusta densidad según desgaste del cabezal
- Calibra la impresora si las etiquetas salen desalineadas

## Soporte Técnico

Si tienes problemas:

1. Verifica que la impresora esté configurada para 50x25mm sin márgenes
2. Prueba con diferentes métodos de impresión
3. Descarga ZPL y ábrelo en un editor de texto para verificar comandos
4. Consulta el manual de tu impresora para comandos específicos
