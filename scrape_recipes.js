const fs = require('fs');
const path = require('path');

const recipesDir = path.join(__dirname, 'BP', 'recipes');
const outputFile = path.join(__dirname, 'BP', 'scripts', 'recipes', 'galacticraft_crafting_recipes_data.js');

const recipeData = {};

function processRecipe(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);

        if (json['minecraft:recipe_shaped']) {
            const recipe = json['minecraft:recipe_shaped'];
            
            // Extract output item
            let outputItem = null;
            if (Array.isArray(recipe.result)) {
                outputItem = recipe.result[0].item || recipe.result[0].name || recipe.result[0];
                if (typeof outputItem === 'object' && outputItem.item) outputItem = outputItem.item;
            } else if (typeof recipe.result === 'object') {
                outputItem = recipe.result.item || recipe.result.name || Object.keys(recipe.result)[0]; // Fallback
            } else if (typeof recipe.result === 'string') {
                outputItem = recipe.result;
            }

            if (!outputItem) return;

            const ingredients = {};
            const keys = recipe.key || {};
            const pattern = recipe.pattern || [];

            for (const row of pattern) {
                for (const char of row) {
                    if (char !== ' ') {
                        const keyDef = keys[char];
                        let itemStr = null;
                        if (keyDef) {
                            if (keyDef.item) {
                                itemStr = keyDef.item;
                            } else if (keyDef.tag) {
                                itemStr = 'tag:' + keyDef.tag;
                            } else if (typeof keyDef === 'string') {
                                itemStr = keyDef;
                            }
                        }
                        
                        if (itemStr) {
                            ingredients[itemStr] = (ingredients[itemStr] || 0) + 1;
                        }
                    }
                }
            }

            if (Object.keys(ingredients).length > 0) {
                recipeData[outputItem] = ingredients;
            }

        } else if (json['minecraft:recipe_shapeless']) {
            const recipe = json['minecraft:recipe_shapeless'];
            
            let outputItem = null;
            if (Array.isArray(recipe.result)) {
                outputItem = recipe.result[0].item || recipe.result[0].name || recipe.result[0];
                if (typeof outputItem === 'object' && outputItem.item) outputItem = outputItem.item;
            } else if (typeof recipe.result === 'object') {
                outputItem = recipe.result.item || recipe.result.name;
            } else if (typeof recipe.result === 'string') {
                outputItem = recipe.result;
            }

            if (!outputItem) return;

            const ingredients = {};
            const ingredientsList = recipe.ingredients || [];
            
            for (const item of ingredientsList) {
                let itemStr = null;
                let count = 1;

                if (typeof item === 'string') {
                    itemStr = item;
                } else if (item.item) {
                    itemStr = item.item;
                    count = item.count || 1;
                } else if (item.tag) {
                    itemStr = 'tag:' + item.tag;
                    count = item.count || 1;
                }
                
                if (itemStr) {
                    ingredients[itemStr] = (ingredients[itemStr] || 0) + count;
                }
            }

            if (Object.keys(ingredients).length > 0) {
                recipeData[outputItem] = ingredients;
            }
        }
    } catch (e) {
        console.error(`Error processing ${filePath}:`, e);
    }
}

function run() {
    if (!fs.existsSync(recipesDir)) {
        console.error(`Directory not found: ${recipesDir}`);
        return;
    }

    function walkDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                walkDir(fullPath);
            } else if (file.endsWith('.json')) {
                processRecipe(fullPath);
            }
        }
    }
    walkDir(recipesDir);

    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileContent = `export const recipes = ${JSON.stringify(recipeData, null, 2)};\n`;
    fs.writeFileSync(outputFile, fileContent, 'utf-8');
    console.log(`Successfully wrote ${Object.keys(recipeData).length} recipes to ${outputFile}`);
}

run();
