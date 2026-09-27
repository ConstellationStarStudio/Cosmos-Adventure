/**
 * PNG Utility — Tank texture generator
 * =====================================
 * Automatically generates cropped tank textures at build time.
 * Called internally by drawFluidTank when height != standard.
 *
 * Handles PNG filter bytes correctly — decodes to raw pixels
 * then re-encodes with filter=None for safe row rearrangement.
 */
import * as fs from "fs";
import * as zlib from "zlib";

// ── CRC32 (required by PNG spec) ────────────────────────────────
const crcTable: Uint32Array = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	crcTable[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
	let crc = 0xffffffff;
	for (let i = 0; i < buf.length; i++) crc = (crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
	return (crc ^ 0xffffffff) >>> 0;
}

// ── PNG decode/encode ───────────────────────────────────────────

export interface RawImage {
	w: number;
	h: number;
	bitDepth: number;
	colorType: number;
	bpp: number;         // bytes per pixel
	pixels: Buffer[];    // decoded pixel rows (NO filter byte, just raw RGBA/RGB/etc.)
}

function paethPredictor(a: number, b: number, c: number): number {
	const p = a + b - c;
	const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
	if (pa <= pb && pa <= pc) return a;
	if (pb <= pc) return b;
	return c;
}

export function decodePng(path: string): RawImage {
	const buf = fs.readFileSync(path);
	let offset = 8; // skip signature
	let ihdr: Buffer | null = null;
	const idatChunks: Buffer[] = [];

	while (offset < buf.length) {
		const length = buf.readUInt32BE(offset);
		const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
		const data = buf.subarray(offset + 8, offset + 8 + length);
		if (type === "IHDR") ihdr = Buffer.from(data);
		if (type === "IDAT") idatChunks.push(Buffer.from(data));
		if (type === "IEND") break;
		offset += 12 + length;
	}
	if (!ihdr) throw new Error(`No IHDR in ${path}`);

	const w = ihdr.readUInt32BE(0);
	const h = ihdr.readUInt32BE(4);
	const bitDepth = ihdr[8];
	const colorType = ihdr[9];
	const bpp = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[colorType] * (bitDepth / 8);
	const stride = w * bpp; // raw pixel bytes per row (no filter byte)

	const raw = zlib.inflateSync(Buffer.concat(idatChunks));
	const filteredStride = 1 + stride; // filter byte + pixel data

	// Decode each row, undoing the PNG filter
	const pixels: Buffer[] = [];
	for (let y = 0; y < h; y++) {
		const filterType = raw[y * filteredStride];
		const scanline = raw.subarray(y * filteredStride + 1, y * filteredStride + 1 + stride);
		const decoded = Buffer.alloc(stride);
		const prev = y > 0 ? pixels[y - 1] : Buffer.alloc(stride); // previous decoded row

		for (let x = 0; x < stride; x++) {
			const a = x >= bpp ? decoded[x - bpp] : 0;             // left pixel
			const b = prev[x];                                      // above pixel
			const c = x >= bpp ? prev[x - bpp] : 0;                // upper-left pixel
			const raw_val = scanline[x];

			switch (filterType) {
				case 0: decoded[x] = raw_val; break;                              // None
				case 1: decoded[x] = (raw_val + a) & 0xff; break;                // Sub
				case 2: decoded[x] = (raw_val + b) & 0xff; break;                // Up
				case 3: decoded[x] = (raw_val + ((a + b) >> 1)) & 0xff; break;   // Average
				case 4: decoded[x] = (raw_val + paethPredictor(a, b, c)) & 0xff; break; // Paeth
				default: throw new Error(`Unknown PNG filter type: ${filterType}`);
			}
		}
		pixels.push(decoded);
	}

	return { w, h, bitDepth, colorType, bpp, pixels };
}

export function encodePng(img: RawImage, rows: Buffer[]): Buffer {
	const h = rows.length;
	const stride = img.w * img.bpp;

	// Re-encode with filter type 0 (None) — safe for rearranged rows
	const filtered = Buffer.alloc(h * (1 + stride));
	for (let y = 0; y < h; y++) {
		filtered[y * (1 + stride)] = 0; // filter = None
		rows[y].copy(filtered, y * (1 + stride) + 1);
	}

	const compressed = zlib.deflateSync(filtered);

	function chunk(type: string, payload: Buffer): Buffer {
		const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), payload]);
		const crcVal = crc32(typeAndData);
		const out = Buffer.alloc(4 + typeAndData.length + 4);
		out.writeUInt32BE(payload.length, 0);
		typeAndData.copy(out, 4);
		out.writeUInt32BE(crcVal, 4 + typeAndData.length);
		return out;
	}

	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(img.w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = img.bitDepth;
	ihdr[9] = img.colorType;

	const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

// ── Public API ──────────────────────────────────────────────────

const TANK_TEX_DIR = "RP/textures/ui/cosmos/machines";

/**
 * Generate cropped tank textures for a given Bedrock panel height.
 * Crop: top border row + bottom (h-1) rows from the 18×40 source.
 * Outputs: tank_back_{h}.png, tank_front_{h}.png
 *
 * @param bedrockHeight Panel height in pixels (Java height + 2 for borders)
 * @returns Texture path strings for use in JSON UI $tank_back_tex / $tank_front_tex
 */
export function ensureTankTextures(bedrockHeight: number, bedrockWidth: number = 18): { back: string; front: string } {
	const suffix = bedrockWidth !== 18 ? `_${bedrockWidth}x${bedrockHeight}` : `_${bedrockHeight}`;
	const backOut = `${TANK_TEX_DIR}/tank_back${suffix}.png`;
	const frontOut = `${TANK_TEX_DIR}/tank_front${suffix}.png`;

	for (const [srcName, outPath] of [["tank_back", backOut], ["tank_front", frontOut]] as const) {
		if (!fs.existsSync(outPath)) {
			const img = decodePng(`${TANK_TEX_DIR}/${srcName}.png`);
			if (bedrockHeight === img.h && bedrockWidth === img.w) continue;
			
			// We only crop vertically for now. Horizontal stretching will be handled by Bedrock rendering.
			let cropped = img.pixels;
			if (bedrockHeight < img.h) {
				cropped = [img.pixels[0], ...img.pixels.slice(img.h - (bedrockHeight - 1))];
			}
			
			fs.writeFileSync(outPath, encodePng(img, cropped));
			console.log(`  ✓ Generated ${outPath} (${img.w}×${bedrockHeight})`);
		}
	}

	return {
		back: `textures/ui/cosmos/machines/tank_back${suffix}`,
		front: `textures/ui/cosmos/machines/tank_front${suffix}`,
	};
}
