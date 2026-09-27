class Liquid {
    type;
    constructor(type) {
    this.type = type;
    };
    get getType() {
        return this.type
    };
    get getBlock() {
        return `cosmos:liquid_${this.type}`;
    };
    static OIL = new Liquid("oil");
    static FUEL = new Liquid("fuel");
}