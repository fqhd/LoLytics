import axios from 'axios';
import { find_participant_with_puuid, find_opponent } from './utils.js';

export default async function match_details(req, res) {
    const { id, puuid } = req.query;

    try {
        const game = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${process.env.RIOT_KEY}`);

        const player = find_participant_with_puuid(game.data.info.participants, puuid);
        const opponent = find_opponent(game.data.info.participants, player);

        res.json({
            player_champion: player.championName,
            opponent_champion: opponent.championName,
            win: player.win,
            team: player.teamId,
        });
    } catch (error) {
        if (error.response) {
            if (error.response.status === 404) {
                res.status(404).json({ error: 'Match not found' });
            } else {
                console.error('API error:', error.response.status, error.response.data);
                send_server_error(res);
            }
        } else {
            console.error('Network error:', error.message);
            send_server_error(res);
        }
    }
}
