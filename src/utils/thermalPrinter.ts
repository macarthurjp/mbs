/**
 * Módulo de impresión térmica para etiquetas 50x25mm
 * Soporta comandos ESC/POS y ZPL
 */

export interface ThermalPrintConfig {
  label_width: number;      // 50 mm
  label_height: number;     // 25 mm
  media_type: 'continuous';
  gap_height: number;       // 0 mm
  orientation: number;      // 0°
  margin_top: number;       // 0 mm
  margin_left: number;      // 0 mm
  print_density: number;    // 8 (darkness)
  print_speed: number;      // 4
}

export const DEFAULT_THERMAL_CONFIG: ThermalPrintConfig = {
  label_width: 50,
  label_height: 25,
  media_type: 'continuous',
  gap_height: 0,
  orientation: 0,
  margin_top: 0,
  margin_left: 0,
  print_density: 8,
  print_speed: 4
};

export interface LabelContent {
  productName: string;
  category: string;
  size: string;
  barcode: string;
  price: number;
}

/**
 * Genera comandos ZPL para impresoras Zebra
 * ZPL es el estándar más usado en impresoras térmicas de etiquetas
 */
export function generateZPLCommands(content: LabelContent, config: ThermalPrintConfig = DEFAULT_THERMAL_CONFIG): string {
  const dpmm = 8; // dots per mm (203 DPI ≈ 8 dpmm)
  const labelWidthDots = config.label_width * dpmm; // 400 dots
  const labelHeightDots = config.label_height * dpmm; // 200 dots

  let zpl = '';

  // Inicialización
  zpl += '^XA\n'; // Start format

  // Configuración de etiqueta
  zpl += `^PW${labelWidthDots}\n`; // Print width
  zpl += `^LL${labelHeightDots}\n`; // Label length
  zpl += `^MD${config.print_density}\n`; // Media darkness
  zpl += `^PR${config.print_speed}\n`; // Print speed
  zpl += '^MNN\n'; // Media tracking continuous

  // Nombre del producto (parte superior, centrado)
  const productNameTrimmed = content.productName.length > 20
    ? content.productName.substring(0, 20)
    : content.productName;
  zpl += `^FO10,5^A0N,25,25^FD${productNameTrimmed}^FS\n`;

  // Categoría y talle (debajo del nombre)
  zpl += `^FO10,32^A0N,18,18^FD${content.category} - Talle ${content.size}^FS\n`;

  // Código de barras CODE128 (centrado)
  zpl += `^FO50,55^BY2,2,40^BCN,40,N,N,N^FD${content.barcode}^FS\n`;

  // Número del código de barras (debajo del código)
  zpl += `^FO80,100^A0N,15,15^FD${content.barcode}^FS\n`;

  // Precio (parte inferior, grande)
  const priceFormatted = `$${content.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  zpl += `^FO10,125^A0N,40,40^FD${priceFormatted}^FS\n`;

  // Finalizar
  zpl += '^XZ\n'; // End format

  return zpl;
}

/**
 * Genera comandos ESC/POS para impresoras térmicas genéricas
 */
export function generateESCPOSCommands(content: LabelContent, config: ThermalPrintConfig = DEFAULT_THERMAL_CONFIG): Uint8Array {
  const ESC = 0x1B;
  const GS = 0x1D;
  const LF = 0x0A;

  const commands: number[] = [];

  // Inicializar impresora
  commands.push(ESC, 0x40); // Initialize

  // Configurar densidad de impresión
  commands.push(ESC, 0x37, config.print_density, 100, 100);

  // Deshabilitar modo página (usar modo continuo)
  commands.push(ESC, 0x4C); // Select page mode
  commands.push(ESC, 0x53); // Select standard mode

  // Configurar área de impresión (50mm x 25mm)
  // 576 dots = 72mm a 203DPI, ajustamos a 400 dots para 50mm
  commands.push(GS, 0x57, 0x90, 0x01); // Set print area width (400 dots)

  // Nombre del producto (negrita, tamaño mediano)
  commands.push(ESC, 0x45, 0x01); // Bold on
  commands.push(GS, 0x21, 0x11); // Double height and width
  const productName = content.productName.length > 20
    ? content.productName.substring(0, 20)
    : content.productName;
  commands.push(...Array.from(new TextEncoder().encode(productName)));
  commands.push(LF);
  commands.push(ESC, 0x45, 0x00); // Bold off
  commands.push(GS, 0x21, 0x00); // Normal size

  // Categoría y talle
  const categoryLine = `${content.category} - Talle ${content.size}`;
  commands.push(...Array.from(new TextEncoder().encode(categoryLine)));
  commands.push(LF);

  // Código de barras
  commands.push(GS, 0x68, 40); // Barcode height (40 dots)
  commands.push(GS, 0x77, 0x02); // Barcode width (2)
  commands.push(GS, 0x48, 0x02); // HRI position (below)
  commands.push(GS, 0x6B, 0x49); // CODE128
  commands.push(content.barcode.length);
  commands.push(...Array.from(new TextEncoder().encode(content.barcode)));
  commands.push(LF);

  // Precio (grande, negrita)
  commands.push(ESC, 0x45, 0x01); // Bold on
  commands.push(GS, 0x21, 0x22); // Triple height, double width
  const priceText = `$${content.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  commands.push(...Array.from(new TextEncoder().encode(priceText)));
  commands.push(LF);
  commands.push(ESC, 0x45, 0x00); // Bold off

  // Cortar papel (si soporta)
  commands.push(GS, 0x56, 0x00); // Full cut

  return new Uint8Array(commands);
}

/**
 * Envía comandos a la impresora térmica USB vía Web USB API
 * Las impresoras térmicas USB se comunican como dispositivos USB RAW
 */
export async function printToThermalPrinterUSB(commands: string | Uint8Array, format: 'ZPL' | 'ESCPOS' = 'ZPL'): Promise<void> {
  try {
    // Verificar soporte de Web USB API
    if (!('usb' in navigator)) {
      throw new Error('Web USB API no soportada en este navegador. Use Chrome/Edge o método "Driver Sistema".');
    }

    // Filtros comunes para impresoras térmicas
    const filters = [
      { vendorId: 0x0a5f }, // Zebra
      { vendorId: 0x1203 }, // TSC
      { vendorId: 0x0dd4 }, // Custom Engineering / Citizen
      { vendorId: 0x0483 }, // STMicroelectronics (usado por varias marcas)
      { vendorId: 0x04f9 }, // Brother
      { vendorId: 0x0922 }, // Dymo
      // Permitir selección manual de cualquier dispositivo
    ];

    // Solicitar dispositivo USB
    const device = await (navigator as any).usb.requestDevice({ filters });

    // Abrir dispositivo
    await device.open();

    // Seleccionar configuración (normalmente la primera)
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // Reclamar interfaz (normalmente la interfaz 0)
    const interfaceNumber = device.configuration.interfaces[0].interfaceNumber;
    await device.claimInterface(interfaceNumber);

    // Encontrar endpoint OUT (para enviar datos)
    const endpoints = device.configuration.interfaces[0].alternate.endpoints;
    const outEndpoint = endpoints.find((ep: any) => ep.direction === 'out');

    if (!outEndpoint) {
      throw new Error('No se encontró endpoint OUT en la impresora');
    }

    // Convertir comandos a bytes si es necesario
    const data = typeof commands === 'string'
      ? new TextEncoder().encode(commands)
      : commands;

    // Enviar datos por USB en chunks de máximo 64 bytes (tamaño típico de endpoint)
    const chunkSize = 64;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
      await device.transferOut(outEndpoint.endpointNumber, chunk);
    }

    // Liberar interfaz y cerrar dispositivo
    await device.releaseInterface(interfaceNumber);
    await device.close();

    console.log('Etiqueta enviada a impresora térmica USB');
  } catch (error: any) {
    console.error('Error al imprimir por USB:', error);

    // Mensajes de error más útiles
    if (error.name === 'NotFoundError') {
      throw new Error('No se seleccionó ninguna impresora USB');
    } else if (error.message.includes('Web USB API')) {
      throw error;
    } else {
      throw new Error('Error de conexión USB: ' + error.message);
    }
  }
}

/**
 * Alias para compatibilidad - ahora usa USB en lugar de Serial
 */
export async function printToThermalPrinter(commands: string | Uint8Array, format: 'ZPL' | 'ESCPOS' = 'ZPL'): Promise<void> {
  return printToThermalPrinterUSB(commands, format);
}

/**
 * Genera SVG de código de barras CODE128 simplificado
 * Basado en el algoritmo CODE128-B
 */
function generateBarcodeSVG(value: string): string {
  const patterns = {
    '0': '11011001100', '1': '11001101100', '2': '11001100110', '3': '10010011000',
    '4': '10010001100', '5': '10001001100', '6': '10011001000', '7': '10011000100',
    '8': '10001100100', '9': '11001001000', 'A': '11001000100', 'B': '11000100100',
    'C': '10110011100', 'D': '10011011100', 'E': '10011001110', 'F': '10111001100',
    'G': '10011101100', 'H': '10011100110', 'I': '11001110010', 'J': '11001011100',
    'K': '11001001110', 'L': '11011100100', 'M': '11001110100', 'N': '11101101110',
    'O': '11101001100', 'P': '11100101100', 'Q': '11100100110', 'R': '11101100100',
    'S': '11100110100', 'T': '11100110010', 'U': '11011011000', 'V': '11011000110',
    'W': '11000110110', 'X': '10100011000', 'Y': '10001011000', 'Z': '10001000110',
    ' ': '10110001000', '!': '10001101000', '"': '10001100010', '#': '11010001000',
    '$': '11000101000', '%': '11000100010', '&': '10110111000', "'": '10110001110',
    '(': '10001101110', ')': '10111011000', '*': '10111000110', '+': '10001110110'
  };

  const START_B = '11010010000';
  const STOP = '1100011101011';

  let bars = START_B;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    const key = char.match(/[0-9]/) ? char :
                char.match(/[A-Z]/) ? char :
                char.match(/[a-z]/) ? char.toUpperCase() :
                ' ';
    bars += patterns[key as keyof typeof patterns] || patterns['0'];
  }

  bars += STOP;

  const barWidth = 2;
  const barHeight = 40;
  const width = bars.length * barWidth;

  let svg = `<svg width="${width}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">`;

  for (let i = 0; i < bars.length; i++) {
    if (bars[i] === '1') {
      svg += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${barHeight}" fill="black"/>`;
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Imprime etiqueta usando el driver del sistema (fallback)
 * Genera HTML optimizado para impresoras térmicas
 */
export function printLabelViaSystemDriver(content: LabelContent, config: ThermalPrintConfig = DEFAULT_THERMAL_CONFIG): void {
  const labelWidthMM = config.label_width;
  const labelHeightMM = config.label_height;

  const barcodeSVG = generateBarcodeSVG(content.barcode);

  const printWindow = window.open('', '_blank', 'width=400,height=300');

  if (!printWindow) {
    throw new Error('No se pudo abrir ventana de impresión. Verifique el bloqueador de ventanas emergentes.');
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Etiqueta - ${content.barcode}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        @page {
          size: ${labelWidthMM}mm ${labelHeightMM}mm landscape;
          margin: 0mm;
        }

        @media print {
          html, body {
            width: ${labelWidthMM}mm;
            height: ${labelHeightMM}mm;
            margin: 0;
            padding: 0;
          }

          .label {
            page-break-after: always;
          }
        }

        body {
          font-family: Arial, sans-serif;
          background: white;
          width: ${labelWidthMM}mm;
          height: ${labelHeightMM}mm;
          overflow: hidden;
        }

        .label {
          width: ${labelWidthMM}mm;
          height: ${labelHeightMM}mm;
          padding: 1mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: white;
          position: relative;
        }

        .product-name {
          font-size: 6pt;
          font-weight: bold;
          text-align: center;
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .product-info {
          font-size: 5pt;
          text-align: center;
          color: #333;
          line-height: 1.1;
        }

        .barcode-container {
          text-align: center;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .barcode-container svg {
          max-width: 46mm;
          height: 8mm;
        }

        .barcode-number {
          font-size: 4pt;
          margin-top: 0.2mm;
          font-family: monospace;
        }

        .price {
          font-size: 10pt;
          font-weight: bold;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="label">
        <div class="product-name">${content.productName.length > 30 ? content.productName.substring(0, 30) + '...' : content.productName}</div>
        <div class="product-info">${content.category} - Talle ${content.size}</div>
        <div class="barcode-container">
          ${barcodeSVG}
          <div class="barcode-number">${content.barcode}</div>
        </div>
        <div class="price">$${content.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
      </div>

      <script>
        setTimeout(() => {
          window.print();
          setTimeout(() => window.close(), 300);
        }, 50);
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Descarga comandos ZPL como archivo .zpl
 * Útil para impresión offline o por lotes
 */
export function downloadZPLFile(content: LabelContent, config: ThermalPrintConfig = DEFAULT_THERMAL_CONFIG): void {
  const zpl = generateZPLCommands(content, config);
  const blob = new Blob([zpl], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `etiqueta-${content.barcode}.zpl`;
  link.click();
  URL.revokeObjectURL(url);
}
