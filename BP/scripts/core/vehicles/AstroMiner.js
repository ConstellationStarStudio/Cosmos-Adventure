import { system, world, BlockPermutation, ItemStack } from "@minecraft/server"
import { load_dynamic_object, save_dynamic_object } from "../../api/utils";
import { get_multi_block_data } from "../mullti_blocks/MultiBlock";
import { find_next_target_base } from "../mullti_blocks/blocks/MinerBase";
import { get_entity } from "../../api/utils";

/*
MINE_LENGTH = 24;
MINE_LENGTH_AST = 12;
AISTATE_OFFLINE = -1;
AISTATE_STUCK = 0;
AISTATE_ATBASE = 1;
AISTATE_TRAVELLING = 2;
AISTATE_MINING = 3;
AISTATE_RETURNING = 4;
AISTATE_DOCKING = 5;
FAIL_BASEDESTROYED = 3;
FAIL_OUTOFENERGY = 4;
FAIL_RETURNPATHBLOCKED = 5;
FAIL_ANOTHERWASLINKED = 8;
*/

const facing_yaw = {north: 180, south: 0, west: 90, east: 270};

const unbreakable_blocks = [
    "minecraft:water", "minecraft:lava", "minecraft:bedrock", "minecraft:end_portal", "minecraft:end_frame",
    "minecraft:portal", "minecraft:rail", "minecraft:farmland", "minecraft:lever", "minecraft:redstone_wire",
    "minecraft:stonebrick", "minecraft:mossy_cobblestone", "cosmos:walkway", "cosmos:astro_miner_base"
];
export default function(entity){
    let info = load_dynamic_object(entity, "vehicle_data");

    info.ai_face = info.ai_face ?? "north";
    info.last_facing = info.last_facing ?? undefined;

    info.speed = info.speed !== undefined ? info.speed: 0.022;
    info.speedup = info.speedup !== undefined ? info.speedup: 2.5;

    info.targ_rot = info.targ_rot ?? {x: 0, y: 0};
    info.mine_count_down = info.mine_count_down ?? 0;
    info.velocity = info.velocity ?? {x: 0, y: 0, z: 0}
    info.rot_speed = info.rot_speed ?? 1.5;
    info.ticks_existed = info.ticks_existed ?? 0;
    info.ticks_existed++;

    info.energy = info.energy ?? 0;

    let player = world.getEntity(info.player_id);

    if(info.ticks_existed % 10 == 0){
        let base = world.getEntity(info.base_id);
        if(!base?.isValid){
            base = entity.dimension.getEntities({type: "cosmos:astro_miner_base", maxDistance: 0.5, location: info.base_blocks})[0]
            if(base){
                let base_info = load_dynamic_object(base, "multi_block_data");
                let facings = {0: "south", 180: "north", 90: "west", 270: "east"};

                if(!base_info.miner_id && facings[base.getProperty("cosmos:rotation")] == info.base_facing){
                    base_info.miner_id = entity.id;
                    info.base_id = base.id;
                    save_dynamic_object(base, base_info, "multi_block_data");
                }
            }
        }
    }
    
    if(!player){
        // Go into dormant state if player is offline
        if(info.velocity.x != 0 || info.velocity.y != 0 || info.velocity.z != 0){
            entity.clearVelocity();
            info.velocity = {x: 0, y: 0, z: 0};
            save_dynamic_object(entity, info, "vehicle_data");
        }
        return;
    }

    info.ai_state = info.ai_state !== undefined ? info.ai_state: 1;

    let waypoints = load_dynamic_object(entity, "vehicle_data", "waypoints");
    let minepoints = load_dynamic_object(entity, "vehicle_data", "minepoints");

    info.stopForTurn = !check_rotation(info.rotation, info);

    if(info.ai_face != info.last_facing){
        info.last_facing = info.ai_face;
        broke_blocks(entity, 0, info.ai_face, 12, info)
        broke_blocks(entity, 1, info.ai_face, 12, info)
        broke_blocks(entity, 2, info.ai_face, 12, info)
    }

    switch(info.ai_state) {
        case 0:
            // Attempt to re-start every 30 seconds or so
            if(info.ticks_existed % 600 == 0){
                // The base was destroyed - see if it has been replaced?
                if((info.fail_message & 8) >  0){
                    let base = world.getEntity(info.base_id);
                    at_base(base, entity, info, waypoints, minepoints);
                }else{
                    // See if the return path has been unblocked, and give a small amount of backup energy to try to get home
                    info.ai_state = 5;
                    if(info.energy <= 0) info.energy = 20
                }
            }
            break;
        case 1:
            let base = world.getEntity(info.base_id);
            at_base(base, entity, info, waypoints, minepoints);
            save_dynamic_object(entity, waypoints, "vehicle_data", "waypoints");
            save_dynamic_object(entity, minepoints, "vehicle_data", "minepoints");
            break;
        case 2:
            if(!move_to_target(entity, info, waypoints, minepoints)){
                broke_blocks(entity, 2, info.ai_face, 2, info);
            }
            save_dynamic_object(entity, waypoints, "vehicle_data", "waypoints");
            save_dynamic_object(entity, minepoints, "vehicle_data", "minepoints");
            break;
        case 3:
            if(!do_mining(entity, info, minepoints) && info.ticks_existed % 2 == 0){
                info.energy--;
                broke_blocks(entity, 2, info.ai_face, 1, info);
            }
            save_dynamic_object(entity, minepoints, "vehicle_data", "minepoints");
            break;
        case 4:
            if(!waypoints.length){
                // When it gets to base: stop and reverse in!
                info.ai_state = 5;
                if (info.base_pos){
                    // Teleport back to base in case of any serious problem
                    entity.teleport(info.base_pos)
                    info.ai_face = info.base_facing;
                }
                return;
            }

            if(move_to_pos(entity.location, waypoints[waypoints.length - 1], true, info)) waypoints.pop()
            save_dynamic_object(entity, waypoints, "vehicle_data", "waypoints");

            broke_blocks(entity, 1, info.ai_face, 4, info);

            break;
        case 5:
            info.speed = 0.022 / 1.6;
            info.rot_speed = 1.5 / 1.6;
            if(move_to_pos(entity.location, info.base_pos, true, info)){
                info.ai_state = 1;
                info.velocity = {x: 0, y: 0, z: 0}
                info.speed = 0.022;
                info.rot_speed = 1.5;
            }

            break;
    }
    
    entity.clearVelocity();
    entity.applyImpulse(info.velocity);

    entity.setProperty("cosmos:rotation_y", info.rotation.y);
    entity.setProperty("cosmos:rotation_x", info.rotation.x)
    save_dynamic_object(entity, info, "vehicle_data");
}

function at_base(base, miner, info, waypoints, minepoints){
    if(!base?.isValid){
        freeze(3, info);
        return;
    }

    info.fail_message &= 64;
    waypoints.length = 0;

    let somethingTransferred = true;
    let container = miner.getComponent("minecraft:inventory").container;
    if(info.ticks_existed % 5 == 0) somethingTransferred = transfer_items(container, base);

    info.inventory_drops = 0;
  
    let base_info = load_dynamic_object(base, "multi_block_data");
    base_info.energy = base_info.energy ?? 0;

    let base_data = get_multi_block_data(base);
    
    // Recharge
    if(base_info.energy >= base_data.energy.rate && info.energy < 12000){
        info.energy += 16;
        base_info.energy -= base_data.energy.rate;
    }

    if(info.energy >= 12000 && !somethingTransferred && container.emptySlotsCount > 0){
        info.energy = 12000;
        if(find_next_target(base, info, minepoints)){
            info.ai_state = 2;
            waypoints.push({x: base.location.x, y: base.location.y + 1, z: base.location.z});
            info.mine_count = 0;
        }else if ((info.fail_message & 64) == 0) info.fail_message += 64;
    }
}

function transfer_items(miner_container, base){
    let empty_slots = miner_container.emptySlotsCount;
    if(empty_slots == 226) return false;

    let base_container = base.getComponent("minecraft:inventory").container;

    let first_empty_slot = base_container.firstEmptySlot();
    let size = 226 - miner_container.emptySlotsCount;

    let battery = base_container.getItem(72);

    //a little crutch here so instead of large function i made this so transfer items method would'nt transfer them to battery slot
    if(first_empty_slot == 72 || (size < empty_slots - 1 && !battery)){
        base_container.setItem(72, new ItemStack("cosmos:ui"));
    }

   
    let transferred_items = [];
    for(let i = size; i >= 1;){
        i--;
        let transferred = miner_container.transferItem(i, base_container);
        if(transferred){
            miner_container.setItem(i, transferred);
            transferred_items.push(i);
        }
    }

    transferred_items.forEach((index) => {
        miner_container.transferItem(index, miner_container);
    });

    if(first_empty_slot == 72 || (size < empty_slots - 1 && !battery)){
        base_container.setItem(72, undefined);
    }

    return true;
}
function freeze(fail, info){
    info.ai_state = 0;
    info.velocity = {x: 0, y: 0, z: 0};
    if(info.fail_message & (1 << fail) == 0){
        info.fail_message += (1 << fail);
    }
}

function broke_blocks(miner, dist, ai_face, limit, info){
    if(info.mine_count_down > 0){
        info.mine_count_down -= 1;
        return false;
    }

    const headings = {down: {x: 0, y: -1, z: 0}, up: {x: 0, y: 1, z: 0}, 
    south: {x: 0, y: 0, z: 1}, north: {x: 0, y: 0, z: -1}, east: {x: 1, y: 0, z: 0}, west: {x: -1, y: 0, z: 0}}

    const headings2 = {down: {x: 0, y: -3, z: 0}, up: {x: 0, y: 2, z: 0}, 
    south: {x: 0, y: 0, z: 2}, north: {x: 0, y: 0, z: -3}, east: {x: 2, y: 0, z: 0}, west: {x: -3, y: 0, z: 0}}

    let in_front = {x: Math.floor(miner.location.x + 0.5), y: Math.floor(miner.location.y + 1.5), z: Math.floor(miner.location.z + 0.5)};


    if(dist == 2){
        in_front.x += headings2[ai_face].x; in_front.y += headings2[ai_face].y; in_front.z += headings2[ai_face].z; 
    }else{
        if(["down", "north", "west"].includes(ai_face)) dist++;
        if(dist > 0){ in_front.x += headings[ai_face].x * dist; in_front.y += headings[ai_face].y * dist;
            in_front.z += headings[ai_face].z * dist; }
    }

    if(JSON.stringify(in_front) != info.mine_last && info.ai_state != 1){
        info.mine_count_down = 3;
        info.mine_last = JSON.stringify(in_front);
        return false;
    }

    let mined_blocks_xz = [{x: 0.5, y: 0.5, z: 0}, {x: -0.5, y: -0.5, z: 0}, {x: 0.5, y: -0.5, z: 0}, {x: -0.5, y: 0.5, z: 0},
    {x: -1.5, y: -0.5, z: 0}, {x: -1.5, y: 0.5, z: 0}, {x: 1.5, y: -0.5, z: 0}, {x: 1.5, y: 0.5, z: 0},
    {x: -0.5, y: -1.5, z: 0}, {x: -0.5, y: 1.5, z: 0}, {x: 0.5, y: -1.5, z: 0}, {x: 0.5, y: 1.5, z: 0}
    ];

    let mined_blocks_y = [{x: 0.5, y: 0, z: 0.5}, {x: -0.5, y: 0, z: -0.5}, {x: 0.5, y: 0, z: -0.5}, {x: -0.5, y: 0, z: 0.5},
    {x: -1.5, y: 0, z: -0.5}, {x: -1.5, y: 0, z: 0.5}, {x: 1.5, y: 0, z: -0.5}, {x: 1.5, y: 0, z: 0.5},
    {x: -0.5, y: 0, z: -1.5}, {x: -0.5, y: 0, z: 1.5}, {x: 0.5, y: 0, z: -1.5}, {x: 0.5, y: 0, z: 1.5}
    ];

    let mined_blocks = (ai_face == "up" || ai_face == "down") ? mined_blocks_y: mined_blocks_xz;

    let sides = {north: 0, south: Math.PI, west: Math.PI/2, east: 3 * Math.PI/2, up: 0, down: 0};

    info.try_block_limit = limit;
    let is_way_barred = false;

    if(in_front.y == Math.floor(info.base_pos.y) && in_front.x == Math.floor(info.base_pos.x) - ((info.base_facing == "east") ? 1 : 0) && in_front.z == Math.floor(info.base_pos.z) - ((info.base_facing == "south") ? 1 : 0)){
        try_back_in(miner, info);
        return false;
    }

    for(let vector of mined_blocks){
        vector = {x: in_front.x + (vector.x * Math.cos(sides[ai_face]) - vector.z * Math.sin(sides[ai_face])), 
            y: in_front.y +  vector.y, 
            z: in_front.z + (vector.x * Math.sin(sides[ai_face]) + vector.z * Math.cos(sides[ai_face]))};
        let block = miner.dimension.getBlock(vector);
        if(block && !block.isAir){
            if(!unbreakable_blocks.includes(block.typeId) && !block.hasTag("wire") && !block.hasTag("pipe")){
                let item = block.getItemStack();
                try{
                    miner.getComponent('minecraft:inventory').container.addItem(item);
                }catch{
                    block.dimension.spawnItem(item, block.location);
                }
                block.setPermutation(BlockPermutation.resolve("minecraft:air"))
            }else is_way_barred = true;
        }
    }

    if(is_way_barred){
        info.velocity = {x: 0, y: 0, z: 0};
        info.try_block_limit = 0;
        if(info.ai_state == 2) info.ai_state = 4
        else if(info.ai_state == 3){
            info.path_blocked_count += 1;
            info.ai_state = 4;
        }else if(info.ai_state == 4){
            try_back_in(miner, info);
        }else freeze(5, info);
    }

    if(info.try_block_limit == limit && !info.no_speedup){
        info.velocity.x *= info.speedup;
        info.velocity.y *= info.speedup;
        info.velocity.z *= info.speedup;
    }

    return is_way_barred;
}

function try_back_in(miner, info){
    let {x, y, z} = info.base_pos;
    let {x: mx, y: my, z: mz} = miner.location;

    if(((mx - x) ** 2 + (my - y) ** 2 + (mz - z) ** 2) <= 9.1){
        info.ai_state = 5;
        info.targ_rot.y = facing_yaw[info.base_facing]; 
    }else{
        freeze(5, info);
    }
}

function find_next_target(base, info, minepoints){
     // If mining has finished, or path has been blocked two or more times,
     // try mining elsewhere
    if(minepoints.length && info.path_blocked_count < 2){
        //it's not just pos_target = minepoints[0] because of js mutability
        info.pos_target = {x: minepoints[0].x, y: minepoints[0].y, z: minepoints[0].z};
        return true;
    }

    // Target is completely mined: change target
    info.pos_target = find_next_target_base(base);
    info.path_blocked_count = 0;

    // No more mining targets, the whole area is mined
    if(info.pos_target == undefined) return false;
    
    return true;
}

function move_to_target(miner, info, waypoints, minepoints){
    if(info.energy < 1000 || info.inventory_drops > 10){
        info.ai_state = 4;
        info.path_blocked_count = 0;
        return true;
    }

    if(!info.pos_target){
        info.ai_state = 0;
        return true;
    }

    if(move_to_pos(miner.location, info.pos_target, false, info)){
        info.ai_state = 3;
        waypoints.push({x: info.pos_target.x, y: info.pos_target.y, z: info.pos_target.z});
        set_mine_points(miner, minepoints, info);
        return true;
    }
}
function set_mine_points(miner, minepoints, info){
    if(minepoints.length) return;

    let in_front = {x: Math.floor(miner.location.x + 0.5), y: Math.floor(miner.location.y + 1.5), z: Math.floor(miner.location.z + 0.5)};
    let other_end = 24;

    if(info.base_facing == "north" || info.base_facing == "west") other_end *= -1;

    if(info.base_facing == "north" || info.base_facing == "south"){
        minepoints.push({x: in_front.x, y: in_front.y, z: in_front.z + other_end});
        minepoints.push({x: in_front.x + 4, y: in_front.y, z: in_front.z + other_end});
        minepoints.push({x: in_front.x + 4, y: in_front.y, z: in_front.z});
        minepoints.push({x: in_front.x + 2, y: in_front.y + 3, z: in_front.z});
        minepoints.push({x: in_front.x + 2, y: in_front.y + 3, z: in_front.z + other_end});
        minepoints.push({x: in_front.x - 2, y: in_front.y + 3, z: in_front.z + other_end});
        minepoints.push({x: in_front.x - 2, y: in_front.y + 3, z: in_front.z});
        minepoints.push({x: in_front.x - 4, y: in_front.y, z: in_front.z});
        minepoints.push({x: in_front.x - 4, y: in_front.y, z: in_front.z + other_end});
        minepoints.push({x: in_front.x - 2, y: in_front.y - 3, z: in_front.z + other_end});
        minepoints.push({x: in_front.x - 2, y: in_front.y - 3, z: in_front.z});
        minepoints.push({x: in_front.x + 2, y: in_front.y - 3, z: in_front.z});
        minepoints.push({x: in_front.x + 2, y: in_front.y - 3, z: in_front.z + other_end});
        minepoints.push({x: in_front.x, y: in_front.y, z: in_front.z + other_end});
    }else if(info.base_facing == "west" || info.base_facing == "east"){
        minepoints.push({x: in_front.x + other_end, y: in_front.y, z: in_front.z});
        minepoints.push({x: in_front.x + other_end, y: in_front.y, z: in_front.z + 4});
        minepoints.push({x: in_front.x, y: in_front.y, z: in_front.z + 4});
        minepoints.push({x: in_front.x, y: in_front.y + 3, z: in_front.z + 2});
        minepoints.push({x: in_front.x + other_end, y: in_front.y + 3, z: in_front.z + 2});
        minepoints.push({x: in_front.x + other_end, y: in_front.y + 3, z: in_front.z - 2});
        minepoints.push({x: in_front.x, y: in_front.y + 3, z: in_front.z - 2});
        minepoints.push({x: in_front.x, y: in_front.y, z: in_front.z - 4});
        minepoints.push({x: in_front.x + other_end, y: in_front.y, z: in_front.z - 4});
        minepoints.push({x: in_front.x + other_end, y: in_front.y - 3, z: in_front.z - 2});
        minepoints.push({x: in_front.x, y: in_front.y - 3, z: in_front.z - 2});
        minepoints.push({x: in_front.x, y: in_front.y - 3, z: in_front.z + 2});
        minepoints.push({x: in_front.x + other_end, y: in_front.y - 3, z: in_front.z + 2});
        minepoints.push({x: in_front.x + other_end, y: in_front.y, z: in_front.z});
    }
}

function do_mining(miner, info, minepoints){
    if(info.energy < 1000 || info.inventory_drops > 10 || !minepoints.length){
        if(minepoints.length && info.current_mine_point) minepoints.unshift(info.current_mine_point);
        info.ai_state = 4;
        info.path_blocked_count = 0;
        return true;
    }

    if(move_to_pos(miner.location, minepoints[0], false, info)){
        info.current_mine_point = minepoints.shift();
        return true;
    }

    return false;
}
function move_to_pos(m_loc, pos, reverse, info){
    info.no_speedup = false;

    if(reverse != (!["east", "west"].includes(info.base_facing))){
        if (m_loc.z > pos.z + info.speed || m_loc.z < pos.z - info.speed) move_to_axys(m_loc, pos.z, "z", info);
        else if (m_loc.y > pos.y - (1 - info.speed) || m_loc.y < pos.y - (1 + info.speed)) move_to_axys(m_loc, pos.y - 1, "y", info);
        else if (m_loc.x > pos.x + info.speed || m_loc.x < pos.x - info.speed) move_to_axys(m_loc, pos.x, "x", info);
        else return true; 
        // got there
    }else{
        if(m_loc.x > pos.x + info.speed || m_loc.x < pos.x - info.speed) move_to_axys(m_loc, pos.x, "x", info);
        else if(m_loc.y > pos.y - (1 - info.speed) || m_loc.y < pos.y - (1 + info.speed)) move_to_axys(m_loc, pos.y - 1, "y", info);
        else if(m_loc.z > pos.z + info.speed || m_loc.z < pos.z - info.speed) move_to_axys(m_loc, pos.z, "z", info);
        else return true;
        // got there
    }
    return false;

}
function move_to_axys(m_pos, pos, axys, info){
    if(axys != "y") info.targ_rot.x = 0;

    const sides = {x: ["west", "east"], y: ["down", "up"], z: ["north", "south"]};
    const degrees = {x: [90, 270], y: [90, -90], z: [180, 0]}

    let velocity = 0;

    if(m_pos[axys] > pos){
        if(info.ai_state != 5 && axys != "y") info.targ_rot.y = degrees[axys][0]
        else if(axys == "y") info.targ_rot.x = degrees[axys][0];

        velocity = -info.speed;
        // TODO some acceleration and deceleration
        if (info.velocity[axys] * info.speedup <= pos - m_pos[axys])
        {
            velocity = pos - m_pos[axys];
            info.no_speedup = true;
        }
        info.ai_face = sides[axys][0];
    }else{
        if(axys !== "y" && info.ai_state != 5) info.targ_rot.y = degrees[axys][1];
        else if(axys == "y") info.targ_rot.x = degrees[axys][1];

        velocity = info.speed;
        // TODO some acceleration and deceleration
        if (info.velocity[axys] * info.speedup >= pos - m_pos[axys]){
            velocity = pos - m_pos[axys];
            info.no_speedup = true;
        }
        info.ai_face = sides[axys][1];
    }

    info.velocity = {x: 0, y: 0, z: 0}
    info.velocity[axys] = velocity;

    if(info.stopForTurn) info.velocity[axys] = 0;
}

function check_rotation(rot, info){
    let flag = true;
    // Handle the turns when it changes direction
    if(rot.x > info.targ_rot.x + 0.001 || rot.x < info.targ_rot.x - 0.001){
        if (rot.x > info.targ_rot.x + 180) rot.x -= 360;
        else if (rot.x < info.targ_rot.x - 180) rot.x += 360;

        if(rot.x > info.targ_rot.x){
            rot.x -= info.rot_speed;
            if(rot.x < info.targ_rot.x) rot.x = info.targ_rot.x;
        }else{
            rot.x += info.rot_speed;
            if(rot.x > info.targ_rot.x) rot.x = info.targ_rot.x;
        }
    }

    if(rot.y > info.targ_rot.y + 0.001 || rot.y < info.targ_rot.y - 0.001){
        if(rot.y > info.targ_rot.y + 180) rot.y -= 360;
        else if (rot.y < info.targ_rot.y - 180) rot.y += 360;

        if(rot.y > info.targ_rot.y){
            rot.y -= info.rot_speed;
            if(rot.y < info.targ_rot.y) rot.y = info.targ_rot.y;
        }else{
            rot.y += info.rot_speed;
            if(rot.y > info.targ_rot.y) rot.y = info.targ_rot.y;
        }
        flag = false;
    }

    if(rot.y > 360) rot.y %= 360;
    if(rot.y < 0) rot.y += 360;

    rot.x = Math.max(-90, Math.min(90, rot.x));

    return flag;
}