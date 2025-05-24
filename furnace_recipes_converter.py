import json
import os
from pathlib import Path
def convert(path):
    p = Path(path)
    for file in p.rglob("*"):
        if(os.path.isfile(file)):
            with open(file, 'r+', encoding='utf-8') as file1:
                if file1:
                    try:
                        data1 = json.load(file1)
                        if(data1["minecraft:recipe_furnace"]):
                            with open("recipes_file", "r+", encoding='utf-8') as recipes:
                                #"recipes_file" is a path to file with finished recipes array
                                #add to that file {}
                                data = json.load(recipes)
                                data = json.dumps(data)
                                data = json.loads(data)
                                print("suuus")
                                key = data1["minecraft:recipe_furnace"]["input"]
                                print(data1["minecraft:recipe_furnace"]["input"]) 
                                data[key] = data1["minecraft:recipe_furnace"]["output"]
                                print(data)
                                recipes.seek(0)
                                json.dump(data, recipes, indent=3)
                    except:
                        continue
                else:
                    continue
        else:
            convert(file)

convert("path")
#"path" is a path to repository with furnace recipes
     

                
