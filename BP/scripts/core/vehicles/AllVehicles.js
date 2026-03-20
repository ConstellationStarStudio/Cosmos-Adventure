import Rocket from "./rockets/Rocket";
import MoonLander from "./landers/MoonLander";
import LandingBalloons from "./landers/LandingBalloons";
import Buggy from "./Buggy";

export default  {
    "cosmos:rocket_tier_1": {
		ui: '§f§u§e§l§',
		class: Rocket,
		tier: 1,
		inventory_index: 2,
		speed: 1,
		camera: "minecraft:follow_orbit",
		drops_item: true

	},
	"cosmos:rocket_tier_2": {
		ui: '§f§u§e§l§',
		class: Rocket,
		tier: 2,
		inventory_index: 2,
		speed: 2,
		camera: "cosmos:rocket_camera",
		drops_item: true
	},
	"cosmos:lander": {
		ui: '§f§u§e§l§_§c§h§e§s§t§',
		class: MoonLander,
		inventory_index: 4,
	    drops_item: false
	},
	"cosmos:landing_balloons": {
		ui: '§f§u§e§l§_§c§h§e§s§t§',
		class: LandingBalloons,
		inventory_index: 4,
		drops_item: false
	}, 
	"cosmos:moon_buggy": {
		ui: '§f§u§e§l§',
		class: Buggy,
		inventory_index: 2,
		drops_item: true
	}
}