import { deep_copy } from '../data/utils.js';
import { predict, convert_sample_to_array } from './model.js';
import { update_with_event } from '../data/update.js';

export async function get_frame_events_win_probability_deltas(state, events, win_probability) {
    const deltas = [];
    const priority_events = events.filter(event => event.type == 'CHAMPION_KILL' || event.type == 'BUILDING_KILL' || event.type == 'ELITE_MONSTER_KILL');
    for (let i = 0; i < priority_events.length; i++) {
        const state_copy = deep_copy(state);
        let killerIcon;
        let victimIcon;
        const event = priority_events[i];
        if (event.killerId == 0) {
            killerIcon = '/images/icons/minion.png';
        } else {
            const team_id = parseInt((event.killerId - 1) / 5);
            const champion = state_copy.teams[team_id].players[(event.killerId - 1) % 5].champion;
            killerIcon = '/images/icons/' + champion + '.jpg';
        }
        if (event.type == 'CHAMPION_KILL') {
            const victim_team_id = parseInt((event.victimId - 1) / 5);
            const victim = state_copy.teams[victim_team_id].players[(event.victimId - 1) % 5];
            victimIcon = '/images/icons/' + victim.champion + '.jpg';
        } else if (event.type == 'ELITE_MONSTER_KILL') {
            if (event.monsterType == 'DRAGON' && event.monsterSubType == 'ELDER_DRAGON') {
                victimIcon = '/images/icons/elder.png';
            } else {
                victimIcon = '/images/icons/' + event.monsterType.toLowerCase() + '.png';
            }
        } else if (event.type == 'BUILDING_KILL') {
            victimIcon = '/images/icons/';
            if (event.teamId == 100) {
                victimIcon += 'blue_';
            } else {
                victimIcon += 'red_';
            }
            if (event.buildingType == 'TOWER_BUILDING') {
                victimIcon += 'tower.png';
            } else {
                victimIcon += 'inhibitor.png';
            }
        }
        update_with_event(state_copy, event, true);
        const vectorized = convert_sample_to_array(state_copy);
        const prediction = await predict(vectorized);
        const delta = Math.round((prediction - win_probability) * 10000) / 100;
        deltas.push({
            left: killerIcon,
            right: victimIcon,
            delta,
            time: event.timestamp
        });
    }
    
    return deltas
        .filter(e => Math.abs(e.delta) >= 1)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, Math.min(deltas.length, 5))
        .sort((a, b) => a.time - b.time);
}