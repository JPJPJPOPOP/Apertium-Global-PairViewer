"""
This python script takes the pairs from pairs.txt and formats them in json format
"""

import json
import ast

if __name__ == "__main__":
    pairsFile = open("pairs.txt", "r")
    lines = pairsFile.readlines()
    jsonlist = list()
    for line in lines:
        jsonlist.append(ast.literal_eval(line.rstrip()))
    print(jsonlist)
    formattedPairsFile = open("formattedpairs.txt", "w")
    formattedPairsFile.write(json.dumps(jsonlist))
    formattedPairsFile.close()
    pairsFile.close()
