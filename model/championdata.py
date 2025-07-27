# import csv
# import json

# data = [
#     ["championName", "kills", "deaths", "assists", "cs", "gold", "level", "healing", "tanking", "championDamage", "towerDamage", "top", "jungle", "mid", "bottom", "utility", "silver", "gold", "platinum"]
#     #["A", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
# ]

csv_file_path = "data.csv"

# with open("champion.json", "r", encoding= "UTF-8") as json_file:
#     champion_data = json.load(json_file)
# for x in champion_data["data"]:
#     data.append([x, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,])


# with open(csv_file_path, mode='w', newline='') as file:
#     writer = csv.writer(file)
#     writer.writerows(data)

# print(f"CSV file '{csv_file_path}' created successfully with headers.")

import csv
import json
from collections import defaultdict

champ_stats = defaultdict(lambda: {
    "games": 0,
    "wins": 0,
    "kills": 0,
    "deaths": 0,
    "assists": 0,
    "cs": 0,
    "gold": 0,
    "level": 0,
    "healing": 0,
    "tanking": 0,
    "championDamage": 0,
    "towerDamage": 0,
    "top": 0,
    "jungle": 0,
    "middle": 0,
    "bottom": 0,
    "utility": 0,
    "ranks": defaultdict(int)
})

with open("champ_data - champ_data.csv", "r", newline='', encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        champ = row["championName"].strip()
        stats = champ_stats[champ]

        stats["games"] += 1
        stats["wins"] += 1 if row["win"].lower() == "true" else 0
        stats["kills"] += int(row["kills"])
        stats["deaths"] += int(row["deaths"])
        stats["assists"] += int(row["assists"])
        stats["cs"] += int(row["cs"])
        stats["gold"] += int(row["gold"])
        stats["level"] += int(row["level"])
        stats["healing"] += int(row["healing"])
        stats["tanking"] += int(row["tanking"])
        stats["championDamage"] += int(row["championDamage"])
        stats["towerDamage"] += int(row["towerDamage"])

        role = row["role"].lower()
        if role in stats:
            stats[role] += 1

    
        rank = row["rank"].strip().upper()
        if rank in stats["ranks"]:
            stats["ranks"][rank] += 1
        else:
            stats["ranks"][rank] = 1

with open(csv_file_path, "r", newline='', encoding="utf-8") as f:
    reader = csv.reader(f)
    headers = next(reader)
    champion_rows = {row[0]: row for row in reader}

for champ, stats in champ_stats.items():
    games = stats["games"]
    if games == 0:
        continue

    if champ not in champion_rows:
        print(f"Champion {champ} not found in data.csv")
        continue

    row = champion_rows[champ]

    row[1] = f"{(stats['kills'] / games):.2f}"
    row[2] = f"{(stats['deaths'] / games):.2f}"
    row[3] = f"{(stats['assists'] / games):.2f}"
    row[4] = f"{(stats['cs'] / games):.2f}"
    row[5] = f"{(stats['gold'] / games):.2f}"
    row[6] = f"{(stats['level'] / games):.2f}"
    row[7] = f"{(stats['healing'] / games):.2f}"
    row[8] = f"{(stats['tanking'] / games):.2f}"
    row[9] = f"{(stats['championDamage'] / games):.2f}"
    row[10] = f"{(stats['towerDamage'] / games):.2f}"
    row[11] = stats["top"]
    row[12] = stats["jungle"]
    row[13] = stats["middle"]
    row[14] = stats["bottom"]
    row[15] = stats["utility"]

    silver_games = stats["ranks"].get("SILVER", 0)
    gold_games = stats["ranks"].get("GOLD", 0)
    platinum_games = stats["ranks"].get("PLATINUM", 0)
    
    row[16] = silver_games    
    row[17] = gold_games      
    row[18] = platinum_games  

with open(csv_file_path, "w", newline='', encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(champion_rows.values())

print("data.csv updated successfully.")
