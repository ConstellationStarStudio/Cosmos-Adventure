import CoalGenerator from './blocks/CoalGenerator'
import EnergyStorage from './blocks/EnergyStorage'
import OxygenCollector from './blocks/OxygenCollector'
import Compressor from './blocks/Compressor'
import CircuitFabricator from './blocks/CircuitFabricator'
import Refinery from './blocks/Refinery'
import ElectricCompressor from './blocks/ElectricCompressor'
import OxygenCompressor from './blocks/OxygenCompressor'
import OxygenDecompressor from './blocks/OxygenDecompressor'
import OxygenStorage from './blocks/OxygenStorage'
import FuelLoader from './blocks/FuelLoader'
import WaterElectrolyzer from './blocks/WaterElectrolyzer'
import GasLiquefier from './blocks/GasLiquefier'
import ElectricFurnace from './blocks/ElectricFurnace'
import Parachest from './blocks/Parachest'
import OxygenDistributor from './blocks/OxygenDistributor'
import SolarPanel from './blocks/SolarPanel'
import Deconstructor from './blocks/Deconstructor'

const AllMachines = {
	coal_generator: CoalGenerator,
	compressor: Compressor,
	energy_storage_module: EnergyStorage.energy_storage_module,
	energy_storage_cluster: EnergyStorage.energy_storage_cluster,
	electric_compressor: ElectricCompressor.electric_compressor,
	advanced_compressor: ElectricCompressor.advanced_compressor,
	electric_furnace: ElectricFurnace.electric_furnace,
	electric_arc_furnace: ElectricFurnace.electric_arc_furnace,
	basic_solar_panel: SolarPanel.basic_solar_panel,
	advanced_solar_panel: SolarPanel.advanced_solar_panel,
	oxygen_collector: OxygenCollector,
	oxygen_compressor: OxygenCompressor,
	oxygen_distributor: OxygenDistributor,
	oxygen_decompressor: OxygenDecompressor,
	oxygen_storage_module: OxygenStorage,
	circuit_fabricator: CircuitFabricator,
	refinery: Refinery,
	fuel_loader: FuelLoader,
	water_electrolyzer: WaterElectrolyzer,
	gas_liquefier: GasLiquefier,
	deconstructor: Deconstructor,
	parachest: Parachest,
}

for (const machine in AllMachines) AllMachines[machine].ui = `§${machine.split('').join('§')}`
export default AllMachines
