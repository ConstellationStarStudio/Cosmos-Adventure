import {world, system} from "@minecraft/server";

function grappleProjectileFlying(projectile, source){
    let owner = source;
	let generalProjectile = owner.dimension.spawnEntity('cosmos:gengrapple', {x: owner.location.x, y: owner.location.y + 1, z: owner.location.z});
    generalProjectile.getComponent('minecraft:rideable').addRider(owner);
    let projectileLocation = projectile.location;
    let fly = system.runInterval(() => {
        if(!projectile.isValid && !generalProjectile.isValid){
            system.clearRun(fly)
            return;
        };
        let distanceGen = ((projectile.location.x - source.location.x) ** 2) + ((projectile.location.y - source.location.y) ** 2) + ((projectile.location.z - source.location.z) ** 2);
        projectile.setProperty("cosmos:lenght", distanceGen);
        let targetBlock = (generalProjectile.isValid && generalProjectile.dimension.getBlockFromRay(generalProjectile.location, {x: (projectileLocation.x - generalProjectile.location.x), y: (projectileLocation.y - generalProjectile.location.y), z: (projectileLocation.z - generalProjectile.location.z)}, {includePassableBlocks: false})?.block != undefined)? generalProjectile.dimension.getBlockFromRay(generalProjectile.location, {x: (projectileLocation.x - generalProjectile.location.x), y: (projectileLocation.y - generalProjectile.location.y), z: (projectileLocation.z - generalProjectile.location.z)}, {includePassableBlocks: false})?.block.location:
        projectileLocation;
        let distanceB = ((targetBlock.x - generalProjectile.location.x) ** 2) + ((targetBlock.y - generalProjectile.location.y) ** 2) + ((targetBlock.z - generalProjectile.location.z) ** 2);
        let cof = (targetBlock == undefined)? 1: 
        (Math.abs(distanceB) <= 11 && Math.abs(distanceB) > 5)? 1:
        (Math.abs(distanceB) <= 5 && Math.abs(distanceB) > 1)? 0.5:
        (Math.abs(distanceB) <= 1)? 0:
        2;
        let dirLenght = cof/Math.sqrt(((projectileLocation.x - generalProjectile.location.x) ** 2) + ((projectileLocation.y - generalProjectile.location.y) ** 2) + ((projectileLocation.z - generalProjectile.location.z) ** 2));
        let direction = {x: (projectileLocation.x - generalProjectile.location.x) * dirLenght, y: (projectileLocation.y - generalProjectile.location.y) * dirLenght, z: (projectileLocation.z - generalProjectile.location.z) * dirLenght};
        generalProjectile.clearVelocity();
        generalProjectile.applyImpulse(direction);
        if(Math.abs(distanceB) <= 1 || !generalProjectile.isValid){
            if(generalProjectile.isValid){
                generalProjectile.getComponent('minecraft:rideable').ejectRiders();
                generalProjectile.remove();
            }
            if(projectile.isValid) projectile.remove();
            system.clearRun(fly);
        }
    },2);
}
function grappleVisualProjectileFly(source){
    let visualProjectile = source.dimension.spawnEntity('cosmos:vgrapple', {x: source.location.x, y: source.location.y + 1, z: source.location.z});
    let direction = source.getBlockFromViewDirection({includePassableBlocks: false})?.block;
    let vDirection = source.getViewDirection();
    let flyVisual = system.runInterval(() => {
        if(!visualProjectile.isValid){
            system.clearRun(flyVisual);
            return;
        }
        let distance = ((visualProjectile.location.x - source.location.x) ** 2) + ((visualProjectile.location.y - source.location.y) ** 2) + ((visualProjectile.location.z - source.location.z) ** 2);
        visualProjectile.setProperty("cosmos:lenght", distance);
        let targetV = (direction != undefined)? direction:
        (visualProjectile.dimension.getBlockFromRay({x: visualProjectile.location.x, y: visualProjectile.location.y + 1, z: visualProjectile.location.z}, vDirection, {includePassableBlocks: false})?.block != undefined)?
        visualProjectile.dimension.getBlockFromRay({x: visualProjectile.location.x, y: visualProjectile.location.y + 1, z: visualProjectile.location.z}, vDirection, {includePassableBlocks: false})?.block:
        undefined;
        if(targetV == undefined){
            visualProjectile.clearVelocity();
            visualProjectile.applyImpulse(vDirection);
            return;
        }
        let dirLenghtV = 1/Math.sqrt(((targetV.location.x - visualProjectile.location.x) ** 2) + ((targetV.location.y - visualProjectile.location.y) ** 2) + ((targetV.location.z - visualProjectile.location.z) ** 2));
        if(targetV != undefined){
            visualProjectile.clearVelocity();
            visualProjectile.applyImpulse({x: (targetV.location.x - visualProjectile.location.x) * dirLenghtV, y: (targetV.location.y - visualProjectile.location.y) * dirLenghtV, z: (targetV.location.z - visualProjectile.location.z) * dirLenghtV});
        }
        let distanceBv = ((targetV.location.x - visualProjectile.location.x) ** 2) + ((targetV.location.y - visualProjectile.location.y) ** 2) + ((targetV.location.z - visualProjectile.location.z) ** 2);
        if(visualProjectile.isValid && targetV != undefined && Math.abs(distanceBv <= 1)){
            visualProjectile.clearVelocity();
            system.clearRun(flyVisual);
            return grappleProjectileFlying(visualProjectile, source);
        }
        else if(!visualProjectile.isValid) system.clearRun(flyVisual)
    },2);
}
system.beforeEvents.startup.subscribe(({itemComponentRegistry}) => {
    itemComponentRegistry.registerCustomComponent("cosmos:grapple", {
        onUse(data){
            return grappleVisualProjectileFly(data.source);
        },
    })
})