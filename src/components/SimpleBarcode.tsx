import React from 'react';

interface SimpleBarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}

export function SimpleBarcode({
  value,
  width = 1.2,
  height = 35,
  displayValue = true,
  fontSize = 10
}: SimpleBarcodeProps) {
  const L_CODES = [
    '0001101', '0011001', '0010011', '0111101', '0100011',
    '0110001', '0101111', '0111011', '0110111', '0001011'
  ];

  const G_CODES = [
    '0100111', '0110011', '0011011', '0100001', '0011101',
    '0111001', '0000101', '0010001', '0001001', '0010111'
  ];

  const R_CODES = [
    '1110010', '1100110', '1101100', '1000010', '1011100',
    '1001110', '1010000', '1000100', '1001000', '1110100'
  ];

  const FIRST_DIGIT_PATTERN = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
  ];

  const digits = value.replace(/\D/g, '').padStart(13, '0').slice(0, 13);

  if (digits.length < 12) {
    return (
      <div style={{ textAlign: 'center', fontSize: `${fontSize}px`, fontFamily: 'monospace' }}>
        {value}
      </div>
    );
  }

  const firstDigit = parseInt(digits[0]);
  const pattern = FIRST_DIGIT_PATTERN[firstDigit];

  let barcode = '101';

  for (let i = 0; i < 6; i++) {
    const digit = parseInt(digits[i + 1]);
    barcode += pattern[i] === 'L' ? L_CODES[digit] : G_CODES[digit];
  }

  barcode += '01010';

  for (let i = 6; i < 12; i++) {
    const digit = parseInt(digits[i + 1]);
    barcode += R_CODES[digit];
  }

  barcode += '101';

  const totalBars = barcode.length;
  const svgWidth = totalBars * width;

  return (
    <div style={{ textAlign: 'center', display: 'inline-block' }}>
      <svg
        width={svgWidth}
        height={height + (displayValue ? fontSize + 4 : 0)}
        style={{ display: 'block' }}
      >
        {barcode.split('').map((bar, index) => (
          bar === '1' ? (
            <rect
              key={index}
              x={index * width}
              y={0}
              width={width}
              height={height}
              fill="#000"
            />
          ) : null
        ))}
        {displayValue && (
          <text
            x={svgWidth / 2}
            y={height + fontSize + 2}
            textAnchor="middle"
            fontSize={fontSize}
            fontFamily="monospace"
            fill="#000"
          >
            {digits}
          </text>
        )}
      </svg>
    </div>
  );
}
