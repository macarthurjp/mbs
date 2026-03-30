import React from 'react';

interface GiftCardPreviewProps {
  code: string;
  amount: number;
  gift_from?: string | null;
  gift_to?: string | null;
}

export function GiftCardPreview({ code, amount, gift_from, gift_to }: GiftCardPreviewProps) {
  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-32 h-32 bg-pink-600 opacity-10 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-pink-500 opacity-10 blur-3xl rounded-full" />

      <div className="relative z-10">
        <h1 className="text-4xl md:text-5xl font-serif tracking-wider text-center mb-2" style={{ color: '#D4AF37' }}>
          GIFT CARD
        </h1>
        <p className="text-center text-gray-400 text-sm mb-8" style={{ color: '#B8A080' }}>
          Un pequeño detalle para una persona muy especial
        </p>

        <div className="space-y-4 mb-8">
          <div className="bg-white rounded-xl px-6 py-4 text-black">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold">DE:</span>
              <span className="text-2xl font-bold font-serif">{gift_from || '___________'}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl px-6 py-4 text-black">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold">PARA:</span>
              <span className="text-2xl font-bold font-serif">{gift_to || '___________'}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl px-6 py-4 text-black">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold">VALE POR:</span>
              <span className="text-3xl font-bold font-serif">${amount.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-serif tracking-wider mb-1" style={{ color: '#D4AF37' }}>
            KIERO
          </h2>
          <p className="text-xs tracking-widest" style={{ color: '#B8A080' }}>
            QUE ME MIRES
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-400">
            <span>f Kiero que me mires</span>
            <span>📷 Kieroquememires</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            www.kieroquememires.com.ar
          </p>
        </div>

        <div className="text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-700">
          Código: <span className="font-mono font-semibold text-white">{code}</span>
        </div>
      </div>
    </div>
  );
}

export default GiftCardPreview;
