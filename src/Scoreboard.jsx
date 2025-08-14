import React from 'react';
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
        {data.blue.map((champion, index) => (
          <div className="champion-row" key={index}>
            <img src={'/images/icons/'+champion.name+'.jpg'} alt={champion.name} className="champion-icon" />
            <span className="champion-cs">{champion.cs} CS</span>
            <span className="champion-kda">{champion.kills}/{champion.deaths}/{champion.assists}</span>
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
        {data.red.map((champion, index) => (
          <div className="champion-row" key={index}>
            <img src={'/images/icons/'+champion.name+'.jpg'} alt={champion.name} className="champion-icon" />
            <span className="champion-cs">{champion.cs} CS</span>
            <span className="champion-kda">{champion.kills}/{champion.deaths}/{champion.assists}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
