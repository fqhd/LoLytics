import '../data/game.js';
import express from 'express';
import { config } from 'dotenv';
import axios from 'axios';
import cors from 'cors';
import { create_initial_state } from '../data/init.js';
import { update_with_frame } from '../data/update.js';
import { deep_copy } from '../data/utils.js';
import { readFile } from 'fs/promises';
import * as ort from 'onnxruntime-node';

let session;
ort.InferenceSession.create('./model/model.onnx').then(s => {
    session = s;
});

config();

const app = express();
const PORT = 3000;

app.use(cors());

const raw = await readFile('./model/champion_to_index.json', 'utf-8');
const champ_to_index = JSON.parse(raw);

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
});

function convert_sample_to_array(sample) {
    const arr = [];

    const dragonNames = [
        'WATER_DRAGON', 'AIR_DRAGON', 'CHEMTECH_DRAGON',
        'FIRE_DRAGON', 'HEXTECH_DRAGON', 'EARTH_DRAGON'
    ];

    const playerKeys = [
        'champion', 'kills', 'deaths', 'assists', 'baronTimer', 'elderTimer',
        'deathTimer', 'gold', 'level', 'creepscore', 'x', 'y'
    ];

    for (const team of sample.teams) {
        for (const player of team.players) {
            for (const key of playerKeys) {
                if (key === 'champion') {
                    arr.push(champ_to_index[player.champion]);
                } else if (key === 'deathTimer') {
                    arr.push(Math.round(player.deathTimer));
                } else {
                    arr.push(player[key]);
                }
            }
        }

        for (let i = 0; i < 4; i++) {
            const oneHot = [0, 0, 0, 0, 0, 0];
            if (i < team.drakes.length) {
                const name = team.drakes[i];
                const index = dragonNames.indexOf(name);
                if (index !== -1) oneHot[index] = 1;
            }
            arr.push(...oneHot);
        }

        arr.push(team.rifts);
        arr.push(team.atakhan);
        arr.push(team.grubs);
        arr.push(...team.towers);
        arr.push(...team.inhibs);
    }

    arr.push(sample.time);

    return arr;
}

async function predict(data) {
    const input_array = new Int32Array(data);
    const input_tensor = new ort.Tensor('int32', input_array, [1, 203])
    const feeds = { input: input_tensor };
    const results = await session.run(feeds);
    const outputs = results['output'];
    return outputs.cpuData[0];
}

app.get('/match_analysis', async (req, res) => {
    const { id } = req.query;

    try {
        const game = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${process.env.RIOT_KEY}`);
        const timeline = await axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/${id}/timeline?api_key=${process.env.RIOT_KEY}`);

        const state = create_initial_state(game.data);

        const states = [];
        for (const frame of timeline.data.info.frames) {
            update_with_frame(state, frame);
            const parsed_state = deep_copy(state);
            states.push(parsed_state);
        }

        let probabilities = [];
        for (const state of states) {
            const vectorized = convert_sample_to_array(state);
            const prediction = await predict(vectorized);
            probabilities.push(prediction);
        }

        res.json({ probabilities });
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
