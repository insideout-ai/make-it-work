import { deflateRawSync } from 'node:zlib';

const table = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Small dependency-free ZIP32 writer. Callers bound snapshot size before compression.
export function zip(files) {
  if (files.length >= 65535) throw new Error('Too many archive entries.');
  const local = [], central = [], names = new Set();
  let offset = 0, centralSize = 0;
  for (const { name, data } of files) {
    if (!/^miw-[A-Za-z0-9_.-]+$/.test(name) || names.has(name)) throw new Error('Invalid or duplicate archive filename.');
    names.add(name);
    const filename = Buffer.from(name), body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const compressed = deflateRawSync(body), checksum = crc32(body);
    if (filename.length > 65535 || Math.max(body.length, compressed.length, offset) >= 0xffffffff) throw new Error('Archive exceeds ZIP32 limits.');
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8); // deflate
    header.writeUInt16LE(33, 12); // 1980-01-01; capture times live in the manifest
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(body.length, 22);
    header.writeUInt16LE(filename.length, 26);
    local.push(header, filename, compressed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    header.copy(entry, 6, 4, 30);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, filename);
    centralSize += entry.length + filename.length;
    offset += header.length + filename.length + compressed.length;
  }
  if (offset + centralSize >= 0xffffffff) throw new Error('Archive exceeds ZIP32 limits.');
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}
