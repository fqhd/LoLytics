import os, requests
from flask import request, jsonify
from server.utils import find_participant_with_puuid, find_opponent

# Simple in-memory cache (like JS Map)
cache = {}


def send_server_error():
    return jsonify({"error": "Internal server error"}), 500


def match_details():
    match_id = request.args.get("id")
    puuid = request.args.get("puuid")
    region = request.args.get("region")

    cache_key = f"{match_id}:{puuid}"

    # Check cache
    if cache_key in cache:
        return jsonify(cache[cache_key])

    try:
        response = requests.get(
            f"https://{region}.api.riotgames.com/lol/match/v5/matches/{match_id}",
            params={"api_key": os.getenv("RIOT_KEY")},
        )

        if response.status_code == 404:
            return jsonify({"error": "Match not found"}), 404

        response.raise_for_status()

        game_data = response.json()
        participants = game_data["info"]["participants"]

        player = find_participant_with_puuid(participants, puuid)
        opponent = find_opponent(participants, player)

        if not player or not opponent:
            return jsonify({"error": "Player data not found"}), 404

        response_data = {
            "player_champion": player.get("championName"),
            "opponent_champion": opponent.get("championName"),
            "win": player.get("win"),
            "team": player.get("teamId"),
        }

        # Store in cache
        cache[cache_key] = response_data

        return jsonify(response_data)

    except requests.exceptions.RequestException as error:
        print("API / Network error:", str(error))
        return send_server_error()
