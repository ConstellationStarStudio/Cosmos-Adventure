# MCVecLib
A library of advanced matrix and vector operations for use within Minecraft Bedrock's scripting API. Most operations from the HLSL intrisics are implemented as well as some additional functions that are highly versatile, including conversions between the API's various interfaces.

## Namespaces:
1. **`Vec2`:** Includes operations on the `Vector2` interface for creation, manipulation and usage.
2. **`Vec3`:** Includes operations on the `Vector3` interface for creation, manipulation and usage.
3. **`Mat2`:** Includes various 2x2 matrix operations through the `Matrix2` interface. Enables construction, multiplication, inversion and more.
4. **`Mat3`:** Includes various 3x3 matrix operations through the `Matrix3` interface. Enables construction, multiplication, inversion and more.
5. **`RandVec`:** Includes utilities for generating random vectors from various uniform distributions.

## Examples:
Get the angle between the closest entity and the player's view direction:
```ts
import { Vec3 } from "@madlad3718/mcveclib";
import { Player } from "@minecraft/server";

function angleToClosestEntity(player: Player): number {
    // Get the closest entity to the player.
    const entity = player.dimension.getEntities({
        location: player.location,
        closest: 1
    })[0];

    // Get the difference vector pointing from the player's location
    // to the entity's location.
    const to_entity = Vec3.sub(entity.location, player.location);

    // Compute the dot product between the player's view vector and
    // the normalized player-entity difference vector.
    const view = player.getViewDirection();
    const v_dot_e = Vec3.dot(view, Vec3.normalize(to_entity));

    // Return the arccosine of the dot product. The dot product of two 
    // vectors A and B returns |A||B|cosθ, where θ is the angle between.
    return Math.acos(v_dot_e);
}
```

Get a random block within a 30° offset from a player's view direction:
```ts
import { Mat3, RandVec } from "@madlad3718/mcveclib";
import { Player, Block } from "@minecraft/server";

function randomVisibleBlock(player: Player): Block | undefined {
    // Get the player's head position and view vector.
    const origin = player.getHeadLocation();
    const view = player.getViewDirection();

    // Build a tangent-normal-binormal matrix around the view vector.
    // This represents a basis for the player's view space.
    const basis = Mat3.buildTNB(view);

    // Compute the direction by multiplying a random spherical cap
    // sample with maximum offset of 30° by the view matrix.
    const direction = Mat3.mul(basis, RandVec.cap(Math.PI / 6));

    // Get the block by casting a ray from the player's head position
    // in the computed direction.
    return player.dimension.getBlockFromRay(origin, direction);
}
```
