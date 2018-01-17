"""
This python script takes the pairs from pairs.txt and formats them in the following way:
- Replaces single quotes with double quotes
- Adds commas at the end of each line
- Adds [] around it
"""

if __name__ == "__main__":
    pairsFile = open("pairs.txt", "r")
    lines = pairsFile.readlines()
    formattedPairsFile = open("formattedpairs.txt", "w")
    formattedPairsFile.write("[")
    for line in lines[:-1]:
        formattedPairsFile.write(str(line).strip().replace("'", '"') + ",\n")
    formattedPairsFile.write(str(lines[-1]).strip().replace("'", '"') + "]")
    formattedPairsFile.close()
    pairsFile.close()
