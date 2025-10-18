import CoalGenerator from './blocks/CoalGenerator'
import EnergyStorage from './blocks/EnergyStorage'
import OxygenCollector from './blocks/OxygenCollector'
import Compressor from './blocks/Compressor'
import CircuitFabricator from './blocks/CircuitFabricator'
import Refinery from './blocks/Refinery'
import ElectricCompressor from './blocks/ElectricCompressor'
import OxygenCompressor from './blocks/OxygenCompressor'
import OxygenDecompressor from './blocks/OxygenDecompressor'
import FuelLoader from './blocks/FuelLoader'
import WaterElectrolyzer from './blocks/WaterElectrolyzer'
import GasLiquefier from './blocks/GasLiquefier'
import ElectricFurnace from './blocks/ElectricFurnace'
import RocketTierOne from './rockets/RocketTierOne'
import MoonLander from './rockets/MoonLander'
import Parachest from './blocks/Parachest'
import OxygenDistributor from './blocks/OxygenDistributor'
import BasicSolarPanel from './blocks/BasicSolarPanel'

export default {
	"coal_generator": {
		ui: "§c§o§a§l§_§g§e§n§e§r§a§t§o§r",
		class: CoalGenerator,
		energy: {output: "right", maxPower: 120},
		items: {
			top_input: [0],
			side_input: [0],
		},
		using_block: true,
	},
	"compressor": {
		ui: "§c§o§m§p§r§e§s§s§o§r",
		class: Compressor,
		items: {
			top_input: [0, 1, 2, 3, 4, 5, 6, 7, 8],
			side_input: [9],
			output: [10]
		},
		using_block: true,
	},
	"energy_storage_module": {
		ui: "§e§n§e§r§g§y§_§s§t§o§r§a§g§e§_§m§o§d§u§l§e",
		class: EnergyStorage,
		energy: {
			input: "left",
			output: "right", 
			capacity: 500000,
			maxPower: 300,
			maxInput: 2000
		},
		using_block: true,
	},
	"energy_storage_cluster": {
		ui: "§e§n§e§r§g§y§_§s§t§o§r§a§g§e§_§c§l§u§s§t§e§r",
		class: EnergyStorage,
		energy: {
			input: "left",
			output: "right", 
			capacity: 2500000,
			maxPower: 1800,
			maxInput: 2000
		},
		using_block: true,
	},
	"electric_compressor":{
		ui: "§e§l§e§c§t§r§i§c§_§c§o§m§p§r§e§s§s§o§r",
		class: ElectricCompressor,
		energy: {input: "right", capacity: 16000, maxInput: 1500},
		items: {
			top_input: [0, 1, 2, 3, 4, 5, 6, 7, 8],
			side_input: [0, 1, 2, 3, 4, 5, 6, 7, 8],
			output: [10, 11]
		},
		using_block: true,
	},
	"electric_furnace":{
		ui: "§e§l§e§c§t§r§i§c§_§f§u§r§n§a§c§e",
		class: ElectricFurnace,
		energy: {input: "right", capacity: 16000, maxInput: 45},
		items: {
			top_input: [0],
			side_input: [0],
			output: [2]
		},
		using_block: true,
	},
	"basic_solar_panel": {
		ui: "",
		class: BasicSolarPanel,
		energy: {output: "back", capacity: 16000, maxPower: 200},
		items: {
			top_input: [0],
			side_input: [0],
		},
		using_block: true,
		multi_block: true,
	},
	"oxygen_collector": {
		ui: "§o§x§y§g§e§n§_§c§o§l§l§e§c§t§o§r",
		class: OxygenCollector,
		energy: {input: "right", capacity: 16000, maxInput: 25},
		o2: {output: "left", capacity: 6000},
		using_block: true,
	},
	"oxygen_compressor": {
		ui: "§o§x§y§g§e§n§_§c§o§m§p§r§e§s§s§o§r",
		class: OxygenCompressor,
		energy: {input: "right", capacity: 16000, maxInput: 15},
		o2: {input: "left", capacity: 1200, maxInput: 16},
		using_block: true,
	},
	"oxygen_distributor": {
		ui: "§o§x§y§g§e§n§_§d§i§s§t§r§i§b§u§t§o§r",
		class: OxygenDistributor,
		energy: {input: "right", capacity: 16000, maxInput: 25},
		o2: {input: "left", capacity: 6000, maxInput: 16},
		using_block: true,
	},
	"oxygen_decompressor": {
		ui: "§o§x§y§g§e§n§_§d§e§c§o§m§p§r§e§s§s§o§r",
		class: OxygenDecompressor,
		energy: {input: "right", capacity: 16000, maxInput: 10},
		o2: {output: "left", capacity: 1200},
		using_block: true,
	},
	"circuit_fabricator": {
		ui: "§c§i§r§c§u§i§t§_§f§a§b§r§i§c§a§t§o§r",
		class: CircuitFabricator,
		energy: {input: "right", capacity: 16000, maxInput: 50},
		items: {
			top_input: [4],
			side_input: [0, 1, 2, 3],
			output: [6]
		},
		using_block: true,
	},
	"refinery": {
		ui: "§r§e§f§i§n§e§r§y",
		class: Refinery,
		energy: {input: "above", capacity: 16000, maxInput: 120},
		oil: {input: "right", capacity: 24000},
		fuel: {output: "left", capacity: 24000},
		using_block: true,
	},
	"fuel_loader": {
		ui: "§f§u§e§l§_§l§o§a§d§e§r",
		class: FuelLoader,
		energy: {input: "right", capacity: 16000, maxInput: 120},
		fuel: {input: "left", capacity: 12000},
		using_block: true,
	},
	"water_electrolyzer": {
		ui: "§w§a§t§e§r§_§e§l§e§c§t§r§o§l§y§z§e§r",
		class: WaterElectrolyzer,
		energy: {input: "below", capacity: 16000, maxInput: 900},
		water: {input: "left", capacity: 4000},
		o2: {output: "back", capacity: 4000},
		h2: {output: "right", capacity: 4000},
		using_block: true,
	},
	"gas_liquefier": {
		ui: "§g§a§s§_§l§i§q§u§e§f§i§e§r",
		class: GasLiquefier,
		energy: {input: "below", capacity: 16000, maxInput: 900},
		gas: {input: "left", capacity: 4000},
		liquid: {output: "right", capacity: 2000},
		using_block: true,
	},
	"rocket_tier_1": {
		ui: '§r§o§c§k§e§t§_§z§e§r§o',
		class: RocketTierOne,
		using_block: false,
	},
	"lander": {
		ui: '',
		class: MoonLander,
		using_block: false,
	}, 
	"parachest":{
		ui: '',
		class: Parachest,
		using_block: true,
	}
}
