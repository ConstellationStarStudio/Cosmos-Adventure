import * as fs from "fs";
import { decodePng, encodePng, RawImage } from "./png_util";

function crop(img: RawImage, x: number, y: number, w: number, h: number): { img: RawImage, rows: Buffer[] } {
	const croppedRows: Buffer[] = [];
	for (let r = 0; r < h; r++) {
		const row = img.pixels[y + r];
		const start = x * img.bpp;
		const end = start + w * img.bpp;
		croppedRows.push(row.subarray(start, end));
	}
	const newImg: RawImage = { ...img, w, h, pixels: croppedRows };
	return { img: newImg, rows: croppedRows };
}

const srcImg = `java_mod/Galacticraft-Legacy-master-1.12/src/main/resources/assets/galacticraftcore/textures/gui/deconstructor.png`;
const outDir = `RP/textures/ui/cosmos/machines`;

const decoded = decodePng(srcImg);

// deconstructor_bar.png: x=53, y=36, w=54, h=17
const bar = crop(decoded, 53, 36, 54, 17);
fs.writeFileSync(`${outDir}/deconstructor_bar.png`, encodePng(bar.img, bar.rows));

// deconstructor_bar_fill.png: x=176, y=13, w=54, h=17
const fill = crop(decoded, 176, 13, 54, 17);
fs.writeFileSync(`${outDir}/deconstructor_bar_fill.png`, encodePng(fill.img, fill.rows));

// deconstructor_on.png: x=176, y=0, w=15, h=13
const onIcon = crop(decoded, 176, 0, 15, 13);
fs.writeFileSync(`${outDir}/deconstructor_on.png`, encodePng(onIcon.img, onIcon.rows));

console.log("Deconstructor textures cropped using native TS power!");
