import { predict, convert_sample_to_array } from './model.js';
import axios from 'axios';
import { create_initial_state } from '../data/init.js';
import { update_with_frame } from '../data/update.js';
import { deep_copy } from '../data/utils.js';
import { readFile } from 'fs/promises';
import send_server_error from './network.js';
import { find_participant_with_puuid } from './utils.js';

const rune_data = JSON.parse(await readFile('./server/runes.json', 'utf-8'));

export default async function match_analysis(req, res) {
    const { id, puuid } = req.query;

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

        const player = find_participant_with_puuid(game.data.info.participants, puuid);

        const runes = {
            primaryTree: {
                keystone: find_rune_with_id(player.perks.styles[0].selections[0].perk),
                subs: [
                    find_rune_with_id(player.perks.styles[0].selections[1].perk),
                    find_rune_with_id(player.perks.styles[0].selections[2].perk),
                    find_rune_with_id(player.perks.styles[0].selections[3].perk),
                ],
            },
            secondaryTree: {
                subs: [
                    find_rune_with_id(player.perks.styles[1].selections[0].perk),
                    find_rune_with_id(player.perks.styles[1].selections[1].perk),
                ],
            },
            statPerks: [find_rune_with_id(player.perks.statPerks.offense), find_rune_with_id(player.perks.statPerks.flex), find_rune_with_id(player.perks.statPerks.defense)],
        }

        const items = get_participant_item_purchases(timeline.data.info.frames, player.participantId);

        const frames = parse_condensed_frames(states);

        res.json({ probabilities, runes, items, frames });
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

function find_rune_with_id(id) {
    if (id == 5001) {
        return '/images/stats/statmodshealthplusicon.png';
    } else if (id == 5008) {
        return '/images/stats/statmodsadaptiveforceicon.png';
    } else if (id == 5005) {
        return '/images/stats/statmodsattackspeedicon.png';
    } else if (id == 5007) {
        return '/images/stats/statmodscdrscalingicon.png';
    } else if (id == 5001) {
        return '/images/stats/statsmodshealthscalingicon.png';
    } else if (id == 5013) {
        return '/images/stats/statsmodstenacityicon.png';
    } else if (id == 5010) {
        return '/images/stats/statsmodsmovementspeedicon.png';
    }
    for (const branch of rune_data) {
        for (const slot of branch.slots) {
            for (const rune of slot.runes) {
                if (id == rune.id) {
                    return rune.icon;
                }
            }
        }
    }
    return null;
}

function get_participant_item_purchases(frames, participant_id) {
    const items = [];
    for (const frame of frames) {
        for (const event of frame.events) {
            if (event.type === 'ITEM_PURCHASED' && event.participantId == participant_id) {
                items.push(event.itemId);
            }
        }
    }
    return items;
}

function parse_condensed_frames(states) {
    const frames = [];
    for (const state of states) {
        const frame = [];
        for (const team of state.teams) {
            for (const player of team.players) {
                const { champion, kills, deaths, assists, creepscore, deathTimer, x, y } = player;
                frame.push({ champion, kills, deaths, assists, creepscore, deathTimer, x, y });
            }
        }
        frames.push(frame);
    }
    return frames;
}
