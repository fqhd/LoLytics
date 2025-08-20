import './Scoreboard.css';

const ROLE_ICONS = [
    'Top_icon.png',
    'Jungle_icon.png',
    'Middle_icon.png',
    'Bottom_icon.png',
    'Support_icon.png'
];

export default function Scoreboard({ data }) {
    return (
        <div className="scoreboard">
            <div className="team left-team">
                {data.slice(0, 5).map((champion, index) => (
                    <div className="champion-row" key={index}>
                        {champion.deathTimer > 0 ? (
                            <div
                                className="champion-icon dead"
                                style={{ backgroundImage: `url(/images/icons/${champion.champion}.jpg)` }}
                            >
                                <span className="death-timer">{Math.floor(champion.deathTimer)}</span>
                            </div>
                        ) : (
                            <div
                                className="champion-icon"
                                style={{ backgroundImage: `url(/images/icons/${champion.champion}.jpg)` }}
                            />
                        )}

                        <span className="champion-cs">{champion.creepscore} CS</span>
                        <span className="champion-kda">
                            {champion.kills}/{champion.deaths}/{champion.assists}
                        </span>
                    </div>
                ))}
            </div>

            <div className="role-column">
                {ROLE_ICONS.map((icon, index) => (
                    <img
                        src={`/images/${icon}`}
                        alt={icon.split('_')[0]}
                        key={index}
                        className="role-icon"
                    />
                ))}
            </div>

            <div className="team right-team">
                {data.slice(5, 10).map((champion, index) => (
                    <div className="champion-row" key={index}>
                        <img src={'/images/icons/' + champion.champion + '.jpg'} alt={champion.champion} className="champion-icon" />
                        <span className="champion-cs">{champion.creepscore} CS</span>
                        <span className="champion-kda">{champion.kills}/{champion.deaths}/{champion.assists}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
