import "./api/register.js"
import "./api/mixins.js"
import "./api/player/celestial_selector.js"
import "./api/player/space_gear.js"
import "./api/player/liftoff.js"
import "./api/player/oxygen.js"
import "./api/world/PlanetBuilder.js"

import "./core/machines/Machine.js"
import "./core/vehicles/Vehicle.js"

import "./core/matter/blocks.js"
import "./core/matter/items.js"
import "./core/matter/electricity.js"
import "./core/matter/solids.js"
import "./core/matter/fluids.js"

import "./core/entities/alien_villager.js"
import "./core/entities/evolved_skeleton_boss.js"

import "./core/PlayerWorldCycle.js"

import "./planets/events/unlit_torch.js"
import "./planets/dimensions.js"
import { startWorldgenCoordinator } from "./planets/worldgen.js"
import { startVoidRecoveryLoop } from "./planets/teleport.js"
import { startFogManager } from "./planets/fog_manager.js"

// Start custom dimension systems
startWorldgenCoordinator();
startVoidRecoveryLoop();
startFogManager();