const BYTE_MODE = 0b0100;
const ECC_FORMAT_BITS_LOW = 0b01;
const FORMAT_MASK = 0x5412;
const FORMAT_POLY = 0x537;
const GF_PRIMITIVE = 0x11d;
const PAD_CODEWORDS = [0xec, 0x11] as const;

const VERSION_CONFIGS = [
  { version: 1, dataCodewords: 19, eccCodewords: 7, byteCapacity: 17 },
  { version: 2, dataCodewords: 34, eccCodewords: 10, byteCapacity: 32 },
  { version: 3, dataCodewords: 55, eccCodewords: 15, byteCapacity: 53 },
  { version: 4, dataCodewords: 80, eccCodewords: 20, byteCapacity: 78 },
  { version: 5, dataCodewords: 108, eccCodewords: 26, byteCapacity: 106 },
] as const;

type VersionConfig = (typeof VERSION_CONFIGS)[number];

export interface QrCodeMatrix {
  modules: boolean[][];
  size: number;
  version: number;
}

function appendBits(buffer: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) {
    buffer.push((value >>> i) & 1);
  }
}

function bitsToCodewords(bits: number[]) {
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) {
      value = (value << 1) | (bits[i + j] ?? 0);
    }
    codewords.push(value);
  }
  return codewords;
}

function gfMultiply(x: number, y: number) {
  let result = 0;
  let a = x;
  let b = y;

  while (b > 0) {
    if ((b & 1) !== 0) result ^= a;
    a <<= 1;
    if ((a & 0x100) !== 0) a ^= GF_PRIMITIVE;
    b >>>= 1;
  }

  return result & 0xff;
}

function reedSolomonDivisor(degree: number) {
  const result = new Array(degree).fill(0) as number[];
  result[degree - 1] = 1;

  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }

  return result;
}

function reedSolomonRemainder(data: number[], degree: number) {
  const divisor = reedSolomonDivisor(degree);
  const result = new Array(degree).fill(0) as number[];

  for (const value of data) {
    const factor = value ^ result.shift()!;
    result.push(0);
    for (let i = 0; i < divisor.length; i += 1) {
      result[i] ^= gfMultiply(divisor[i], factor);
    }
  }

  return result;
}

function selectVersion(byteLength: number): VersionConfig {
  const config = VERSION_CONFIGS.find((item) => byteLength <= item.byteCapacity);
  if (!config) throw new Error("QR payload is too large");
  return config;
}

function encodeDataCodewords(text: string, config: VersionConfig) {
  const bytes = Array.from(new TextEncoder().encode(text));
  const bits: number[] = [];

  appendBits(bits, BYTE_MODE, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacityBits = config.dataCodewords * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = bitsToCodewords(bits);
  let padIndex = 0;
  while (codewords.length < config.dataCodewords) {
    codewords.push(PAD_CODEWORDS[padIndex % PAD_CODEWORDS.length]);
    padIndex += 1;
  }

  return codewords;
}

function createMatrix(size: number, value: boolean) {
  return Array.from({ length: size }, () => Array(size).fill(value) as boolean[]);
}

function setModule(
  modules: boolean[][],
  reserved: boolean[][],
  x: number,
  y: number,
  value: boolean,
  reserve = true
) {
  if (x < 0 || y < 0 || y >= modules.length || x >= modules.length) return;
  modules[y][x] = value;
  if (reserve) reserved[y][x] = true;
}

function drawFinder(
  modules: boolean[][],
  reserved: boolean[][],
  x: number,
  y: number
) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || yy >= modules.length || xx >= modules.length) {
        continue;
      }

      const inPattern = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const dark =
        inPattern &&
        (dx === 0 ||
          dx === 6 ||
          dy === 0 ||
          dy === 6 ||
          (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));

      setModule(modules, reserved, xx, yy, dark);
    }
  }
}

function drawAlignment(
  modules: boolean[][],
  reserved: boolean[][],
  centerX: number,
  centerY: number
) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      setModule(
        modules,
        reserved,
        centerX + dx,
        centerY + dy,
        distance === 2 || distance === 0
      );
    }
  }
}

function alignmentPatternPositions(version: number) {
  return version === 1 ? [] : [6, 4 * version + 10];
}

function drawFunctionPatterns(
  modules: boolean[][],
  reserved: boolean[][],
  version: number
) {
  const size = modules.length;
  drawFinder(modules, reserved, 0, 0);
  drawFinder(modules, reserved, size - 7, 0);
  drawFinder(modules, reserved, 0, size - 7);

  for (let i = 8; i < size - 8; i += 1) {
    const dark = i % 2 === 0;
    setModule(modules, reserved, i, 6, dark);
    setModule(modules, reserved, 6, i, dark);
  }

  const positions = alignmentPatternPositions(version);
  for (const y of positions) {
    for (const x of positions) {
      const overlapsFinder =
        (x === 6 && y === 6) ||
        (x === size - 7 && y === 6) ||
        (x === 6 && y === size - 7);
      if (!overlapsFinder) drawAlignment(modules, reserved, x, y);
    }
  }

  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
  setModule(modules, reserved, 8, size - 8, true);
}

function getMaskBit(mask: number, x: number, y: number) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function drawCodewords(
  modules: boolean[][],
  reserved: boolean[][],
  codewords: number[],
  mask: number
) {
  const size = modules.length;
  const bits = codewords.flatMap((codeword) =>
    Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1)
  );
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;
      for (let column = 0; column < 2; column += 1) {
        const x = right - column;
        if (reserved[y][x]) continue;
        const bit = (bits[bitIndex] ?? 0) !== 0;
        modules[y][x] = bit !== getMaskBit(mask, x, y);
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

function calculateFormatBits(mask: number) {
  const data = (ECC_FORMAT_BITS_LOW << 3) | mask;
  let remainder = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if (((remainder >>> i) & 1) !== 0) {
      remainder ^= FORMAT_POLY << (i - 10);
    }
  }
  return ((data << 10) | remainder) ^ FORMAT_MASK;
}

function drawFormatBits(
  modules: boolean[][],
  reserved: boolean[][],
  mask: number
) {
  const size = modules.length;
  const bits = calculateFormatBits(mask);
  const bit = (index: number) => ((bits >>> index) & 1) !== 0;

  for (let i = 0; i <= 5; i += 1) setModule(modules, reserved, 8, i, bit(i));
  setModule(modules, reserved, 8, 7, bit(6));
  setModule(modules, reserved, 8, 8, bit(7));
  setModule(modules, reserved, 7, 8, bit(8));
  for (let i = 9; i < 15; i += 1) {
    setModule(modules, reserved, 14 - i, 8, bit(i));
  }

  for (let i = 0; i < 8; i += 1) {
    setModule(modules, reserved, size - 1 - i, 8, bit(i));
  }
  for (let i = 8; i < 15; i += 1) {
    setModule(modules, reserved, 8, size - 15 + i, bit(i));
  }
  setModule(modules, reserved, 8, size - 8, true);
}

function cloneMatrix(matrix: boolean[][]) {
  return matrix.map((row) => [...row]);
}

function getPenaltyScore(modules: boolean[][]) {
  const size = modules.length;
  let score = 0;

  for (let y = 0; y < size; y += 1) {
    let runColor = modules[y][0];
    let runLength = 1;
    for (let x = 1; x < size; x += 1) {
      if (modules[y][x] === runColor) {
        runLength += 1;
      } else {
        if (runLength >= 5) score += 3 + (runLength - 5);
        runColor = modules[y][x];
        runLength = 1;
      }
    }
    if (runLength >= 5) score += 3 + (runLength - 5);
  }

  for (let x = 0; x < size; x += 1) {
    let runColor = modules[0][x];
    let runLength = 1;
    for (let y = 1; y < size; y += 1) {
      if (modules[y][x] === runColor) {
        runLength += 1;
      } else {
        if (runLength >= 5) score += 3 + (runLength - 5);
        runColor = modules[y][x];
        runLength = 1;
      }
    }
    if (runLength >= 5) score += 3 + (runLength - 5);
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = modules[y][x];
      if (
        modules[y][x + 1] === color &&
        modules[y + 1][x] === color &&
        modules[y + 1][x + 1] === color
      ) {
        score += 3;
      }
    }
  }

  const pattern = [true, false, true, true, true, false, true];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x <= size - pattern.length; x += 1) {
      if (pattern.every((color, i) => modules[y][x + i] === color)) {
        score += 40;
      }
    }
  }
  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y <= size - pattern.length; y += 1) {
      if (pattern.every((color, i) => modules[y + i][x] === color)) {
        score += 40;
      }
    }
  }

  const darkModules = modules.flat().filter(Boolean).length;
  const percent = (darkModules * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

export function createQrCode(text: string): QrCodeMatrix {
  const byteLength = new TextEncoder().encode(text).length;
  const config = selectVersion(byteLength);
  const data = encodeDataCodewords(text, config);
  const ecc = reedSolomonRemainder(data, config.eccCodewords);
  const codewords = [...data, ...ecc];
  const size = config.version * 4 + 17;

  let bestModules: boolean[][] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask += 1) {
    const modules = createMatrix(size, false);
    const reserved = createMatrix(size, false);
    drawFunctionPatterns(modules, reserved, config.version);
    drawCodewords(modules, reserved, codewords, mask);
    drawFormatBits(modules, reserved, mask);
    const score = getPenaltyScore(modules);

    if (score < bestScore) {
      bestModules = modules;
      bestScore = score;
    }
  }

  if (!bestModules) throw new Error("QR render failed");

  return {
    modules: cloneMatrix(bestModules),
    size,
    version: config.version,
  };
}
