import Rocket from "./rockets/Rocket";
import MoonLander from "./landers/MoonLander";
import LandingBalloons from "./landers/LandingBalloons";

export default  {
    "cosmos:rocket_tier_1": {
		ui: '§f§u§e§l§',
		class: Rocket,
		tier: 1,
		inventory_index: 2,
		speed: 1,
		camera: "minecraft:follow_orbit"

	},
	"cosmos:rocket_tier_2": {
		ui: '§f§u§e§l§',
		class: Rocket,
		tier: 2,
		inventory_index: 2,
		speed: 2,
		camera: "cosmos:rocket_camera"
	},
	"cosmos:lander": {
		ui: '§f§u§e§l§_§c§h§e§s§t§',
		class: MoonLander,
		inventory_index: 4
	},
	"cosmos:landing_balloons": {
		ui: '§f§u§e§l§_§c§h§e§s§t§',
		class: LandingBalloons,
		inventory_index: 4
	}, 
}