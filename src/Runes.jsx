import './Runes.css';

function Runes({ data = {} }) {
    const { primaryTree = {}, secondaryTree = {}, statPerks = [] } = data;
    return (
        <div className="runes">
            {primaryTree.keystone && (
                <div className="left-column">
                    <img src={'/images/' + primaryTree.keystone} alt="Main Keystone" className="keystone-icon" />
                    <div className="sub-keystones">
                        {primaryTree.subs?.map((icon, i) => (
                            <img key={i} src={'/images/' + icon} alt={`Primary Sub ${i}`} className="sub-keystone-icon" />
                        ))}
                    </div>
                </div>
            )}
            {secondaryTree.subs?.length > 0 && (
                <div className="right-column">
                    <div className="secondary-subs">
                        {secondaryTree.subs.map((icon, i) => (
                            <img key={i} src={'/images/' + icon} alt={`Secondary Sub ${i}`} className="sub-keystone-icon" />
                        ))}
                    </div>
                    <div className="stat-perks">
                        {statPerks.map((icon, i) => (
                            <img key={i} src={icon} alt={`Stat Perk ${i}`} className="stat-icon" />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Runes;
