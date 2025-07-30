import { describe, it, expect } from 'vitest';
import { process_champion_kill } from '../data/kills.js';

describe('process_champion_kill', () => {
    const event = {
        killerId: 6,
        victimId: 5,
        assistingParticipantIds: [2, 1, 8, 7],
        timestamp: 300000
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

    it('updates the victims kda', () => {
        expect(state.teams[0].players[4].deaths).toBe(1);
    });

    it('correctly assigns death timer', () => {
        expect(state.teams[0].players[4].deathTimer).toBeGreaterThan(0);
    });

    it('correctly updates kda of assisting participants', () => {
        expect(state.teams[0].players[1].assists).toBe(1);
        expect(state.teams[0].players[0].assists).toBe(1);
        expect(state.teams[1].players[2].assists).toBe(1);
        expect(state.teams[1].players[1].assists).toBe(1);
    });
});
