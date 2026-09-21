import MinerBase from "./blocks/MinerBase.js"
const AllMultiBlocks = {
    "cosmos:astro_miner_base": MinerBase
}

for (const multi_block in AllMultiBlocks) AllMultiBlocks[multi_block].ui = `§${multi_block.split('').join('§')}`
export default AllMultiBlocks;