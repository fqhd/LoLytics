import os, requests
from flask import jsonify, request
from server.network import send_server_error

def match_history():
    name = request.args.get('name')
    tag = request.args.get('tag')
    region = request.args.get('region')
    queue = request.args.get('queue')

    queue_id = {
        'soloq': 420,
        'draft': 400,
        'flex': 440,
    }.get(queue)

    try:
        user_response = requests.get(
            f'https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{name}/{tag}',
            params={'api_key': os.environ.get('RIOT_KEY')}
        )

        if user_response.status_code == 404:
            return jsonify({'error': 'User not found'}), 404

        user_response.raise_for_status()
        puuid = user_response.json()['puuid']

        history_response = requests.get(
            f'https://{region}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids',
            params={
                'queue': queue_id,
                'start': 0,
                'count': 20,
                'api_key': os.environ.get('RIOT_KEY')
            }
        )

        history_response.raise_for_status()
        match_ids = history_response.json()

        if len(match_ids) == 0:
            return jsonify({'error': 'No games found'}), 403

        return jsonify({
            'puuid': puuid,
            'match_ids': match_ids
        })

    except requests.exceptions.RequestException as error:
        print('API / Network error:', str(error))
        return send_server_error()
