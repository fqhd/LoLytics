import * as ort from 'onnxruntime-node';
import { readFile } from 'fs/promises';

let session;
ort.InferenceSession.create('./model/model.onnx').then(s => {
    session = s;
});

const champ_to_index = JSON.parse(await readFile('./model/champion_to_index.json', 'utf-8'));

export function convert_sample_to_array(sample) {
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

export async function predict(data) {
    const input_array = new Int32Array(data);
    const input_tensor = new ort.Tensor('int32', input_array, [1, 203])
    const feeds = { input: input_tensor };
    const results = await session.run(feeds);
    const outputs = results['output'];
    return outputs.cpuData[0];
}
