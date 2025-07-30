import { describe, it, expect } from 'vitest';
import { create_players } from '../data/game.js';

describe('create_players', () => {
    const game = {
        info: {
            participants: [
                { championName: 'Malzahar', win: false },
                { championName: 'Ahri' },
                { championName: 'Zed' },
                { championName: 'Lux' },
                { championName: 'Garen' },
                { championName: 'Yasuo' },
                { championName: 'Jinx' },
                { championName: 'LeeSin' },
                { championName: 'Veigar' },
                { championName: 'Teemo' }
            ]
        }
    };

    it('creates correct first object', () => {
        const result = create_players(game, 0);
        expect(result[0]).toEqual({
            champion: 'Malzahar',
            kills: 0,
            deaths: 0,
            assists: 0,
            baronTimer: 0,
            elderTimer: 0,
            deathTimer: 0,
            gold: 0,
            level: 1,
            creepscore: 0,
            x: 0,
            y: 0,
        });
    });

    it('returns correct number of players per team', () => {
        const result = create_players(game, 0);
        expect(result.length).toEqual(5);
    });
});
