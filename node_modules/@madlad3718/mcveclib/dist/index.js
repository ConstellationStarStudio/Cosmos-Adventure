// src/vector3.ts
import { Direction } from "@minecraft/server";
var Vec3;
((Vec32) => {
  Vec32.Zero = { x: 0, y: 0, z: 0 };
  Vec32.One = { x: 1, y: 1, z: 1 };
  Vec32.Up = { x: 0, y: 1, z: 0 };
  Vec32.Down = { x: 0, y: -1, z: 0 };
  Vec32.North = { x: 0, y: 0, z: -1 };
  Vec32.South = { x: 0, y: 0, z: 1 };
  Vec32.East = { x: 1, y: 0, z: 0 };
  Vec32.West = { x: -1, y: 0, z: 0 };
  Vec32.X = Vec32.East;
  Vec32.Y = Vec32.Up;
  Vec32.Z = Vec32.South;
  function isVector3(v) {
    return typeof v === "object" && "x" in v && "y" in v && "z" in v;
  }
  Vec32.isVector3 = isVector3;
  function from(x, y, z) {
    if (typeof x === "number") return {
      x,
      y: y ?? x,
      z: z ?? x
    };
    if (Array.isArray(x) && x.length >= 3) return {
      x: x[0],
      y: x[1],
      z: x[2]
    };
    throw new Error("Invalid input values for vector construction.");
  }
  Vec32.from = from;
  function fromBlockFace(face) {
    switch (face) {
      case "up":
        return Vec32.Up;
      case "down":
        return Vec32.Down;
      case "north":
        return Vec32.North;
      case "south":
        return Vec32.South;
      case "east":
        return Vec32.East;
      case "west":
        return Vec32.West;
    }
    throw new Error("Argument was not of type 'block_face' or 'cardinal_direction'.");
  }
  Vec32.fromBlockFace = fromBlockFace;
  function toBlockFace(v) {
    return toDirection(v).toLowerCase();
  }
  Vec32.toBlockFace = toBlockFace;
  function fromDirection(d) {
    switch (d) {
      case Direction.Up:
        return Vec32.Up;
      case Direction.Down:
        return Vec32.Down;
      case Direction.North:
        return Vec32.North;
      case Direction.South:
        return Vec32.South;
      case Direction.East:
        return Vec32.East;
      case Direction.West:
        return Vec32.West;
    }
  }
  Vec32.fromDirection = fromDirection;
  function toDirection(v) {
    const a = abs(v), max2 = Math.max(a.x, a.y, a.z);
    if (max2 === a.x)
      return v.x >= 0 ? Direction.East : Direction.West;
    else if (max2 === a.y)
      return v.y >= 0 ? Direction.Up : Direction.Down;
    else return v.z >= 0 ? Direction.South : Direction.North;
  }
  Vec32.toDirection = toDirection;
  function fromRGB(c) {
    return {
      x: c.red,
      y: c.green,
      z: c.blue
    };
  }
  Vec32.fromRGB = fromRGB;
  function toRGB(v) {
    return {
      red: v.x,
      green: v.y,
      blue: v.z
    };
  }
  Vec32.toRGB = toRGB;
  function toRotation(v) {
    return {
      x: -degrees(Math.asin(v.y)),
      y: -degrees(Math.atan2(v.x, v.z))
    };
  }
  Vec32.toRotation = toRotation;
  function degrees(radians) {
    return 180 * radians / Math.PI;
  }
  function toArray(v) {
    const { x, y, z } = v;
    return [x, y, z];
  }
  Vec32.toArray = toArray;
  function toString(v) {
    return toArray(v).join(" ");
  }
  Vec32.toString = toString;
  function parse(s) {
    const [x, y, z] = s.split(" ").map(Number);
    return { x, y, z };
  }
  Vec32.parse = parse;
  function isNaN(v) {
    return Number.isNaN(v.x) || Number.isNaN(v.y) || Number.isNaN(v.z);
  }
  Vec32.isNaN = isNaN;
  function isInf(v) {
    return !isFinite(v);
  }
  Vec32.isInf = isInf;
  function isFinite(v) {
    return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
  }
  Vec32.isFinite = isFinite;
  function any(v) {
    return v.x !== 0 || v.y !== 0 || v.z !== 0;
  }
  Vec32.any = any;
  function all(v) {
    return v.x !== 0 && v.y !== 0 && v.z !== 0;
  }
  Vec32.all = all;
  function greaterThan(u, v) {
    return {
      x: u.x > v.x ? 1 : 0,
      y: u.y > v.y ? 1 : 0,
      z: u.z > v.z ? 1 : 0
    };
  }
  Vec32.greaterThan = greaterThan;
  function lessThan(u, v) {
    return {
      x: u.x < v.x ? 1 : 0,
      y: u.y < v.y ? 1 : 0,
      z: u.z < v.z ? 1 : 0
    };
  }
  Vec32.lessThan = lessThan;
  function greaterEqual(u, v) {
    return {
      x: u.x >= v.x ? 1 : 0,
      y: u.y >= v.y ? 1 : 0,
      z: u.z >= v.z ? 1 : 0
    };
  }
  Vec32.greaterEqual = greaterEqual;
  function lessEqual(u, v) {
    return {
      x: u.x <= v.x ? 1 : 0,
      y: u.y <= v.y ? 1 : 0,
      z: u.z <= v.z ? 1 : 0
    };
  }
  Vec32.lessEqual = lessEqual;
  function equal(u, v) {
    return u.x === v.x && u.y === v.y && u.z === v.z;
  }
  Vec32.equal = equal;
  function min(u, v) {
    return {
      x: Math.min(u.x, v.x),
      y: Math.min(u.y, v.y),
      z: Math.min(u.z, v.z)
    };
  }
  Vec32.min = min;
  function max(u, v) {
    return {
      x: Math.max(u.x, v.x),
      y: Math.max(u.y, v.y),
      z: Math.max(u.z, v.z)
    };
  }
  Vec32.max = max;
  function clamp(v, min2, max2) {
    return {
      x: Math.min(Math.max(v.x, min2.x), max2.x),
      y: Math.min(Math.max(v.y, min2.y), max2.y),
      z: Math.min(Math.max(v.z, min2.z), max2.z)
    };
  }
  Vec32.clamp = clamp;
  function saturate(v) {
    return {
      x: Math.min(Math.max(v.x, 0), 1),
      y: Math.min(Math.max(v.y, 0), 1),
      z: Math.min(Math.max(v.z, 0), 1)
    };
  }
  Vec32.saturate = saturate;
  function sign(v) {
    return {
      x: Math.sign(v.x),
      y: Math.sign(v.y),
      z: Math.sign(v.z)
    };
  }
  Vec32.sign = sign;
  function floor(v) {
    return {
      x: Math.floor(v.x),
      y: Math.floor(v.y),
      z: Math.floor(v.z)
    };
  }
  Vec32.floor = floor;
  function ceil(v) {
    return {
      x: Math.ceil(v.x),
      y: Math.ceil(v.y),
      z: Math.ceil(v.z)
    };
  }
  Vec32.ceil = ceil;
  function frac(v) {
    return {
      x: v.x - Math.floor(v.x),
      y: v.y - Math.floor(v.y),
      z: v.z - Math.floor(v.z)
    };
  }
  Vec32.frac = frac;
  function round(v) {
    return {
      x: Math.round(v.x),
      y: Math.round(v.y),
      z: Math.round(v.z)
    };
  }
  Vec32.round = round;
  function mod(u, v) {
    return {
      x: u.x % v.x,
      y: u.y % v.y,
      z: u.z % v.z
    };
  }
  Vec32.mod = mod;
  function neg(v) {
    return {
      x: -v.x,
      y: -v.y,
      z: -v.z
    };
  }
  Vec32.neg = neg;
  function abs(v) {
    return {
      x: Math.abs(v.x),
      y: Math.abs(v.y),
      z: Math.abs(v.z)
    };
  }
  Vec32.abs = abs;
  function add(v, ...args) {
    for (const arg of args) v = {
      x: v.x + arg.x,
      y: v.y + arg.y,
      z: v.z + arg.z
    };
    return v;
  }
  Vec32.add = add;
  function sub(v, ...args) {
    for (const arg of args) v = {
      x: v.x - arg.x,
      y: v.y - arg.y,
      z: v.z - arg.z
    };
    return v;
  }
  Vec32.sub = sub;
  function mul(v, m) {
    if (isVector3(m)) return {
      x: v.x * m.x,
      y: v.y * m.y,
      z: v.z * m.z
    };
    else return {
      x: v.x * m,
      y: v.y * m,
      z: v.z * m
    };
  }
  Vec32.mul = mul;
  function div(v, m) {
    if (isVector3(m)) return {
      x: v.x / m.x,
      y: v.y / m.y,
      z: v.z / m.z
    };
    else return {
      x: v.x / m,
      y: v.y / m,
      z: v.z / m
    };
  }
  Vec32.div = div;
  function sqrt(v) {
    return {
      x: Math.sqrt(v.x),
      y: Math.sqrt(v.y),
      z: Math.sqrt(v.z)
    };
  }
  Vec32.sqrt = sqrt;
  function exp(v) {
    return {
      x: Math.exp(v.x),
      y: Math.exp(v.y),
      z: Math.exp(v.z)
    };
  }
  Vec32.exp = exp;
  function exp2(v) {
    return {
      x: Math.pow(2, v.x),
      y: Math.pow(2, v.y),
      z: Math.pow(2, v.z)
    };
  }
  Vec32.exp2 = exp2;
  function log(v) {
    return {
      x: Math.log(v.x),
      y: Math.log(v.y),
      z: Math.log(v.z)
    };
  }
  Vec32.log = log;
  function log2(v) {
    return {
      x: Math.log2(v.x),
      y: Math.log2(v.y),
      z: Math.log2(v.z)
    };
  }
  Vec32.log2 = log2;
  function log10(v) {
    return {
      x: Math.log10(v.x),
      y: Math.log10(v.y),
      z: Math.log10(v.z)
    };
  }
  Vec32.log10 = log10;
  function pow(v, p) {
    if (isVector3(p)) return {
      x: Math.pow(v.x, p.x),
      y: Math.pow(v.y, p.y),
      z: Math.pow(v.z, p.z)
    };
    else return {
      x: Math.pow(v.x, p),
      y: Math.pow(v.y, p),
      z: Math.pow(v.z, p)
    };
  }
  Vec32.pow = pow;
  function sin(v) {
    return {
      x: Math.sin(v.x),
      y: Math.sin(v.y),
      z: Math.sin(v.z)
    };
  }
  Vec32.sin = sin;
  function asin(v) {
    return {
      x: Math.asin(v.x),
      y: Math.asin(v.y),
      z: Math.asin(v.z)
    };
  }
  Vec32.asin = asin;
  function sinh(v) {
    return {
      x: Math.sinh(v.x),
      y: Math.sinh(v.y),
      z: Math.sinh(v.z)
    };
  }
  Vec32.sinh = sinh;
  function asinh(v) {
    return {
      x: Math.asinh(v.x),
      y: Math.asinh(v.y),
      z: Math.asinh(v.z)
    };
  }
  Vec32.asinh = asinh;
  function cos(v) {
    return {
      x: Math.cos(v.x),
      y: Math.cos(v.y),
      z: Math.cos(v.z)
    };
  }
  Vec32.cos = cos;
  function acos(v) {
    return {
      x: Math.acos(v.x),
      y: Math.acos(v.y),
      z: Math.acos(v.z)
    };
  }
  Vec32.acos = acos;
  function cosh(v) {
    return {
      x: Math.cosh(v.x),
      y: Math.cosh(v.y),
      z: Math.cosh(v.z)
    };
  }
  Vec32.cosh = cosh;
  function acosh(v) {
    return {
      x: Math.acosh(v.x),
      y: Math.acosh(v.y),
      z: Math.acosh(v.z)
    };
  }
  Vec32.acosh = acosh;
  function tan(v) {
    return {
      x: Math.tan(v.x),
      y: Math.tan(v.y),
      z: Math.tan(v.z)
    };
  }
  Vec32.tan = tan;
  function atan(v) {
    return {
      x: Math.atan(v.x),
      y: Math.atan(v.y),
      z: Math.atan(v.z)
    };
  }
  Vec32.atan = atan;
  function tanh(v) {
    return {
      x: Math.tanh(v.x),
      y: Math.tanh(v.y),
      z: Math.tanh(v.z)
    };
  }
  Vec32.tanh = tanh;
  function atanh(v) {
    return {
      x: Math.atanh(v.x),
      y: Math.atanh(v.y),
      z: Math.atanh(v.z)
    };
  }
  Vec32.atanh = atanh;
  function above(v, s = 1) {
    return add(v, mul(Vec32.Up, s));
  }
  Vec32.above = above;
  function below(v, s = 1) {
    return add(v, mul(Vec32.Down, s));
  }
  Vec32.below = below;
  function north(v, s = 1) {
    return add(v, mul(Vec32.North, s));
  }
  Vec32.north = north;
  function south(v, s = 1) {
    return add(v, mul(Vec32.South, s));
  }
  Vec32.south = south;
  function east(v, s = 1) {
    return add(v, mul(Vec32.East, s));
  }
  Vec32.east = east;
  function west(v, s = 1) {
    return add(v, mul(Vec32.West, s));
  }
  Vec32.west = west;
  function dot(u, v) {
    return u.x * v.x + u.y * v.y + u.z * v.z;
  }
  Vec32.dot = dot;
  function cross(u, v) {
    return {
      x: u.y * v.z - u.z * v.y,
      y: u.z * v.x - u.x * v.z,
      z: u.x * v.y - u.y * v.x
    };
  }
  Vec32.cross = cross;
  function length(v) {
    return Math.hypot(v.x, v.y, v.z);
  }
  Vec32.length = length;
  function normalize(v) {
    return div(v, length(v));
  }
  Vec32.normalize = normalize;
  function distance(u, v) {
    return length(sub(u, v));
  }
  Vec32.distance = distance;
  function project(u, v) {
    return mul(v, dot(u, v) / dot(v, v));
  }
  Vec32.project = project;
  function reject(u, v) {
    return sub(u, project(u, v));
  }
  Vec32.reject = reject;
  function reflect(i, n) {
    return sub(i, mul(n, 2 * dot(n, i)));
  }
  Vec32.reflect = reflect;
  function refract(i, n, eta) {
    const cosi = -dot(i, n);
    const sin2t = eta * eta * (1 - cosi * cosi);
    const cost = Math.sqrt(1 - sin2t);
    return add(mul(i, eta), mul(n, eta * cosi - cost));
  }
  Vec32.refract = refract;
  function lerp(u, v, t) {
    if (t === 0) return u;
    if (t === 1) return v;
    return {
      x: u.x + t * (v.x - u.x),
      y: u.y + t * (v.y - u.y),
      z: u.z + t * (v.z - u.z)
    };
  }
  Vec32.lerp = lerp;
  function slerp(u, v, t) {
    if (t === 0) return u;
    if (t === 1) return v;
    const cost = dot(u, v);
    const theta = Math.acos(cost);
    const sint = Math.sqrt(1 - cost * cost);
    const tu = Math.sin((1 - t) * theta) / sint;
    const tv = Math.sin(t * theta) / sint;
    return add(mul(u, tu), mul(v, tv));
  }
  Vec32.slerp = slerp;
  function rotate(v, k, t) {
    const cost = Math.cos(t), sint = Math.sin(t);
    const par = mul(k, dot(v, k)), per = sub(v, par), kxv = cross(k, v);
    return add(par, add(mul(per, cost), mul(kxv, sint)));
  }
  Vec32.rotate = rotate;
})(Vec3 || (Vec3 = {}));

// src/matrix3.ts
var Mat3;
((Mat32) => {
  Mat32.Identity = {
    m11: 1,
    m12: 0,
    m13: 0,
    m21: 0,
    m22: 1,
    m23: 0,
    m31: 0,
    m32: 0,
    m33: 1
  };
  function isMatrix3(m) {
    return typeof m === "object" && "m11" in m && "m12" in m && "m13" in m && "m21" in m && "m22" in m && "m23" in m && "m31" in m && "m32" in m && "m33" in m;
  }
  Mat32.isMatrix3 = isMatrix3;
  function from(u, v, w) {
    if (Array.isArray(u) && u.length >= 9) return {
      m11: u[0],
      m12: u[1],
      m13: u[2],
      m21: u[3],
      m22: u[4],
      m23: u[5],
      m31: u[6],
      m32: u[7],
      m33: u[8]
    };
    if (Vec3.isVector3(u) && v && w) return {
      m11: u.x,
      m12: v.x,
      m13: w.x,
      m21: u.y,
      m22: v.y,
      m23: w.y,
      m31: u.z,
      m32: v.z,
      m33: w.z
    };
    throw new Error("Invalid input values for vector construction.");
  }
  Mat32.from = from;
  function c1(m) {
    return {
      x: m.m11,
      y: m.m21,
      z: m.m31
    };
  }
  Mat32.c1 = c1;
  function c2(m) {
    return {
      x: m.m12,
      y: m.m22,
      z: m.m32
    };
  }
  Mat32.c2 = c2;
  function c3(m) {
    return {
      x: m.m13,
      y: m.m23,
      z: m.m33
    };
  }
  Mat32.c3 = c3;
  function r1(m) {
    return {
      x: m.m11,
      y: m.m12,
      z: m.m13
    };
  }
  Mat32.r1 = r1;
  function r2(m) {
    return {
      x: m.m21,
      y: m.m22,
      z: m.m23
    };
  }
  Mat32.r2 = r2;
  function r3(m) {
    return {
      x: m.m31,
      y: m.m32,
      z: m.m33
    };
  }
  Mat32.r3 = r3;
  function mul(m, t) {
    if (isMatrix3(t)) return {
      m11: Vec3.dot(r1(m), c1(t)),
      m12: Vec3.dot(r1(m), c2(t)),
      m13: Vec3.dot(r1(m), c3(t)),
      m21: Vec3.dot(r2(m), c1(t)),
      m22: Vec3.dot(r2(m), c2(t)),
      m23: Vec3.dot(r2(m), c3(t)),
      m31: Vec3.dot(r3(m), c1(t)),
      m32: Vec3.dot(r3(m), c2(t)),
      m33: Vec3.dot(r3(m), c3(t))
    };
    else if (Vec3.isVector3(t)) return {
      x: Vec3.dot(r1(m), t),
      y: Vec3.dot(r2(m), t),
      z: Vec3.dot(r3(m), t)
    };
    else return {
      m11: m.m11 * t,
      m12: m.m12 * t,
      m13: m.m13 * t,
      m21: m.m21 * t,
      m22: m.m22 * t,
      m23: m.m23 * t,
      m31: m.m31 * t,
      m32: m.m32 * t,
      m33: m.m33 * t
    };
  }
  Mat32.mul = mul;
  function trace(m) {
    return m.m11 + m.m22 + m.m33;
  }
  Mat32.trace = trace;
  function determinant(m) {
    return m.m11 * m.m22 * m.m33 + m.m21 * m.m32 * m.m13 + m.m31 * m.m12 * m.m23 - m.m13 * m.m22 * m.m31 - m.m23 * m.m32 * m.m11 - m.m33 * m.m12 * m.m21;
  }
  Mat32.determinant = determinant;
  function transpose(m) {
    return {
      m11: m.m11,
      m12: m.m21,
      m13: m.m31,
      m21: m.m12,
      m22: m.m22,
      m23: m.m32,
      m31: m.m13,
      m32: m.m23,
      m33: m.m33
    };
  }
  Mat32.transpose = transpose;
  function cofactor(m) {
    return {
      m11: m.m22 * m.m33 - m.m23 * m.m32,
      m12: m.m23 * m.m31 - m.m21 * m.m33,
      m13: m.m21 * m.m32 - m.m22 * m.m31,
      m21: m.m13 * m.m32 - m.m12 * m.m33,
      m22: m.m11 * m.m33 - m.m13 * m.m31,
      m23: m.m12 * m.m31 - m.m11 * m.m32,
      m31: m.m12 * m.m23 - m.m13 * m.m22,
      m32: m.m13 * m.m21 - m.m11 * m.m23,
      m33: m.m11 * m.m22 - m.m12 * m.m21
    };
  }
  Mat32.cofactor = cofactor;
  function adjugate(m) {
    return {
      m11: m.m22 * m.m33 - m.m23 * m.m32,
      m12: m.m13 * m.m32 - m.m12 * m.m33,
      m13: m.m12 * m.m23 - m.m13 * m.m22,
      m21: m.m23 * m.m31 - m.m21 * m.m33,
      m22: m.m11 * m.m33 - m.m13 * m.m31,
      m23: m.m13 * m.m21 - m.m11 * m.m23,
      m31: m.m21 * m.m32 - m.m22 * m.m31,
      m32: m.m12 * m.m31 - m.m11 * m.m32,
      m33: m.m11 * m.m22 - m.m12 * m.m21
    };
  }
  Mat32.adjugate = adjugate;
  function inverse(m) {
    const det = determinant(m);
    if (det === 0) throw new Error("Matrix is not invertible.");
    return mul(adjugate(m), 1 / det);
  }
  Mat32.inverse = inverse;
  function buildTNB(n) {
    const t = Math.abs(n.y) === 1 ? Vec3.East : Vec3.normalize(Vec3.from(n.z, 0, -n.x));
    const b = Vec3.cross(t, n);
    return from(t, n, b);
  }
  Mat32.buildTNB = buildTNB;
})(Mat3 || (Mat3 = {}));

// src/matrix2.ts
var Mat2;
((Mat22) => {
  Mat22.Identity = {
    m11: 1,
    m12: 0,
    m21: 0,
    m22: 1
  };
  function isMatrix2(m) {
    return typeof m === "object" && "m11" in m && "m12" in m && "m21" in m && "m22" in m;
  }
  Mat22.isMatrix2 = isMatrix2;
  function from(u, v) {
    if (Array.isArray(u) && u.length >= 4) return {
      m11: u[0],
      m12: u[1],
      m21: u[2],
      m22: u[3]
    };
    if (Vec2.isVector2(u) && v) return {
      m11: u.x,
      m12: v.x,
      m21: u.y,
      m22: v.y
    };
    throw new Error("Invalid input values for vector construction.");
  }
  Mat22.from = from;
  function c1(m) {
    return {
      x: m.m11,
      y: m.m21
    };
  }
  Mat22.c1 = c1;
  function c2(m) {
    return {
      x: m.m12,
      y: m.m22
    };
  }
  Mat22.c2 = c2;
  function r1(m) {
    return {
      x: m.m11,
      y: m.m12
    };
  }
  Mat22.r1 = r1;
  function r2(m) {
    return {
      x: m.m21,
      y: m.m22
    };
  }
  Mat22.r2 = r2;
  function mul(m, t) {
    if (isMatrix2(t)) return {
      m11: Vec2.dot(r1(m), c1(t)),
      m12: Vec2.dot(r1(m), c2(t)),
      m21: Vec2.dot(r2(m), c1(t)),
      m22: Vec2.dot(r2(m), c2(t))
    };
    else if (Vec2.isVector2(t)) return {
      x: Vec2.dot(r1(m), t),
      y: Vec2.dot(r2(m), t)
    };
    else return {
      m11: m.m11 * t,
      m12: m.m12 * t,
      m21: m.m21 * t,
      m22: m.m22 * t
    };
  }
  Mat22.mul = mul;
  function trace(m) {
    return m.m11 + m.m22;
  }
  Mat22.trace = trace;
  function determinant(m) {
    return m.m11 * m.m22 - m.m12 * m.m21;
  }
  Mat22.determinant = determinant;
  function transpose(m) {
    return {
      m11: m.m11,
      m12: m.m21,
      m21: m.m12,
      m22: m.m22
    };
  }
  Mat22.transpose = transpose;
  function cofactor(m) {
    return {
      m11: m.m22,
      m12: -m.m21,
      m21: -m.m12,
      m22: m.m11
    };
  }
  Mat22.cofactor = cofactor;
  function adjugate(m) {
    return {
      m11: m.m22,
      m12: -m.m12,
      m21: -m.m21,
      m22: m.m11
    };
  }
  Mat22.adjugate = adjugate;
  function inverse(m) {
    const det = determinant(m);
    if (det === 0) throw new Error("Matrix is not invertible.");
    return mul(adjugate(m), 1 / det);
  }
  Mat22.inverse = inverse;
})(Mat2 || (Mat2 = {}));

// src/vector2.ts
var Vec2;
((Vec22) => {
  Vec22.Zero = { x: 0, y: 0 };
  Vec22.One = { x: 1, y: 1 };
  Vec22.Up = { x: 0, y: 1 };
  Vec22.Down = { x: 0, y: -1 };
  Vec22.Left = { x: -1, y: 0 };
  Vec22.Right = { x: 1, y: 0 };
  Vec22.X = Vec22.Right;
  Vec22.Y = Vec22.Up;
  function isVector2(v) {
    return typeof v === "object" && "x" in v && "y" in v;
  }
  Vec22.isVector2 = isVector2;
  function from(x, y) {
    if (Array.isArray(x) && x.length >= 2) return {
      x: x[0],
      y: x[1]
    };
    else if (typeof x === "number") return {
      x,
      y: y ?? x
    };
    throw new Error("Invalid input values for vector construction.");
  }
  Vec22.from = from;
  function fromVectorXZ(v) {
    return {
      x: v.x,
      y: v.z
    };
  }
  Vec22.fromVectorXZ = fromVectorXZ;
  function toVectorXZ(v) {
    return {
      x: v.x,
      z: v.y
    };
  }
  Vec22.toVectorXZ = toVectorXZ;
  function toArray(v) {
    const { x, y } = v;
    return [x, y];
  }
  Vec22.toArray = toArray;
  function toString(v) {
    return toArray(v).join(" ");
  }
  Vec22.toString = toString;
  function parse(s) {
    const [x, y] = s.split(" ").map(Number);
    return { x, y };
  }
  Vec22.parse = parse;
  function isNaN(v) {
    return Number.isNaN(v.x) || Number.isNaN(v.y);
  }
  Vec22.isNaN = isNaN;
  function isInf(v) {
    return !isFinite(v);
  }
  Vec22.isInf = isInf;
  function isFinite(v) {
    return Number.isFinite(v.x) && Number.isFinite(v.y);
  }
  Vec22.isFinite = isFinite;
  function any(v) {
    return v.x !== 0 || v.y !== 0;
  }
  Vec22.any = any;
  function all(v) {
    return v.x !== 0 && v.y !== 0;
  }
  Vec22.all = all;
  function greaterThan(u, v) {
    return {
      x: u.x > v.x ? 1 : 0,
      y: u.y > v.y ? 1 : 0
    };
  }
  Vec22.greaterThan = greaterThan;
  function lessThan(u, v) {
    return {
      x: u.x < v.x ? 1 : 0,
      y: u.y < v.y ? 1 : 0
    };
  }
  Vec22.lessThan = lessThan;
  function greaterEqual(u, v) {
    return {
      x: u.x >= v.x ? 1 : 0,
      y: u.y >= v.y ? 1 : 0
    };
  }
  Vec22.greaterEqual = greaterEqual;
  function lessEqual(u, v) {
    return {
      x: u.x <= v.x ? 1 : 0,
      y: u.y <= v.y ? 1 : 0
    };
  }
  Vec22.lessEqual = lessEqual;
  function equal(u, v) {
    return u.x === v.x && u.y === v.y;
  }
  Vec22.equal = equal;
  function min(u, v) {
    return {
      x: Math.min(u.x, v.x),
      y: Math.min(u.y, v.y)
    };
  }
  Vec22.min = min;
  function max(u, v) {
    return {
      x: Math.max(u.x, v.x),
      y: Math.max(u.y, v.y)
    };
  }
  Vec22.max = max;
  function clamp(v, min2, max2) {
    return {
      x: Math.min(Math.max(v.x, min2.x), max2.x),
      y: Math.min(Math.max(v.y, min2.y), max2.y)
    };
  }
  Vec22.clamp = clamp;
  function saturate(v) {
    return {
      x: Math.min(Math.max(v.x, 0), 1),
      y: Math.min(Math.max(v.y, 0), 1)
    };
  }
  Vec22.saturate = saturate;
  function sign(v) {
    return {
      x: Math.sign(v.x),
      y: Math.sign(v.y)
    };
  }
  Vec22.sign = sign;
  function floor(v) {
    return {
      x: Math.floor(v.x),
      y: Math.floor(v.y)
    };
  }
  Vec22.floor = floor;
  function ceil(v) {
    return {
      x: Math.ceil(v.x),
      y: Math.ceil(v.y)
    };
  }
  Vec22.ceil = ceil;
  function frac(v) {
    return {
      x: v.x - Math.floor(v.x),
      y: v.y - Math.floor(v.y)
    };
  }
  Vec22.frac = frac;
  function round(v) {
    return {
      x: Math.round(v.x),
      y: Math.round(v.y)
    };
  }
  Vec22.round = round;
  function mod(u, v) {
    return {
      x: u.x % v.x,
      y: u.y % v.y
    };
  }
  Vec22.mod = mod;
  function neg(v) {
    return {
      x: -v.x,
      y: -v.y
    };
  }
  Vec22.neg = neg;
  function abs(v) {
    return {
      x: Math.abs(v.x),
      y: Math.abs(v.y)
    };
  }
  Vec22.abs = abs;
  function add(v, ...args) {
    for (const arg of args) v = {
      x: v.x + arg.x,
      y: v.y + arg.y
    };
    return v;
  }
  Vec22.add = add;
  function sub(v, ...args) {
    for (const arg of args) v = {
      x: v.x - arg.x,
      y: v.y - arg.y
    };
    return v;
  }
  Vec22.sub = sub;
  function mul(v, m) {
    if (isVector2(m)) return {
      x: v.x * m.x,
      y: v.y * m.y
    };
    else return {
      x: v.x * m,
      y: v.y * m
    };
  }
  Vec22.mul = mul;
  function div(v, m) {
    if (isVector2(m)) return {
      x: v.x / m.x,
      y: v.y / m.y
    };
    else return {
      x: v.x / m,
      y: v.y / m
    };
  }
  Vec22.div = div;
  function sqrt(v) {
    return {
      x: Math.sqrt(v.x),
      y: Math.sqrt(v.y)
    };
  }
  Vec22.sqrt = sqrt;
  function exp(v) {
    return {
      x: Math.exp(v.x),
      y: Math.exp(v.y)
    };
  }
  Vec22.exp = exp;
  function exp2(v) {
    return {
      x: Math.pow(2, v.x),
      y: Math.pow(2, v.y)
    };
  }
  Vec22.exp2 = exp2;
  function log(v) {
    return {
      x: Math.log(v.x),
      y: Math.log(v.y)
    };
  }
  Vec22.log = log;
  function log2(v) {
    return {
      x: Math.log2(v.x),
      y: Math.log2(v.y)
    };
  }
  Vec22.log2 = log2;
  function log10(v) {
    return {
      x: Math.log10(v.x),
      y: Math.log10(v.y)
    };
  }
  Vec22.log10 = log10;
  function pow(v, p) {
    if (isVector2(p)) return {
      x: Math.pow(v.x, p.x),
      y: Math.pow(v.y, p.y)
    };
    else return {
      x: Math.pow(v.x, p),
      y: Math.pow(v.y, p)
    };
  }
  Vec22.pow = pow;
  function sin(v) {
    return {
      x: Math.sin(v.x),
      y: Math.sin(v.y)
    };
  }
  Vec22.sin = sin;
  function asin(v) {
    return {
      x: Math.asin(v.x),
      y: Math.asin(v.y)
    };
  }
  Vec22.asin = asin;
  function sinh(v) {
    return {
      x: Math.sinh(v.x),
      y: Math.sinh(v.y)
    };
  }
  Vec22.sinh = sinh;
  function asinh(v) {
    return {
      x: Math.asinh(v.x),
      y: Math.asinh(v.y)
    };
  }
  Vec22.asinh = asinh;
  function cos(v) {
    return {
      x: Math.cos(v.x),
      y: Math.cos(v.y)
    };
  }
  Vec22.cos = cos;
  function acos(v) {
    return {
      x: Math.acos(v.x),
      y: Math.acos(v.y)
    };
  }
  Vec22.acos = acos;
  function cosh(v) {
    return {
      x: Math.cosh(v.x),
      y: Math.cosh(v.y)
    };
  }
  Vec22.cosh = cosh;
  function acosh(v) {
    return {
      x: Math.acosh(v.x),
      y: Math.acosh(v.y)
    };
  }
  Vec22.acosh = acosh;
  function tan(v) {
    return {
      x: Math.tan(v.x),
      y: Math.tan(v.y)
    };
  }
  Vec22.tan = tan;
  function atan(v) {
    return {
      x: Math.atan(v.x),
      y: Math.atan(v.y)
    };
  }
  Vec22.atan = atan;
  function tanh(v) {
    return {
      x: Math.tanh(v.x),
      y: Math.tanh(v.y)
    };
  }
  Vec22.tanh = tanh;
  function atanh(v) {
    return {
      x: Math.atanh(v.x),
      y: Math.atanh(v.y)
    };
  }
  Vec22.atanh = atanh;
  function dot(u, v) {
    return u.x * v.x + u.y * v.y;
  }
  Vec22.dot = dot;
  function wedge(u, v) {
    return u.x * v.y - u.y * v.x;
  }
  Vec22.wedge = wedge;
  function length(v) {
    return Math.hypot(v.x, v.y);
  }
  Vec22.length = length;
  function normalize(v) {
    return div(v, length(v));
  }
  Vec22.normalize = normalize;
  function distance(u, v) {
    return length(sub(u, v));
  }
  Vec22.distance = distance;
  function project(u, v) {
    return mul(v, dot(u, v) / dot(v, v));
  }
  Vec22.project = project;
  function reject(u, v) {
    return sub(u, project(u, v));
  }
  Vec22.reject = reject;
  function reflect(i, n) {
    return sub(i, mul(n, 2 * dot(n, i)));
  }
  Vec22.reflect = reflect;
  function refract(i, n, e) {
    const cosi = -dot(i, n);
    const sin2t = e * e * (1 - cosi * cosi);
    const cost = Math.sqrt(1 - sin2t);
    return add(mul(i, e), mul(n, e * cosi - cost));
  }
  Vec22.refract = refract;
  function lerp(u, v, t) {
    if (t === 0) return u;
    if (t === 1) return v;
    return {
      x: u.x + t * (v.x - u.x),
      y: u.y + t * (v.y - u.y)
    };
  }
  Vec22.lerp = lerp;
  function slerp(u, v, t) {
    if (t === 0) return u;
    if (t === 1) return v;
    const cost = dot(u, v);
    const theta = Math.acos(cost);
    const sint = Math.sqrt(1 - cost * cost);
    const tu = Math.sin((1 - t) * theta) / sint;
    const tv = Math.sin(t * theta) / sint;
    return add(mul(u, tu), mul(v, tv));
  }
  Vec22.slerp = slerp;
  function rotate(v, t) {
    const cost = Math.cos(t), sint = Math.sin(t);
    const rot = Mat2.from([
      cost,
      -sint,
      sint,
      cost
    ]);
    return Mat2.mul(rot, v);
  }
  Vec22.rotate = rotate;
})(Vec2 || (Vec2 = {}));

// src/randvec.ts
var RandVec;
((RandVec2) => {
  function random2() {
    return {
      x: Math.random(),
      y: Math.random()
    };
  }
  RandVec2.random2 = random2;
  function random3() {
    return {
      x: Math.random(),
      y: Math.random(),
      z: Math.random()
    };
  }
  RandVec2.random3 = random3;
  function circle() {
    const phi = Math.random() * Math.PI * 2;
    return {
      x: Math.cos(phi),
      y: Math.sin(phi)
    };
  }
  RandVec2.circle = circle;
  function disk() {
    const rand = random2();
    const phi = rand.x * Math.PI * 2;
    const radius = Math.sqrt(rand.y);
    return {
      x: radius * Math.cos(phi),
      y: radius * Math.sin(phi)
    };
  }
  RandVec2.disk = disk;
  function sphere() {
    const rand = random2();
    const phi = rand.x * Math.PI * 2;
    const sint = 2 * Math.sqrt(rand.y * (1 - rand.y));
    return {
      x: Math.cos(phi) * sint,
      y: 1 - 2 * rand.y,
      z: Math.sin(phi) * sint
    };
  }
  RandVec2.sphere = sphere;
  function hemisphere() {
    const rand = random2();
    const phi = rand.x * Math.PI * 2;
    const sint = Math.sqrt(rand.y * (2 - rand.y));
    return {
      x: Math.cos(phi) * sint,
      y: 1 - rand.y,
      z: Math.sin(phi) * sint
    };
  }
  RandVec2.hemisphere = hemisphere;
  function cosHemisphere() {
    const rand = random2();
    const phi = rand.x * Math.PI * 2;
    const sint = Math.sqrt(rand.y);
    return {
      x: Math.cos(phi) * sint,
      y: Math.sqrt(1 - rand.y),
      z: Math.sin(phi) * sint
    };
  }
  RandVec2.cosHemisphere = cosHemisphere;
  function cap(t) {
    const rand = random2();
    const phi = rand.x * Math.PI * 2;
    const u = rand.y * (1 - Math.cos(t));
    const sint = Math.sqrt(u * (2 - u));
    return {
      x: Math.cos(phi) * sint,
      y: 1 - u,
      z: Math.sin(phi) * sint
    };
  }
  RandVec2.cap = cap;
})(RandVec || (RandVec = {}));
export {
  Mat2,
  Mat3,
  RandVec,
  Vec2,
  Vec3
};
