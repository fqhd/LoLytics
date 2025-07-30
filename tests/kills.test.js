import { describe, it, expect } from 'vitest';
import { process_champion_kill } from '../data/kills.js';

describe('process_champion_kill', () => {
    const event = {
        killerId: 6,
        victimId: 5,
        assistingParticipantIds: [2, 1, 8, 7]
    };

    const state = {
        teams: [
            {
                players: [
                    {kills: 0, deaths: 0, assists: 0, level: 1},
                    {kills: 0, deaths: 0, assists: 0, level: 1},
                    {kills: 0, deaths: 0, assists: 0, level: 1},
                    {kills: 0, deaths: 0, assists: 0, level: 1},
                    {kills: 0, deaths: 0, assists: 0, level: 1},
                ]
            },{
                players: [
                    {kills: 0, deaths: 0, assists: 0, level: 1},
                    {kills: 0, deaths: 0, assists: 0, level: 1},
                    {kills: 0, deaths: 0, assists: 0, level: 1},
                    {kills: 0, deaths: 0, assists: 0, level: 1},
                    {kills: 0, deaths: 0, assists: 0, level: 1},
                ]
            },
        ]
    };

    process_champion_kill(state, event);

    it('updates the killers kda', () => {
        expect(state.teams[1].players[0].kills).toBe(1);
    });
});
