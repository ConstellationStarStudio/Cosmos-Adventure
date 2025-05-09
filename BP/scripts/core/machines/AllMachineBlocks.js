import CoalGenerator from './blocks/CoalGenerator'
import EnergyStorage from './blocks/EnergyStorage'
import OxygenCollector from './blocks/OxygenCollector'
import Compressor from './blocks/Compressor'
import CircuitFabricator from './blocks/CircuitFabricator'
import Refinery from './blocks/Refinery'
import ElectricCompressor from './blocks/ElectricCompressor'
import OxygenCompressor from './blocks/OxygenCompressor'
import FuelLoader from './blocks/FuelLoader'

export default {
	"coal_generator": {
		ui: "§c§o§a§l§_§g§e§n§e§r§a§t§o§r",
		class: CoalGenerator,
		lore: { slot: 3, power: 2 },

		energy_output: "right",
		maxPower: 120,
	},
	"compressor": {
		ui: "§c§o§m§p§r§e§s§s§o§r",
		class: Compressor,
		lore: { slot: 14 },
	},
	"energy_storage_module": {
		ui: "§e§n§e§r§g§y§_§s§t§o§r§a§g§e§_§m§o§d§u§l§e",
		class: EnergyStorage,
		lore: { slot: 4, energy: 0, power: 1 },

		energy_input: "left",
		capacity: 500000,

		energy_output: "right",
		maxPower: 300,
		maxInput: 2000,
	},
	"energy_storage_cluster": {
		ui: "§e§n§e§r§g§y§_§s§t§o§r§a§g§e§_§c§l§u§s§t§e§r",
		class: EnergyStorage,
		lore: { slot: 4, energy: 0, power: 1 },

		energy_output: "right",
		maxPower: 1800,
		maxInput: 2000,

		energy_input: "left",
		capacity: 2500000,
	},
	"electric_compressor":{
		ui: "§e§l§e§c§t§r§i§c§_§c§o§m§p§r§e§s§s§o§r",
		class: ElectricCompressor,
		lore: {slot: 16, energy: 0},

		energy_input: "right",
		capacity: 16000,
		maxInput: 1500
	},
	"oxygen_collector": {
		ui: "§o§x§y§g§e§n§_§c§o§l§l§e§c§t§o§r",
		class: OxygenCollector,
		lore: { slot: 3, energy: 0, o2: 1 },
		
		energy_input: "right",
		oxygen_output: "left",

		capacity: 16000,
		o2_capacity: 6000,
		maxInput: 25,
		maxOutput: 40
	},
	"circuit_fabricator": {
		ui: "§c§i§r§c§u§i§t§_§f§a§b§r§i§c§a§t§o§r",
		class: CircuitFabricator,
		lore: { slot: 12, energy: 0 },

		energy_input: "right",
		capacity: 16000,
		maxInput: 50
	},
	"refinery": {
		ui: "§r§e§f§i§n§e§r§y",
		class: Refinery,
		lore: { slot: 12, energy: 0, oil: 1, fuel: 2},

		energy_input: "above",
		oil_input: "right",
		fuel_output: "left",
		capacity: 16000,
		oil_capacity: 24000,
		fuel_capacity: 24000,
		maxInput: 120
	},
	"fuel_loader": {
		ui: "§f§u§e§l§_§l§o§a§d§e§r",
		class: FuelLoader,
		lore: { slot: 8, energy: 0, fuel: 1},

		energy_input: "right",
		oil_input: "left",
		capacity: 16000,
		fuel_capacity: 12000,
		maxInput: 120
	}
}
