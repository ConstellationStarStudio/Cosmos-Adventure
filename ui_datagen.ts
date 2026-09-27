/**
 * Machine UI Data Generator — Java-to-Bedrock Compiler
 * =====================================================
 *
 * Write machine GUIs exactly how you would in Java's GuiContainerGC.
 * All Bedrock JSON UI complexity ($use_durability, clips_children,
 * #size_binding_x, routing, UI slot allocation) is black-boxed.
 *
 *   const m = gui("electric_furnace", "Electric Furnace", 157);
 *   m.slot(54, 23);                          // 0: input
 *   m.slot(7, 46, { ghost: "power" });       // 1: battery
 *   m.slot(108, 23);                         // 2: output
 *   m.drawEnergyBar(39, 49);                 // auto → UI slot 3
 *   m.drawProgressBar(77, 23, "electric_furnace");  // auto → UI slot 4
 *   m.drawStatusText(98, 49);                // auto → UI slot 5
 *
 * Run:  npx tsx ui_datagen.ts [--verify] [--dry-run] [--machine <name>]
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// ================================================================
// Texture paths
// ================================================================

const TEX = "textures/ui/cosmos/machines";
const OVERLAY = "textures/ui/cosmos/slot_overlay";

const GHOSTS: Record<string, string> = {
	power: `${OVERLAY}/power`,
	o2: `${OVERLAY}/o2`,
	fuel: `${OVERLAY}/fuel`,
	gear: `${OVERLAY}/gear`,
	shield: `${OVERLAY}/shield`,
	mask: `${OVERLAY}/mask`,
	tank: `${OVERLAY}/tank`,
	head: `${OVERLAY}/head`,
	body: `${OVERLAY}/body`,
	legs: `${OVERLAY}/legs`,
	feet: `${OVERLAY}/feet`,
	parachute: `${OVERLAY}/parachute`,
	frequency: `${OVERLAY}/frequency`,
	silicon: `${OVERLAY}/silicon`,
	// Vanilla item ghost overlays (25% alpha)
	coal: "textures/items/coal",
	diamond: "textures/items/diamond",
	redstone: "textures/items/redstone_dust",
	raw_silicon: "textures/items/raw_silicon",
};

const GHOST_ITEMS = new Set(["coal", "diamond", "redstone", "raw_silicon"]);

// ================================================================
// Progress bar definition builders (low-level, auto-managed)
// ================================================================

function barHorizontal(
	size: [number, number],
	emptyTex: string,
	fillTex: string,
	opts: {
		fillSize?: [number, number];
		fillOffset?: [number, number];
		clipHeight?: number;
		icons?: { name: string; texture: string; size: [number, number]; offset: [number, number]; condition: string }[];
		hover?: boolean;
	} = {}
): any {
	const [fw, fh] = opts.fillSize ?? size;
	const [fx, fy] = opts.fillOffset ?? [0, 0];

	const inner: any[] = [];
	if (opts.icons) {
		for (const ic of opts.icons) {
			inner.push({
				[ic.name]: {
					type: "image", texture: ic.texture, size: ic.size,
					anchor_from: "top_left", anchor_to: "top_left", offset: ic.offset,
					bindings: "$use_durability",
					$source: "#null", $target: "#null", $visible_if: ic.condition,
				},
			});
		}
	}

	// When fillSize is specified with offset, the clip panel uses [1, clipH]
	// because #size_binding_x overrides the width at runtime.
	// When no fillSize, it uses the full bar size for the initial clip.
	const clipW = opts.fillSize ? 1 : fw;
	const clipH = opts.clipHeight ?? fh;

	inner.push({
		progress_fill: {
			type: "panel", clips_children: true, size: [clipW, clipH],
			anchor_to: "top_left", anchor_from: "top_left", offset: [fx, fy],
			bindings: "$use_durability",
			$source: "#data", $target: "#size_binding_x",
			$visible_if: "(not (#data = 1000))",
			controls: [{
				image: {
					anchor_to: "top_left", anchor_from: "top_left",
					type: "image", size: [fw, fh], texture: fillTex,
				},
			}],
		},
	});

	const ctrls: any[] = [{
		"progress@machines.specific_slot": {
			anchor_from: "top_left", anchor_to: "top_left",
			controls: [{
				progress_bar: {
					type: "panel", collection_index: "$index",
					anchor_from: "top_left", anchor_to: "top_left",
					size: [1, 0], controls: inner,
				},
			}],
		},
	}];

	if (opts.hover) ctrls.push({ "hover_text@machines.item_hover": {} });

	return { type: "image", texture: emptyTex, size, controls: ctrls };
}

function barVerticalFlame(): any {
	return {
		type: "image", texture: "textures/ui/flame_empty_image", size: [13, 13],
		controls: [{
			"progress@machines.specific_slot": {
				size: ["100%", "100%"],
				controls: [{
					unit_size: {
						type: "panel", collection_index: "$index",
						anchor_from: "bottom_left", anchor_to: "bottom_left",
						size: [0, 1],
						controls: [{
							clipper: {
								type: "panel", clips_children: true, size: [13, 1],
								anchor_from: "bottom_left", anchor_to: "bottom_left",
								bindings: "$use_durability",
								$source: "#data", $target: "#size_binding_y",
								$visible_if: "(not (#data = 1000))",
								controls: [{
									image: {
										type: "image", texture: "textures/ui/flame_full_image",
										size: [13, 13],
										anchor_to: "bottom_left", anchor_from: "bottom_left",
									},
								}],
							},
						}],
					},
				}],
			},
		}],
	};
}

function barColored(size: [number, number], color: number[]): any {
	return {
		type: "image", texture: `${TEX}/progress_bar`, size,
		controls: [{
			"capacity@machines.specific_slot": {
				anchor_from: "top_left", anchor_to: "top_left",
				controls: [{
					capacity: {
						type: "panel", collection_index: "$index",
						anchor_from: "top_left", anchor_to: "top_left",
						size: [1, 0],
						controls: [{
							capacity: {
								type: "image", texture: `${TEX}/progress_bar_fill`,
								color, size: [1, size[1]],
								anchor_to: "top_left", anchor_from: "top_left",
								bindings: "$use_durability",
								$source: "#data", $target: "#size_binding_x",
								$visible_if: "(not (#data = 1000))",
							},
						}],
					},
				}],
			},
		}],
	};
}

// Pre-built bar types
const BARS: Record<string, { defKey: string; build: () => any }> = {
	electric_furnace: {
		defKey: "electric_furnace_bar",
		build: () => barHorizontal([22, 15], `${TEX}/electric_furnace_bar`, `${TEX}/electric_furnace_bar_fill`),
	},
	compressor: {
		defKey: "progress_bar",
		build: () => barHorizontal([52, 25], `${TEX}/compressor_bar`, `${TEX}/compressor_bar_fill`, {
			fillSize: [52, 17], fillOffset: [0, 9],
			icons: [{ name: "hammering", texture: `${TEX}/compressor_on`, size: [15, 13], offset: [24, 1], condition: "(#data > 26 and not (#data = 1000))" }],
		}),
	},
	circuit_fabricator: {
		defKey: "progress_bar",
		build: () => barHorizontal([53, 12], `${TEX}/progress_bar`, `${TEX}/fabricating`, {
			fillSize: [51, 30], fillOffset: [1, 1], clipHeight: 10, hover: true,
		}),
	},
	burn_time: { defKey: "burn_time", build: barVerticalFlame },
	capacity_green: { defKey: "capacity", build: () => barColored([75, 5], [0, 0.7, 0]) },
	capacity_blue: { defKey: "capacity", build: () => barColored([75, 5], [0.29, 0.63, 0.89]) },
};

// ================================================================
// GuiMachine — write GUIs exactly like Java
// ================================================================

type Anchor = "top_left" | "top_middle" | "top_right";
type BuildFn = () => any;

interface SlotOpts {
	name?: string;
	ghost?: string;
	anchor?: Anchor;
}

export class GuiMachine {
	name: string;
	title: string;
	ySize: number;
	xSize: number;

	protected _slots: { idx: number; name: string; ghost?: string; grid?: boolean }[] = [];
	protected _uiSlotCount = 0;
	protected _content: BuildFn[] = [];
	protected _barDefs: Record<string, any> = {};
	protected _showClose = true;
	protected _showBottomHalf = true;
	protected _showHotbar = true;

	constructor(name: string, title: string, ySize = 166, xSize = 176) {
		this.name = name;
		this.title = title;
		this.ySize = ySize;
		this.xSize = xSize;
	}

	// ── Java API: Container slots ──────────────────────────────

	/** Java: addSlotToContainer(new Slot(tileEntity, index, x, y)) */
	slot(x: number, y: number, opts: SlotOpts = {}): number {
		const idx = this._slots.length;
		const name = opts.name ?? `slot_${idx}`;
		const anchor = opts.anchor ?? "top_left";
		this._slots.push({ idx, name, ghost: opts.ghost });

		this._content.push(() => {
			const props: any = {
				$index: idx,
				anchor_from: anchor, anchor_to: anchor,
				offset: [x, y],
			};
			if (opts.ghost) {
				props.$overlay_texture = GHOSTS[opts.ghost] ?? opts.ghost;
				if (GHOST_ITEMS.has(opts.ghost) || (props.$overlay_texture as string).includes("textures/items/"))
					props.$overlay_alpha = 0.25;
			}
			return { [`${name}@machines.item_slot`]: props };
		});
		return idx;
	}

	/** Java: 9× addSlotToContainer in a double for-loop */
	slotGrid(x: number, y: number, cols = 3, rows = 3, opts: { name?: string; anchor?: Anchor } = {}): number {
		const start = this._slots.length;
		for (let r = 0; r < rows; r++)
			for (let c = 0; c < cols; c++)
				this._slots.push({ idx: start + r * cols + c, name: `grid_${r}_${c}`, grid: true });

		const name = opts.name ?? "input_grid";
		const anchor = opts.anchor ?? "top_left";
		const size = [cols * 18, rows * 18];

		this._content.push(() => ({
			[`${name}@machines.item_grid`]: {
				size, grid_dimensions: [cols, rows],
				anchor_from: anchor, anchor_to: anchor, offset: [x, y],
			},
		}));
		return start;
	}

	// ── Java API: Draw calls (auto-allocate UI slots) ──────────

	private _uiSlot(): number {
		return this._slots.length + this._uiSlotCount++;
	}

	/** Java: int scale = getScaledElecticalLevel(55); drawTexturedModalRect(...) */
	drawEnergyBar(x: number, y: number, anchor: Anchor = "top_left"): number {
		const idx = this._uiSlot();
		this._content.push(() => ({
			"energy_bar@machines.energy_bar": { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
		return idx;
	}

	/** Java: drawColorModalRect vertical energy bar (8px wide, 66px tall, fills bottom-to-top) */
	drawVerticalEnergyBar(x: number, y: number, anchor: Anchor = "top_left"): number {
		const idx = this._uiSlot();
		this._content.push(() => ({
			"energy_bar@machines.energy_bar_vertical": { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
		return idx;
	}

	/** Java: int scale = getCappedScaledOxygenLevel(55); drawTexturedModalRect(...) */
	drawOxygenBar(x: number, y: number, anchor: Anchor = "top_left"): number {
		const idx = this._uiSlot();
		this._content.push(() => ({
			"oxygen_bar@machines.oxygen_bar": { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
		return idx;
	}

	/** Java: drawTexturedModalRect for progress with scaled value */
	drawProgressBar(x: number, y: number, barType: string, opts: { name?: string; anchor?: Anchor } = {}): number {
		const idx = this._uiSlot();
		const name = opts.name ?? "progress";
		const anchor = opts.anchor ?? "top_left";

		if (!(barType in BARS)) throw new Error(`Unknown bar type: ${barType}. Available: ${Object.keys(BARS).join(", ")}`);
		const { defKey, build } = BARS[barType];
		this._barDefs[defKey] = build();
		const ref = `${this.name}.${defKey}`;

		this._content.push(() => ({
			[`${name}@${ref}`]: { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
		return idx;
	}

	/** Reuse another machine's bar (e.g. electric_compressor → compressor.progress_bar) */
	drawProgressBarRef(x: number, y: number, ref: string, opts: { name?: string; anchor?: Anchor } = {}): number {
		const idx = this._uiSlot();
		const name = opts.name ?? "progress";
		const anchor = opts.anchor ?? "top_left";
		this._content.push(() => ({
			[`${name}@${ref}`]: { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
		return idx;
	}

	/** Java: drawTexturedModalRect for vertical flame (burn time) */
	drawBurnTime(x: number, y: number, opts: { name?: string; anchor?: Anchor } = {}): number {
		const idx = this._uiSlot();
		const name = opts.name ?? "burn_time";
		const anchor = opts.anchor ?? "top_left";
		this._barDefs.burn_time = barVerticalFlame();
		this._content.push(() => ({
			[`${name}@${this.name}.burn_time`]: { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
		return idx;
	}

	/** Java: drawTexturedModalRect for tank area. Height defaults to 38 (standard). */
	drawFluidTank(x: number, y: number, liquid: string, opts: { name?: string; anchor?: Anchor; width?: number; height?: number } = {}): number {
		const idx = this._uiSlot();
		const name = opts.name ?? `${liquid}_tank`;
		const anchor = opts.anchor ?? "top_left";
		const javaWidth = opts.width ?? 16;
		const javaHeight = opts.height ?? 38;       // Java GuiElementInfoRegion height
		const bedrockWidth = javaWidth + 2;
		const bedrockHeight = javaHeight + 2;        // +2 for border pixels

		const props: any = { $liquid: liquid, $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] };

		if (bedrockHeight !== 40 || bedrockWidth !== 18) {
			// Non-standard size: generate textures at build time, pass overrides
			const { ensureTankTextures } = require("./png_util");
			const tex = ensureTankTextures(bedrockHeight, bedrockWidth);
			props.$tank_width = bedrockWidth;
			props.$tank_size = [`${bedrockWidth}px`, `${bedrockHeight}px`];
			props.$tank_back_tex = tex.back;
			props.$tank_front_tex = tex.front;
		}

		this._content.push(() => ({
			[`${name}@machines.fluid_tank`]: props,
		}));
		return idx;
	}

	/** Dynamic fluid tank (reads liquid type from texture atlas). Uses 2 UI slots. */
	drawDynamicFluidTank(x: number, y: number, opts: { name?: string; anchor?: Anchor } = {}): number {
		const idx = this._uiSlot();
		const texIdx = this._uiSlot();
		const name = opts.name ?? `tank_${idx}`;
		const anchor = opts.anchor ?? "top_left";
		this._content.push(() => ({
			[`${name}@machines.any_fluid_tank`]: { $index: idx, $texture_index: texIdx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
		return idx;
	}

	/** Colored capacity meter */
	drawCapacityBar(x: number, y: number, opts: { color?: number[]; size?: [number, number]; name?: string; anchor?: Anchor } = {}): number {
		const idx = this._uiSlot();
		const name = opts.name ?? "capacity";
		const anchor = opts.anchor ?? "top_left";
		this._barDefs.capacity = barColored(opts.size ?? [75, 5], opts.color ?? [0, 0.7, 0]);
		this._content.push(() => ({
			[`${name}@${this.name}.capacity`]: { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
		return idx;
	}

	/** Solar panel sun indicator */
	drawSolarIcon(x: number, y: number, opts: { name?: string; anchor?: Anchor } = {}): number {
		const idx = this._uiSlot();
		const name = opts.name ?? "solar_icon";
		const anchor = opts.anchor ?? "top_left";
		this._content.push(() => ({
			[`${name}@machines.solar_icon`]: { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
		return idx;
	}

	// ── Java API: Text ─────────────────────────────────────────

	/** Java: fontRenderer.drawString(dynamicStatus, x, y, color) — runtime-updated text */
	drawStatusText(x: number, y: number, opts: { name?: string; anchor?: Anchor; scale?: number } = {}): number {
		const idx = this._uiSlot();
		const name = opts.name ?? "status";
		const anchor = opts.anchor ?? "top_left";
		const props: any = { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] };
		if (opts.scale != null) props.$text_font_scale = opts.scale;
		this._content.push(() => ({
			[`${name}@machines.item_text`]: props,
		}));
		return idx;
	}

	/** Java: fontRenderer.drawString("literal", x, y, color) — static text */
	drawString(text: string, x: number, y: number, opts: { name?: string; anchor?: Anchor; color?: any; layer?: number; scale?: number } = {}) {
		const name = opts.name ?? text.toLowerCase().replace(/[\s:\/]/g, "_").slice(0, 20);
		const anchor = opts.anchor ?? "top_left";
		const props: any = {
			type: "label", text,
			color: opts.color ?? "$title_text_color",
			anchor_from: anchor, anchor_to: anchor, offset: [x, y],
		};
		if (opts.layer != null) props.layer = opts.layer;
		if (opts.scale != null) props.font_scale_factor = opts.scale;
		this._content.push(() => ({ [name]: props }));
	}

	/** Java: fontRenderer.drawString(getName(), x, y, color) */
	drawTitle(x?: number, y?: number, opts: { text?: string; anchor?: Anchor } = {}) {
		const text = opts.text ?? this.title;
		const anchor = opts.anchor ?? "top_left";
		if (x == null && y == null) {
			x = anchor === "top_middle" ? 0 : 10;
			y = 5;
		}
		const props: any = {
			type: "label", text,
			color: "$title_text_color",
			anchor_from: anchor, anchor_to: anchor,
			offset: [x ?? 0, y ?? 0],
		};
		// Insert title right after any close button (which should come first)
		const insertIdx = this._content.length > 0 && !this._showClose ? 1 : 0;
		this._content.splice(insertIdx, 0, () => ({ title: props }));
	}

	drawPlayerInventory(x: number, y: number, opts: { name?: string; anchor?: Anchor; size?: [number, number] } = {}) {
		this._showBottomHalf = false;
		const name = opts.name ?? "player_inventory";
		const anchor = opts.anchor ?? "top_left";
		const props: any = { anchor_from: anchor, anchor_to: anchor, offset: [x, y] };
		if (opts.size) props.size = opts.size;
		this._content.push(() => ({
			[`${name}@common.inventory_panel_bottom_half_with_label`]: props
		}));
	}

	/** Manually position the hotbar grid (hides the default template hotbar). Only works with dynamic_interface_large. */
	drawHotbar(x: number, y: number, opts: { name?: string; anchor?: Anchor; size?: [number, number] } = {}) {
		this._showHotbar = false;
		const name = opts.name ?? "player_hotbar";
		const anchor = opts.anchor ?? "top_left";
		const props: any = { anchor_from: anchor, anchor_to: anchor, offset: [x, y] };
		if (opts.size) props.size = opts.size;
		this._content.push(() => ({
			[`${name}@common.hotbar_grid_template`]: props
		}));
	}

	// ── Java API: Buttons & Controls ───────────────────────────

	/** Java: buttonList.add(new GuiButton(id, x, y, w, h, text)) */
	addButton(x: number, y: number, opts: { name?: string; anchor?: Anchor; width?: number; height?: number; fontScale?: number } = {}): number {
		const idx = this._uiSlot();
		const name = opts.name ?? "start_button";
		const anchor = opts.anchor ?? "top_left";
		const w = opts.width ?? 75;
		const h = opts.height ?? 18;
		const props: any = { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y], $button_size: [w, h] };
		if (opts.fontScale != null) props.$button_font_scale = opts.fontScale;
		this._content.push(() => ({
			[`${name}@machines.machine_button`]: props,
		}));
		return idx;
	}

	/** Java: GuiElementTextBox */
	addTextBox(x: number, y: number, opts: { name?: string; anchor?: Anchor; width?: number; height?: number; fontScale?: number } = {}): number {
		const idx = this._uiSlot();
		const name = opts.name ?? "textbox";
		const anchor = opts.anchor ?? "top_left";
		const w = opts.width ?? 75;
		const h = opts.height ?? 18;
		const props: any = { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y], $button_size: [w, h] };
		if (opts.fontScale != null) props.$button_font_scale = opts.fontScale;
		this._content.push(() => ({
			[`${name}@machines.machine_textbox`]: props,
		}));
		return idx;
	}

	/** Java: new GuiElementCheckbox(id, this, x, y, text) */
	addCheckbox(x: number, y: number, opts: { name?: string; anchor?: Anchor } = {}): number {
		const idx = this._uiSlot();
		const name = opts.name ?? "toggle";
		const anchor = opts.anchor ?? "top_left";
		this._content.push(() => ({
			[`${name}@machines.machine_toggle`]: { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
		return idx;
	}

	/** A display-only UI slot for showing color selection or other visual items */
	drawColorSelector(x: number, y: number, opts: { name?: string; anchor?: Anchor } = {}): number {
		const idx = this._uiSlot();
		const name = opts.name ?? "color_selector";
		const anchor = opts.anchor ?? "top_left";
		this._content.push(() => ({
			[`${name}@machines.item_slot`]: { $index: idx, anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
		return idx;
	}

	// ── Decorative ─────────────────────────────────────────────

	drawLine(x: number, y: number, w: number, h: number, opts: { color?: number[]; name?: string; anchor?: Anchor } = {}) {
		const name = opts.name ?? "line";
		const anchor = opts.anchor ?? "top_left";
		this._content.push(() => ({
			[name]: {
				type: "image", texture: "textures/white", fill: true,
				color: opts.color ?? [0.5, 0.5, 0.5], size: [w, h],
				anchor_from: anchor, anchor_to: anchor, offset: [x, y],
			},
		}));
	}

	drawImage(texture: string, x: number, y: number, w: number, h: number, opts: { name?: string; anchor?: Anchor } = {}) {
		const name = opts.name ?? "background";
		const anchor = opts.anchor ?? "top_left";
		this._content.push(() => ({
			[name]: { type: "image", texture, size: [w, h], anchor_from: anchor, anchor_to: anchor, offset: [x, y] },
		}));
	}

	drawCraftingArrow(x: number, y: number, opts: { name?: string; anchor?: Anchor; flip?: boolean } = {}) {
		const name = opts.name ?? "arrow";
		const anchor = opts.anchor ?? "top_left";
		const props: any = { anchor_from: anchor, anchor_to: anchor, offset: [x, y] };
		if (opts.flip) props.size = [-22, 15];
		else props.size = [22, 15];
		this._content.push(() => ({ [`${name}@crafting.crafting_arrow_large`]: props }));
	}

	closeButton(x: number, y: number, opts: { name?: string } = {}) {
		const name = opts.name ?? "close";
		// Close button is always the first element (before title)
		this._content.unshift(() => ({ [`${name}@common.close_button`]: { offset: [x, y] } }));
	}

	hideCloseButton() { this._showClose = false; return this; }

	// ── Build (compiles Java → Bedrock JSON) ───────────────────

	build(): any {
		const result: any = { namespace: this.name };
		const iface: any = {};
		if (this.ySize !== 166) iface.$size = ["100%", this.ySize];
		if (!this._showClose) iface.$show_close_button = false;
		if (!this._showBottomHalf) iface.$show_bottom_half = false;
		if (!this._showHotbar) iface.$show_hotbar = false;
		iface.$content = this._content.map((fn) => fn());
		const ifaceName = this.xSize > 176 ? "interface@machines.dynamic_interface_large" : "interface@machines.dynamic_interface";
		result[ifaceName] = iface;
		for (const [k, v] of Object.entries(this._barDefs)) result[k] = v;
		return result;
	}

	encodedName(): string { return "§" + this.name.split("").join("§"); }

	routingEntry(): any {
		return {
			requires: `(not (($ct - '${this.encodedName()}') = $ct))`,
			$screen_content: `${this.name}.interface`,
			$screen_bg_content: "common.screen_background",
			$screen_background_alpha: 0.4,
		};
	}

	totalSlots(): number { return this._slots.length + this._uiSlotCount; }

	scriptHint(): string {
		const lines = [
			`// === ${this.name} (${this.totalSlots()} total slots) ===`,
			`// REAL SLOTS:`,
		];
		for (const s of this._slots) {
			if (s.grid) continue;
			lines.push(`//   [${String(s.idx).padStart(2)}] ${s.name}${s.ghost ? ` (ghost: ${s.ghost})` : ""}`);
		}
		const uiStart = this._slots.length;
		const uiEnd = uiStart + this._uiSlotCount - 1;
		lines.push(`// UI SLOTS:`);
		if (this._uiSlotCount > 0) {
			lines.push(`//   [${String(uiStart).padStart(2)}..${String(uiEnd).padStart(2)}] (${this._uiSlotCount} auto-allocated)`);
			lines.push(`//   container.add_ui_display(slot, text, durabilityValue)`);
		}
		return lines.join("\n");
	}
}

// ================================================================
// GuiParameterized — tier variants sharing one layout
// ================================================================

class GuiParameterized extends GuiMachine {
	private _variants: [string, Record<string, any>][] = [];

	addVariant(variantName: string, params: Record<string, any>) {
		this._variants.push([variantName, params]);
		return this;
	}

	build(): any {
		const result: any = { namespace: this.name };
		for (const [vname, params] of this._variants) {
			const alias: any = {};
			for (const [k, v] of Object.entries(params)) alias[`$${k}`] = v;
			result[`${vname}@${this.name}.interface`] = alias;
		}
		const iface: any = {};
		if (this.ySize !== 166) iface.$size = ["100%", this.ySize];
		if (!this._showClose) iface.$show_close_button = false;
		if (!this._showBottomHalf) iface.$show_bottom_half = false;
		iface.$content = this._content.map((fn) => fn());
		result["interface@machines.dynamic_interface"] = iface;
		for (const [k, v] of Object.entries(this._barDefs)) result[k] = v;
		return result;
	}
}

// ================================================================
// Shorthand factory
// ================================================================

export function gui(name: string, title: string, ySize = 166, xSize = 176): GuiMachine {
	return new GuiMachine(name, title, ySize, xSize);
}

function guiParameterized(name: string, title: string, ySize = 166): GuiParameterized {
	return new GuiParameterized(name, title, ySize);
}

// ================================================================
// Registry
// ================================================================

export class MachineRegistry {
	machines: GuiMachine[] = [];
	constructor(public outputDir = "RP/ui/machines") {}

	add<T extends GuiMachine>(machine: T): T {
		this.machines.push(machine);
		return machine;
	}

	generate(opts: { write?: boolean; patch?: boolean } = {}) {
		const { write = true, patch = true } = opts;
		const results: { name: string; path: string; json: any; routing: any; uiDef: string; hints: string }[] = [];

		for (const m of this.machines) {
			const data = m.build();
			const path = join(this.outputDir, `${m.name}.json`);
			if (write) {
				mkdirSync(dirname(path), { recursive: true });
				writeFileSync(path, JSON.stringify(data, null, "\t") + "\n");
				console.log(`  ✓ ${m.name}.json`);
			}
			results.push({
				name: m.name, path, json: data,
				routing: m.routingEntry(),
				uiDef: `ui/machines/${m.name}.json`,
				hints: m.scriptHint(),
			});
		}

		if (results.length) {
			console.log("\n// chest_screen.json routing:");
			for (const r of results) console.log(JSON.stringify(r.routing, null, 4) + ",");
			console.log("\n// _ui_defs.json entries:");
			for (const r of results) console.log(`  "${r.uiDef}",`);
			console.log("\n// Script-side slot maps:");
			for (const r of results) console.log(r.hints + "\n");
		}

		if (patch && write) this._patchDefs(results);
		return results;
	}

	private _patchDefs(results: { uiDef: string }[]) {
		const defsPath = join(dirname(this.outputDir), "_ui_defs.json");
		if (!existsSync(defsPath)) return;
		const defs = JSON.parse(readFileSync(defsPath, "utf-8"));
		const entries: string[] = defs.ui_defs ?? [];
		let changed = false;
		for (const r of results) {
			if (!entries.includes(r.uiDef)) { entries.push(r.uiDef); changed = true; }
		}
		for (const c of CELESTIAL_FILES) {
			if (!entries.includes(c)) { entries.push(c); changed = true; }
		}
		if (changed) {
			defs.ui_defs = entries;
			writeFileSync(defsPath, JSON.stringify(defs, null, 2) + "\n");
			console.log("  ✓ _ui_defs.json patched");
		}
	}
}

export const CELESTIAL_FILES = [
	"ui/celestial/celestial_base.json",
	"ui/celestial/solar_system_map.json",
	"ui/celestial/planet_views.json",
	"ui/celestial/station_recipe_panel.json",
	"ui/celestial/station_list_panel.json",
];

export function verifyCelestialFiles(rootDir = "."): { ok: boolean; errors: string[] } {
	const errors: string[] = [];
	const celestialSubFiles = [
		"celestial_base",
		"solar_system_map",
		"planet_views",
		"station_recipe_panel",
		"station_list_panel"
	];
	for (const name of celestialSubFiles) {
		const fullPath = join(rootDir, "RP/ui/celestial", `${name}.json`);
		if (!existsSync(fullPath)) {
			errors.push(`Missing celestial file: ${fullPath}`);
		} else {
			try {
				const content = readFileSync(fullPath, "utf-8");
				JSON.parse(content);
				console.log(`  ✓ celestial/${name}.json`);
			} catch (e: any) {
				errors.push(`Invalid JSON in ${fullPath}: ${e.message}`);
			}
		}
	}
	const defsPath = join(rootDir, "RP/ui/_ui_defs.json");
	if (existsSync(defsPath)) {
		try {
			const defs = JSON.parse(readFileSync(defsPath, "utf-8"));
			const entries: string[] = defs.ui_defs ?? [];
			for (const f of CELESTIAL_FILES) {
				if (!entries.includes(f)) {
					errors.push(`_ui_defs.json missing entry: ${f}`);
				}
			}
		} catch (e: any) {
			errors.push(`Invalid _ui_defs.json: ${e.message}`);
		}
	}
	return { ok: errors.length === 0, errors };
}

// ================================================================
// ALL MACHINES — written like Java GUI classes
// ================================================================
async function defineAll(): Promise<MachineRegistry> {
	const reg = new MachineRegistry();
	let m: GuiMachine;

	(await import("./machines/chromatic_applicator")).register(reg);
	(await import("./machines/short_range_telepad")).register(reg);
	(await import("./machines/launch_controller")).register(reg);
	(await import("./machines/advanced_launch_controller")).register(reg);
	(await import("./machines/solar_array_controller")).register(reg);

	// ── Coal Generator (GuiCoalGenerator, ySize=166) ───────────
	m = reg.add(gui("coal_generator", "Coal Generator"));
	m.drawTitle(0, 5, { anchor: "top_middle" });
	m.slot(-50, 33, { name: "coal_input", ghost: "coal", anchor: "top_middle" });
	m.drawCraftingArrow(-20, 33, { anchor: "top_middle" });
	m.drawStatusText(85, 33, { name: "heat_and_power" });

	// ── Electric Furnace (GuiElectricFurnace, ySize=157) ───────
	m = reg.add(gui("electric_furnace", "Electric Furnace", 157));
	m.drawTitle(0, 4, { anchor: "top_middle" });
	m.slot(54, 23, { name: "input" });
	m.slot(7, 46, { name: "battery_slot", ghost: "power" });
	m.slot(108, 23, { name: "output" });
	m.drawEnergyBar(39, 49);
	m.drawProgressBar(77, 23, "electric_furnace");
	m.drawStatusText(98, 49);

	// ── Electric Arc Furnace (Tier 2/Double output) ────────────
	m = reg.add(gui("electric_arc_furnace", "Electric Arc Furnace", 157));
	m.drawTitle(0, 4, { anchor: "top_middle" });
	m.slot(54, 23, { name: "input" });
	m.slot(7, 46, { name: "battery_slot", ghost: "power" });
	m.slot(108, 23, { name: "output1" });
	m.slot(130, 23, { name: "output2" }); // second output slot offset to the right
	m.drawEnergyBar(39, 49);
	m.drawProgressBar(77, 23, "electric_furnace");
	m.drawStatusText(98, 49);

	// ── Compressor (GuiIngotCompressor, ySize=192) ─────────────
	m = reg.add(gui("compressor", "Compressor", 192));
	m.drawTitle(10, 5);
	m.slotGrid(18, 17);
	m.slot(54, 74, { name: "fuel_slot", ghost: "coal" });
	m.drawString("Fuel:", 27, 79, { name: "fuel_text", layer: 2 });
	m.slot(137, 37, { name: "output_slot" });
	m.drawBurnTime(81, 28);                              // UI slot 11
	m.drawProgressBar(77, 28, "compressor");              // UI slot 12
	m.drawStatusText(97, 70);                             // UI slot 13

	// ── Electric Compressor (GuiElectricIngotCompressor, ySize=199) ─
	m = reg.add(gui("electric_compressor", "Electric Compressor", 199));
	m.drawTitle(10, 5);
	m.slotGrid(18, 17);
	m.slot(54, 74, { name: "battery_slot", ghost: "power" });
	m.slot(137, 28, { name: "output1" });
	m.slot(137, 46, { name: "output2" });
	m.drawEnergyBar(17, 95);
	m.drawProgressBarRef(77, 28, "compressor.progress_bar");
	m.drawStatusText(78, 75);

	// ── Advanced Compressor (Tier 2/Faster) ────────────────────
	m = reg.add(gui("advanced_compressor", "Advanced Compressor", 199));
	m.drawTitle(10, 5);
	m.slotGrid(18, 17);
	m.slot(54, 74, { name: "battery_slot", ghost: "power" });
	m.slot(137, 28, { name: "output1" });
	m.slot(137, 46, { name: "output2" });
	m.drawEnergyBar(17, 95);
	m.drawProgressBarRef(77, 28, "compressor.progress_bar");
	m.drawStatusText(78, 75);

	// ── Circuit Fabricator (GuiCircuitFabricator, ySize=192) ───
	m = reg.add(gui("circuit_fabricator", "Circuit Fabricator", 192));
	m.drawTitle(10, 5);
	m.drawImage(`${TEX}/circuit_fabricator_background`, 14, 16, 155, 87);
	m.slot(14, 16, { name: "diamond_input", ghost: "diamond" });
	m.slot(73, 45, { name: "silicon_input1", ghost: "raw_silicon" });
	m.slot(73, 63, { name: "silicon_input2", ghost: "raw_silicon" });
	m.slot(121, 45, { name: "redstone_input", ghost: "redstone" });
	m.slot(144, 19, { name: "input_slot" });
	m.slot(5, 68, { name: "battery_slot", ghost: "power" });
	m.slot(151, 85, { name: "output_slot" });
	m.drawEnergyBar(17, 88);
	m.drawProgressBar(87, 19, "circuit_fabricator");
	m.drawStatusText(92, 80);

	// ── Energy Storage (Module + Cluster variants) ─────────────
	const es = reg.add(guiParameterized("energy_storage", "Energy Storage"));
	es.addVariant("module_interface", { title: "Energy Storage Module", maxPower: "Max Output: 300 gJ/t" });
	es.addVariant("cluster_interface", { title: "Energy Storage Cluster", maxPower: "Max Output: 1,800 gJ/t" });
	es.drawTitle(0, 5, { text: "$title", anchor: "top_middle" });
	es.slot(32, 23, { name: "output_battery", ghost: "power" });
	es.slot(32, 47, { name: "input_battery", ghost: "power" });
	es.drawCraftingArrow(76, 25, { name: "output_arrow", flip: true });
	es.drawCraftingArrow(54, 48, { name: "input_arrow" });
	es.drawStatusText(88, 25, { name: "stored_energy" });
	es.drawCapacityBar(88, 51);
	es.drawString("$maxPower", -10, 64, { name: "maxPower", anchor: "top_right" });

	// ── Refinery (GuiRefinery, ySize=168) ──────────────────────
	m = reg.add(gui("refinery", "Refinery", 168));
	m.hideCloseButton();
	m.closeButton(-22, 2);
	m.drawTitle(0, 10, { anchor: "top_middle" });
	m.slot(6, 6, { name: "input" });
	m.slot(37, 50, { name: "battery", ghost: "power" });
	m.slot(-6, 6, { name: "output", anchor: "top_right" });
	m.drawEnergyBar(62, 16);
	m.drawFluidTank(6, 27, "oil");
	m.drawFluidTank(-6, 27, "fuel", { anchor: "top_right" });
	m.drawStatusText(60, 50);
	m.addButton(49, 28);

	// ── Fuel Loader (GuiFuelLoader, ySize=168) ─────────────────
	m = reg.add(gui("fuel_loader", "Fuel Loader", 168));
	m.drawTitle(0, 5, { anchor: "top_middle" });
	m.slot(6, 6, { name: "input" });
	m.slot(50, 49, { name: "battery", ghost: "power" });
	m.drawEnergyBar(112, 60);
	m.drawFluidTank(6, 27, "fuel");
	m.drawStatusText(28, 17);
	m.addButton(90, 36);

	// ── Gas Liquefier ──────────────────────────────────────────
	m = reg.add(gui("gas_liquefier", "Gas Liquefier", 168));
	m.drawTitle(40, 5);
	m.slot(6, 6, { name: "gas_input" });
	m.slot(33, 49, { name: "battery_slot", ghost: "power" });
	m.slot(131, 6, { name: "liquid_output" });
	m.drawDynamicFluidTank(6, 27, { name: "gas_tank" });
	m.drawDynamicFluidTank(131, 27, { name: "liquid_tank" });
	m.drawEnergyBar(41, 16);
	m.drawStatusText(60, 50);
	m.addButton(39, 28);

	// ── Oxygen Collector (GuiOxygenCollector, ySize=180) ───────
	m = reg.add(gui("oxygen_collector", "Oxygen Collector", 180));
	m.drawTitle(10, 4);
	m.drawLine(78, 18, 1, 24);
	m.drawString("Out:", 3.5, -64, { name: "out" });
	m.drawString("In:", 6, -51, { name: "in" });
	m.slot(32, 23.2, { name: "battery_slot", ghost: "power" });
	m.drawEnergyBar(53, -51);
	m.drawOxygenBar(53, -64);
	m.drawStatusText(0, 45, { anchor: "top_middle" });
	m.drawStatusText(0, 55, { name: "collecting", anchor: "top_middle" });

	// ── Oxygen Compressor (GuiOxygenCompressor, ySize=180) ─────
	m = reg.add(gui("oxygen_compressor", "Oxygen Compressor", 180));
	m.drawTitle(10, 4);
	m.drawLine(78, 18, 1, 24);
	m.drawString("In:", 6, -64, { name: "in_2" });
	m.drawString("In:", 6, -51, { name: "in" });
	m.slot(18.2, 23.2, { name: "canister_slot", ghost: "o2" });
	m.slot(48, 23.2, { name: "battery_slot", ghost: "power" });
	m.slot(53, -14, { name: "tank_slot" });
	m.drawEnergyBar(53, -51);
	m.drawOxygenBar(53, -64);
	m.drawStatusText(0, 45, { anchor: "top_middle" });
	m.drawString("Oxygen Use: 40/s", 0, 55, { name: "oxygen_using", anchor: "top_middle" });

	// ── Oxygen Decompressor (GuiOxygenDecompressor, ySize=180) ─
	m = reg.add(gui("oxygen_decompressor", "Oxygen Decompressor", 180));
	m.drawTitle(10, 4);
	m.drawLine(78, 18, 1, 24);
	m.drawString("In:", 6, -64, { name: "in" });
	m.drawString("Out:", 3.5, -51, { name: "out" });
	m.slot(32, 23.2, { name: "battery_slot", ghost: "power" });
	m.slot(53, -14, { name: "tank_slot" });
	m.drawEnergyBar(53, -51);
	m.drawOxygenBar(53, -64);
	m.drawStatusText(0, 45, { anchor: "top_middle" });
	m.drawString("Max Output: 2000/s", 0, 55, { name: "oxygen_using", anchor: "top_middle" });

	// ── Oxygen Distributor (GuiOxygenDistributor, ySize=181) ───
	m = reg.add(gui("oxygen_distributor", "Oxygen Distributor", 181));
	m.drawTitle(10, 4);
	m.drawLine(78, 18, 1, 24);
	m.drawString("In:", 6, 19, { name: "in_2", anchor: "top_middle" });
	m.drawString("In:", 6, 32, { name: "in", anchor: "top_middle" });
	m.slot(16, 21, { name: "oxygen_slot", ghost: "o2" });
	m.slot(46, 21, { name: "battery_slot", ghost: "power" });
	m.drawOxygenBar(112, 19);
	m.drawEnergyBar(112, 32);
	m.drawStatusText(0, 45, { anchor: "top_middle" });
	m.drawString("Oxygen Use: 160/s", 0, 55, { name: "oxygen_using", anchor: "top_middle" });
	m.addCheckbox(85, 82, { name: "bubble_button" });
	m.drawString("Bubble Visible", 101, 85, { name: "bubble_text" });

	// ── Oxygen Storage (GuiOxygenStorageModule, ySize=166) ─────
	m = reg.add(gui("oxygen_storage", "Oxygen Storage Module"));
	m.drawTitle(0, 6, { anchor: "top_middle" });
	m.slot(16, 24, { name: "canister_slot", ghost: "o2" });
	m.drawStatusText(0, 33, { name: "stored_oxygen", anchor: "top_middle" });
	m.drawCapacityBar(0, 56, { color: [0.29, 0.63, 0.89], anchor: "top_middle" });
	m.drawString("Max Output: 10000/s", 0, 64, { name: "max_output", anchor: "top_middle" });

	// ── Solar Panel (GuiSolar, ySize=201) ──────────────────────
	m = reg.add(gui("solar_panel", "Basic Solar Panel", 201));
	m.drawTitle(0, 5, { anchor: "top_middle" });
	m.slot(-7, 82, { name: "battery_slot", ghost: "power", anchor: "top_right" });
	m.drawEnergyBar(96, 24);
	m.drawSolarIcon(47, 20);
	m.drawStatusText(0, 49, { name: "generating", anchor: "top_middle" });
	m.drawStatusText(0, 59, { anchor: "top_middle" });
	m.drawStatusText(0, 69, { name: "boost", anchor: "top_middle" });
	m.addButton(0, 82, { anchor: "top_middle" });

	// ── Water Electrolyzer (GuiWaterElectrolyzer, ySize=168) ───
	(await import("./machines/water_electrolyzer")).register(reg);

	// ── Methane Synthesizer ───────────
	(await import("./machines/methane_synthesizer")).register(reg);

	// ── Cargo Loader ───────────
	(await import("./machines/cargo_loader")).register(reg);

	// ── Cargo Unloader ───────────
	(await import("./machines/cargo_unloader")).register(reg);

	// ── Deconstructor ───────────
	(await import("./machines/deconstructor")).register(reg);

	// ── Oxygen Sealer ───────────
	(await import("./machines/oxygen_sealer")).register(reg);

	// ── Astro Miner Dock ───────────
	(await import("./machines/astro_miner_dock")).register(reg);

	// ── Terraformer ───────────
	(await import("./machines/terraformer")).register(reg);

	// ── Geothermal Generator ───────────
	(await import("./machines/geothermal_generator")).register(reg);

	m = reg.add(gui("airlock_controller", "Airlock Controller", 139, 181));
	m["_showBottomHalf"] = false;
	m["_showHotbar"] = false;
	m.drawTitle(0, 5, { anchor: "top_middle" });
	m.addButton(10, 20, { name: "redstone", width: 161, height: 18 });
	m.addButton(10, 40, { name: "distance", width: 161, height: 18 });
	m.addButton(10, 60, { name: "distance_value", width: 161, height: 18 });
	m.addButton(10, 80, { name: "owner_only", width: 161, height: 18 });
	m.addButton(10, 100, { name: "invert", width: 78, height: 18 });
	m.addButton(93, 100, { name: "horizontal", width: 78, height: 18 });

	return reg;
}

// ================================================================
// CLI (only runs when executed directly: npx tsx ui_datagen.ts)
// ================================================================

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("ui_datagen.ts");

if (isMain) {
	(async () => {
	const args = process.argv.slice(2);
	const flags = {
		verify: args.includes("--verify"),
		dryRun: args.includes("--dry-run"),
		celestial: args.includes("--celestial"),
		machine: args.includes("--machine") ? args[args.indexOf("--machine") + 1] : null,
	};

	if (flags.celestial) {
		console.log("Verifying celestial selection UI files:");
		const celRes = verifyCelestialFiles();
		if (celRes.ok) {
			console.log("  ✓ All celestial selection files verified and registered.");
			process.exit(0);
		} else {
			for (const err of celRes.errors) console.error(`  ✗ ${err}`);
			process.exit(1);
		}
	}

	const reg = await defineAll();

	if (flags.machine) {
		reg.machines = reg.machines.filter((m) => m.name === flags.machine);
		if (!reg.machines.length) { console.error(`Unknown machine: ${flags.machine}`); process.exit(1); }
	}

	if (flags.verify) {
		const results = reg.generate({ write: false, patch: false });
		let ok = true;
		for (const r of results) {
			if (existsSync(r.path)) {
				const existing = JSON.parse(readFileSync(r.path, "utf-8"));
				if (JSON.stringify(existing) === JSON.stringify(r.json)) {
					console.log(`  ✓ ${r.name}`);
				} else {
					ok = false;
					console.log(`  ✗ ${r.name}`);
					const e = JSON.stringify(existing, null, "\t");
					const g = JSON.stringify(r.json, null, "\t");
					const eLines = e.split("\n"), gLines = g.split("\n");
					const maxLen = Math.max(eLines.length, gLines.length);
					for (let i = 0; i < maxLen; i++) {
						if (eLines[i] !== gLines[i]) {
							console.log(`    L${i + 1}:`);
							if (eLines[i]) console.log(`    - ${eLines[i]}`);
							if (gLines[i]) console.log(`    + ${gLines[i]}`);
						}
					}
				}
			} else {
				console.log(`  ? ${r.name}: no existing file`);
			}
		}
		console.log("\nVerifying celestial selection UI files:");
		const celRes = verifyCelestialFiles();
		if (!celRes.ok) {
			ok = false;
			for (const err of celRes.errors) console.error(`  ✗ ${err}`);
		}
		process.exit(ok ? 0 : 1);
	} else if (flags.dryRun) {
		const results = reg.generate({ write: false, patch: false });
		for (const r of results) {
			console.log(`\n${"=".repeat(60)}\n${r.path}\n${"=".repeat(60)}`);
			console.log(JSON.stringify(r.json, null, "\t"));
		}
	} else {
		reg.generate();
	}
	})();
}

// ================================================================
// Exports for use as a library
// ================================================================

export { GuiParameterized, guiParameterized, defineAll, BARS, barHorizontal, barVerticalFlame, barColored };


