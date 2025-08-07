import './Runes.css';

function Runes({ primaryTree, secondaryTree, statPerks }) {
  return (
    <div className="runes">
      <div className="left-column">
        <img src={primaryTree.keystone} alt="Main Keystone" className="keystone-icon" />
        <div className="sub-keystones">
          {primaryTree.subs.map((icon, i) => (
            <img key={i} src={icon} alt={`Primary Sub ${i}`} className="sub-keystone-icon" />
          ))}
        </div>
      </div>
      <div className="right-column">
        <div className="secondary-subs">
          {secondaryTree.subs.map((icon, i) => (
            <img key={i} src={icon} alt={`Secondary Sub ${i}`} className="sub-keystone-icon" />
          ))}
        </div>
        <div className="stat-perks">
          {statPerks.map((icon, i) => (
            <img key={i} src={icon} alt={`Stat Perk ${i}`} className="stat-icon" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Runes;
