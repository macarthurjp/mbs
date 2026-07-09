type ZipFile = {
  name: string;
  content: string;
};

const textEncoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }

  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function setUint16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function setUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function getDosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { dosDate, dosTime };
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

export function createZipBlob(files: ZipFile[]) {
  const now = new Date();
  const { dosDate, dosTime } = getDosDateTime(now);
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const contentBytes = textEncoder.encode(file.content);
    const checksum = crc32(contentBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    setUint32(localHeader, 0, 0x04034b50);
    setUint16(localHeader, 4, 20);
    setUint16(localHeader, 6, 0x0800);
    setUint16(localHeader, 8, 0);
    setUint16(localHeader, 10, dosTime);
    setUint16(localHeader, 12, dosDate);
    setUint32(localHeader, 14, checksum);
    setUint32(localHeader, 18, contentBytes.length);
    setUint32(localHeader, 22, contentBytes.length);
    setUint16(localHeader, 26, nameBytes.length);
    setUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    setUint32(centralHeader, 0, 0x02014b50);
    setUint16(centralHeader, 4, 20);
    setUint16(centralHeader, 6, 20);
    setUint16(centralHeader, 8, 0x0800);
    setUint16(centralHeader, 10, 0);
    setUint16(centralHeader, 12, dosTime);
    setUint16(centralHeader, 14, dosDate);
    setUint32(centralHeader, 16, checksum);
    setUint32(centralHeader, 20, contentBytes.length);
    setUint32(centralHeader, 24, contentBytes.length);
    setUint16(centralHeader, 28, nameBytes.length);
    setUint16(centralHeader, 30, 0);
    setUint16(centralHeader, 32, 0);
    setUint16(centralHeader, 34, 0);
    setUint16(centralHeader, 36, 0);
    setUint32(centralHeader, 38, 0);
    setUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    centralChunks.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  }

  const centralDirectory = concatBytes(centralChunks);
  const endRecord = new Uint8Array(22);
  setUint32(endRecord, 0, 0x06054b50);
  setUint16(endRecord, 4, 0);
  setUint16(endRecord, 6, 0);
  setUint16(endRecord, 8, files.length);
  setUint16(endRecord, 10, files.length);
  setUint32(endRecord, 12, centralDirectory.length);
  setUint32(endRecord, 16, offset);
  setUint16(endRecord, 20, 0);

  return new Blob([concatBytes([...localChunks, centralDirectory, endRecord])], {
    type: 'application/zip'
  });
}
