# Guía Rápida - Impresión Térmica USB para NexusPOS

## Conexión de la Impresora

1. **Conecta la impresora térmica por USB**
   - Enciende la impresora
   - Conecta el cable USB a tu computadora
   - Espera a que Windows reconozca el dispositivo

2. **Verifica la conexión**
   - Windows: Panel de Control → Dispositivos e impresoras
   - Debería aparecer tu impresora (Zebra, TSC, etc.)

## Métodos de Impresión (del más rápido al más compatible)

### Método 1: Impresión USB Directa (ZPL) ⚡ RECOMENDADO

**Cuándo usar:** Tienes impresora Zebra, TSC o Citizen conectada por USB

**Pasos:**
1. En NexusPOS, ve a **Etiquetas**
2. Selecciona los productos que quieres imprimir
3. Click en **"Impresora Térmica (ZPL)"**
4. El navegador te mostrará lista de dispositivos USB
5. Selecciona tu impresora (ej: "Zebra Technologies ZD420")
6. Las etiquetas se imprimen automáticamente

**Ventajas:**
- Sin configuración de driver
- Sin márgenes
- Muy rápido
- Control total del formato

**Requisitos:**
- Chrome o Edge (no funciona en Firefox/Safari)
- Impresora encendida y conectada por USB

---

### Método 2: Driver del Sistema 🖨️

**Cuándo usar:** La impresión USB directa no funciona o tienes otra marca

**Pasos:**
1. Configura el driver de tu impresora (ver sección "Configuración del Driver")
2. En NexusPOS, selecciona productos
3. Click en **"Imprimir (Driver Sistema)"**
4. Se abre ventana del navegador
5. Verifica que tamaño sea 50x25mm
6. Click en Imprimir

**Ventajas:**
- Compatible con cualquier impresora
- Funciona en cualquier navegador

**Desventajas:**
- Requiere configuración previa del driver
- Puede agregar márgenes si no está bien configurado

---

### Método 3: Descargar ZPL 📄

**Cuándo usar:** Quieres imprimir muchas etiquetas después, o desde otro equipo

**Pasos:**
1. Selecciona productos
2. Click en **"Descargar ZPL"**
3. Se descarga archivo `etiquetas-XXXXX.zpl`
4. Envía el archivo a la impresora:

**Windows (línea de comandos):**
```cmd
copy /b etiquetas-XXXXX.zpl \\localhost\NombreDeTuImpresora
```

**O arrastra el archivo** a la impresora en "Dispositivos e impresoras"

---

### Método 4: PDF 📋

**Cuándo usar:** Respaldo o para imprimir en impresora no térmica

**Pasos:**
1. Selecciona productos
2. Click en **"Descargar PDF"**
3. Se genera PDF con todas las etiquetas
4. Abre e imprime normalmente

## Configuración en Windows

### Driver NexusPOS
1. Abre "Configuración de Impresora"
2. Selecciona tu impresora NexusPOS
3. Ve a "Preferencias de Impresión"
4. Configura:
   - Tamaño de papel: 50mm x 25mm (crea tamaño personalizado si no existe)
   - Orientación: Vertical
   - Calidad: Alta
   - Tipo de papel: Etiquetas

### Crear Tamaño Personalizado (si es necesario)
1. Panel de Control → Dispositivos e impresoras
2. Clic derecho en NexusPOS → Propiedades del servidor de impresión
3. Pestaña "Formularios"
4. Marcar "Crear un nuevo formulario"
5. Nombre: "Etiqueta 50x25"
6. Ancho: 5.0 cm
7. Alto: 2.5 cm
8. Guardar

## Configuración en el Navegador

### Google Chrome (CONFIGURACIÓN PASO A PASO)
1. Al hacer clic en "Imprimir Directo"
2. En el diálogo de impresión:
   - **Destino:** NexusPOS
   - **Páginas:** Todas
   - **Diseño:** Vertical
   - Click en **"Más configuraciones"**:
     - **Tamaño del papel:** 50 x 25 mm (si no existe, ver "Crear Tamaño Personalizado")
     - **Márgenes:** Ninguno / 0
     - **Escala:** Predeterminada (100%)
     - **Opciones:**
       - ❌ Desmarcar "Encabezados y pies de página"
       - ❌ Desmarcar "Fondo de colores e imágenes" (si aparece)
3. **IMPORTANTE:** Cada etiqueta debe ocupar TODA la página de 50x25mm
4. Si ves que se divide en varias páginas pequeñas, revisa los márgenes

### Firefox
1. Archivo → Imprimir
2. Impresora: NexusPOS
3. Propiedades:
   - Tamaño: 50mm x 25mm
   - Sin márgenes
   - Orientación: Vertical

## Contenido de las Etiquetas

Cada etiqueta incluye:
- **Nombre del producto** (máximo 22 caracteres para 50x25mm)
- **Categoría y talle** (Ej: "Remera - Talle M")
- **Código de barras EAN-13** (generado automáticamente)
- **Precio** (en formato $XX,XXX.XX)

## Diseño Optimizado para 50x25mm

El sistema ajusta automáticamente:
- Tamaño de fuente: 7pt para nombre, 5pt para info
- Código de barras: 40mm ancho, 8mm alto
- Precio: 10pt en negrita
- Espaciado: Reducido para máximo aprovechamiento

## Solución de Problemas

### El contenido se divide en 4 etiquetas pequeñas (PROBLEMA COMÚN)
**Causa:** Los márgenes o el tamaño de página no están configurados correctamente
**Solución:**
1. Abre el diálogo de impresión
2. Verifica que "Márgenes" esté en "Ninguno" o "0"
3. El tamaño de página DEBE ser exactamente 50mm x 25mm
4. En Chrome: Más configuraciones → Márgenes → Ninguno
5. En Windows: Propiedades de impresora → Márgenes personalizados → 0,0,0,0
6. **CRÍTICO:** El contenido debe verse como UNA etiqueta de 50x25mm, no como 4 divisiones

### La etiqueta se corta o sale incompleta
- Verifica que el tamaño de papel sea exactamente 50mm x 25mm
- Asegúrate de que los márgenes estén en 0 en TODOS los lados
- Comprueba que la escala esté al 100%
- Revisa que el driver de la impresora esté actualizado

### El código de barras no escanea
- Aumenta la calidad de impresión en las preferencias
- Limpia el cabezal de la impresora
- Verifica que las etiquetas sean de buena calidad (no brillantes)

### Las etiquetas salen en blanco
- Revisa que la cinta térmica esté correctamente instalada
- Verifica que la impresora esté en modo de etiquetas (no recibo)
- Ajusta la intensidad/oscuridad de impresión

### El texto se ve muy pequeño
- Es normal para 50x25mm (etiquetas pequeñas)
- Si necesitas texto más grande, usa el tamaño 50x30mm o 80x40mm
- Para 50x25mm el texto es óptimo para lecturas rápidas

## Recomendaciones

1. **Calidad de etiquetas**: Usa etiquetas térmicas de buena calidad
2. **Almacenamiento**: Guarda las etiquetas en lugar fresco y seco
3. **Limpieza**: Limpia el cabezal cada 1000 etiquetas aprox.
4. **Prueba**: Imprime 1 etiqueta de prueba antes de imprimir grandes cantidades
5. **Escaneo**: Prueba que el código de barras escanee correctamente

## Ventajas de 50x25mm

- Tamaño compacto ideal para prendas pequeñas
- Menor costo por etiqueta
- Más etiquetas por rollo
- Perfectas para tags colgantes
- Rápida impresión

## Próximos Pasos

1. Imprime 2-3 etiquetas de prueba
2. Verifica que el código de barras escanee correctamente
3. Ajusta la configuración de la impresora si es necesario
4. Comienza a etiquetar tu inventario

---

**Tip Pro**: Guarda la configuración de impresión en Chrome para no tener que configurarla cada vez.
