import '../data/game.js';
import express from 'express';
import { config } from 'dotenv';
import axios from 'axios';
import cors from 'cors';

config();

const app = express();
const PORT = 3000;

app.use(cors());

function send_server_error(res) {
    res.status(500).json({ error: 'Internal Server Error' });
}

app.get('/match_history/', async (req, res) => {
    const { name, tag } = req.query;

    try {
        const user = await axios.get(`https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}?api_key=${process.env.RIOT_KEY}`);
        const { puuid } = user.data;
        const history = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=20&api_key=${process.env.RIOT_KEY}`);
        const match_ids = history.data;

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
});

function find_participant_with_puuid(participants, puuid) {
    for (const p of participants) {
        if (p.puuid === puuid) {
            return p;
        }
    }
    return null;
}

function find_opponent(participants, player) {
    const position = player.teamPosition;
    for (const p of participants) {
        if (p.teamPosition === position && p.puuid !== player.puuid) {
            return p;
        }
    }
    return null;
}

app.get('/match_details/', async (req, res) => {
    const { id, puuid } = req.query;

    try {
        const game = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${process.env.RIOT_KEY}`);

        const player = find_participant_with_puuid(game.data.info.participants, puuid);
        const opponent = find_opponent(game.data.info.participants, player);

        res.json({
            player_champion: player.championName,
            opponent_champion: opponent.championName,
            win: player.win
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
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
