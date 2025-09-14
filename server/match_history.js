import axios from 'axios';
import send_server_error from './network.js'

export default async function match_history(req, res) {
    const { name, tag, region } = req.query;

    try {
        const user = await axios.get(`https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}?api_key=${process.env.RIOT_KEY}`);
        const { puuid } = user.data;
        const history = await axios.get(`https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=20&api_key=${process.env.RIOT_KEY}`);
        const match_ids = history.data;

        if (match_ids.length == 0) {
            return res.status(403).json({ error: 'No games found'});
        }

        res.json({ puuid, match_ids });
    } catch (error) {
        if (error.response) {
            if (error.response.status === 404) {
                res.status(404).json({ error: 'User not found' });
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
