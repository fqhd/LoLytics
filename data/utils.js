import fs from 'fs';

export function shuffle(array) {
    let current_index = array.length,
        random_index;

    while (current_index > 0) {
        random_index = Math.floor(Math.random() * current_index);
        current_index--;
        [array[current_index], array[random_index]] = [
            array[random_index],
            array[current_index],
        ];
    }

    return array;
}

export function parse_env_file(file_path) {
    try {
        const content = fs.readFileSync(file_path, 'utf8');
        
        const env_dict = {};
        
        content.split('\n').forEach(line => {
            line = line.trim();
            if (line === '' || line.startsWith('#')) return;
            
            const separator_index = line.indexOf('=');
            if (separator_index === -1) return;
            
            let key = line.substring(0, separator_index).trim();
            let value = line.substring(separator_index + 1).trim();
            
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            
            value = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
            
            env_dict[key] = value;
        });
        
        return env_dict;
    } catch (error) {
        console.error(`Error reading ${file_path}:`, error.message);
        return {};
    }
}

export function sleep(ms){
    return new Promise((resolve) => setTimeout(resolve, ms));
}
