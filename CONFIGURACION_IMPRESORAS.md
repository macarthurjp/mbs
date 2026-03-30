# Configuración de Impresoras Térmicas - Guía por Modelo

## Zebra ZD420 / ZD421

### Configuración en el Panel de la Impresora

1. Apagar la impresora
2. Presionar y mantener Feed + Cancel mientras enciendes
3. Soltar cuando las luces parpadeen
4. La impresora imprimirá etiqueta de configuración

### Configuración desde Windows (Zebra Setup Utilities)

1. Descargar e instalar Zebra Setup Utilities
2. Conectar impresora vía USB
3. Abrir Zebra Setup Utilities
4. Configurar:
   ```
   Media Type: Continuous Media
   Print Width: 50mm
   Print Length: 25mm
   Darkness: 8
   Print Speed: 102mm/s (4 ips)
   Tear Off: 0
   Print Method: Direct Thermal
   ```

### Comandos ZPL para Calibración

```zpl
^XA
^JUS
^XZ
```

Ejecutar este comando para calibrar el sensor de media.

### Driver de Windows

1. Descargar driver desde zebra.com
2. Instalar driver
3. Panel de Control → Impresoras
4. Preferencias de impresión:
   - Stock: Continuous (rollo continuo)
   - Width: 50mm
   - Height: 25mm
   - Orientation: Portrait
   - Top Position: 0mm
   - Left Position: 0mm

## TSC TTP-244CE / TTP-247

### Configuración desde Panel LCD

1. Menú → Setup → Media
   - Type: Continuous
   - Width: 50mm
   - Height: 25mm
   - Gap: 0mm

2. Menú → Setup → Print
   - Darkness: 8
   - Speed: 4 ips
   - Direction: 0

### Comandos TSPL para Configuración

```tspl
SIZE 50 mm, 25 mm
GAP 0 mm, 0 mm
DIRECTION 0
DENSITY 8
SPEED 4
REFERENCE 0,0
CLS
```

### Conversión a modo ZPL

La TTP-244CE puede emular ZPL:

1. Apagar impresora
2. Presionar FEED mientras enciendes
3. Seleccionar "ZPL Emulation Mode"
4. Ahora acepta comandos ZPL

## Brother QL-820NWB

### Importante

Esta impresora usa rollo continuo pero NO soporta ZPL nativamente.
Usar método "Imprimir (Driver Sistema)" o PDF.

### Configuración P-touch Editor

1. Abrir P-touch Editor
2. Archivo → Configuración de impresora
3. Seleccionar:
   - Tipo de medio: Rollo continuo
   - Ancho: 50mm
   - Longitud: 25mm
   - Auto-cut: OFF
   - Chain printing: ON

### Configuración del Driver

1. Panel de Control → Dispositivos
2. Propiedades de impresora Brother QL-820NWB
3. Preferences:
   - Paper Size: Custom (50mm × 25mm)
   - Media Type: Continuous Length Tape
   - Auto Cut: OFF
   - Cut Mark: OFF

## DYMO LabelWriter 450 / 550

### Configuración DYMO Label Software

1. Abrir DYMO Label Software
2. Nueva etiqueta → Personalizada
3. Configurar:
   - Ancho: 50mm
   - Alto: 25mm
   - Orientación: Vertical

### Importante

DYMO usa su propio formato, no ZPL. Usar solo métodos PDF o Driver Sistema.

### Impresión desde el sistema

El driver DYMO debe configurarse:
1. Preferencias → Advanced
2. Media Type: Continuous
3. Label Size: Custom (50mm × 25mm)
4. Print Quality: High (203 DPI mínimo)

## Citizen CL-S521 / CL-S621

### Configuración desde Software

1. Descargar Citizen Printer Setting Tool
2. Conectar impresora
3. Configurar:
   ```
   Media Width: 50mm
   Print Length: 25mm
   Sensor Type: Continuous
   Darkness: 100% (equivalente a 8)
   Speed: 100mm/s
   Head Position: Center
   ```

### Emulación ZPL

La Citizen puede emular ZPL:

1. Printer Setting Tool → Emulation
2. Seleccionar "ZPL Mode"
3. Apply → Restart printer
4. Ahora acepta comandos ZPL del sistema

## Honeywell PC42t

### Configuración PrintSet

1. Descargar Honeywell PrintSet
2. Connect to printer
3. Media Settings:
   ```
   Label Width: 50mm
   Label Height: 25mm
   Media Type: Continuous
   Sensor Type: Transmissive (for gap) - DISABLED
   Print Intensity: 8
   Print Speed: 101.6mm/s (4 ips)
   ```

### Comandos para Calibración

```
! U1 setvar "media.type" "label"
! U1 setvar "media.sense_mode" "gap"
! U1 setvar "ezpl.label_length" "25"
! U1 setvar "ezpl.label_width" "50"
```

## Godex G500 / G530

### Configuración GoLabel

1. Abrir GoLabel
2. Configuración de página:
   - Ancho: 50mm
   - Alto: 25mm
   - Tipo: Continuo
   - Offset: 0mm

### Comandos GoDEX (EZPL)

```
^W50
^H25
^Q25,0
^S4
^D8
```

## Configuración Genérica para Impresoras Desconocidas

Si tu impresora no está listada, usa esta configuración:

### 1. Método Driver Sistema

```
Tamaño de papel:
  - Crear tamaño personalizado: 50mm × 25mm
  - Nombre: "Etiqueta 50x25"

Márgenes:
  - Superior: 0mm
  - Inferior: 0mm
  - Izquierdo: 0mm
  - Derecho: 0mm

Configuración:
  - Tipo de medio: Rollo continuo / Continuous
  - Orientación: Vertical (Portrait)
  - Escala: 100% (No ajustar)
  - Resolución: 203 DPI o mayor
  - Calidad: Mejor calidad

Opciones avanzadas:
  - Auto-cut: Desactivado
  - Tear-off: 0mm
  - Sensor de papel: Continuo
```

### 2. Método PDF

Si nada funciona, genera PDF y configura:

```
Adobe Reader / Foxit:
1. Archivo → Imprimir
2. Configuración de página → Tamaño personalizado
3. 50mm × 25mm
4. Márgenes: 0mm
5. Escala: Ninguna (100%)
6. Orientación: Vertical
```

## Calibración de Sensores

### Para impresoras con sensor de gap (espacio)

Aunque usamos rollo continuo, algunas impresoras necesitan calibración:

1. Cargar el rollo
2. Presionar botón FEED 3 segundos
3. La impresora avanza papel y detecta configuración
4. Si no funciona, buscar "Auto Calibration" en el manual

### Para impresoras con sensor transmisivo

```
El sensor debe estar en modo "Continuous" o "Reflective" desactivado
```

## Densidad de Impresión (Darkness)

La densidad correcta depende del cabezal:

- **Cabezal nuevo:** Densidad 6-7
- **Cabezal normal:** Densidad 8
- **Cabezal desgastado:** Densidad 9-10

**Prueba de densidad:**

```zpl
^XA
^FO50,50^A0N,30,30^FDDensidad Test^FS
^XZ
```

Si el código de barras no escanea bien:
- Muy claro → Aumentar densidad
- Muy oscuro (barras anchas) → Reducir densidad

## Velocidad de Impresión

Velocidades recomendadas:

- **Alta calidad:** 2-3 ips (50-76mm/s)
- **Normal:** 4 ips (102mm/s) ← Recomendado
- **Rápida:** 6-8 ips (152-203mm/s)

A mayor velocidad, menor calidad de código de barras.

## Solución de Problemas por Modelo

### Zebra - Luces parpadeando

**Causa:** Sensor mal calibrado
**Solución:**
```zpl
^XA
^JUS
^XZ
```

### TSC - Salta etiquetas

**Causa:** Sensor en modo gap
**Solución:** Cambiar a modo continuous en panel LCD

### Brother - Corta cada etiqueta

**Causa:** Auto-cut activado
**Solución:** Desactivar auto-cut en preferencias

### DYMO - No imprime el ancho completo

**Causa:** Tamaño de etiqueta incorrecto
**Solución:** Crear tamaño personalizado exacto (50mm)

### Citizen - Imprime desplazado

**Causa:** Head position mal configurado
**Solución:** Setting Tool → Head Position → Center

## Comandos de Diagnóstico

### Imprimir configuración (Zebra)

```zpl
~WC
```

### Imprimir configuración (TSC)

Presionar FEED mientras enciendes la impresora.

### Test de impresión (Zebra)

```zpl
^XA
^FO50,50^GB400,200,2^FS
^FO60,60^A0N,30,30^FDTest OK^FS
^XZ
```

### Test de código de barras

```zpl
^XA
^FO50,50^BY2^BCN,100,Y,N,N^FD123456789012^FS
^XZ
```

## Contacto de Soporte

Para soporte técnico de cada marca:

- **Zebra:** https://www.zebra.com/support
- **TSC:** https://www.tscprinters.com/support
- **Brother:** https://support.brother.com
- **DYMO:** https://www.dymo.com/support
- **Citizen:** https://www.citizen-systems.com/support
- **Honeywell:** https://sps.honeywell.com/support
