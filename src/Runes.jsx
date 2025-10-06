import React, { useState, useRef, useEffect } from 'react';
import './Runes.css';

function Runes({ data, events }) {
    const [activeTab, setActiveTab] = useState('runes');
    const [indicatorStyle, setIndicatorStyle] = useState({});
    const tabRefs = useRef({});

    const formatTime = ms =>
        `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;


    const { primaryTree = {}, secondaryTree = {}, statPerks = [] } = data;

    useEffect(() => {
        const activeEl = tabRefs.current[activeTab];
        if (activeEl) {
            setIndicatorStyle({
                left: activeEl.offsetLeft + 'px',
                width: activeEl.offsetWidth + 'px',
            });
        }
    }, [activeTab]);

    return (
        <div className="runes">
            <div className="tab-bar">
                <button
                    ref={(el) => (tabRefs.current['runes'] = el)}
                    className={`tab ${activeTab === 'runes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('runes')}
                >
                    Runes
                </button>
                <button
                    ref={(el) => (tabRefs.current['other'] = el)}
                    className={`tab ${activeTab === 'other' ? 'active' : ''}`}
                    onClick={() => setActiveTab('other')}
                >
                    Events
                </button>

                <div className="tab-indicator" style={indicatorStyle}></div>
            </div>

            <div className="tab-content">
                {activeTab === 'runes' && (
                    <>
                        {primaryTree.keystone && (
                            <div className="left-column">
                                <img
                                    src={'/images/' + primaryTree.keystone}
                                    alt="Main Keystone"
                                    className="keystone-icon"
                                />
                                <div className="sub-keystones">
                                    {primaryTree.subs?.map((icon, i) => (
                                        <img
                                            key={i}
                                            src={'/images/' + icon}
                                            alt={`Primary Sub ${i}`}
                                            className="sub-keystone-icon"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        {secondaryTree.subs?.length > 0 && (
                            <div className="right-column">
                                <div className="secondary-subs">
                                    {secondaryTree.subs.map((icon, i) => (
                                        <img
                                            key={i}
                                            src={'/images/' + icon}
                                            alt={`Secondary Sub ${i}`}
                                            className="sub-keystone-icon"
                                        />
                                    ))}
                                </div>
                                <div className="stat-perks">
                                    {statPerks.map((icon, i) => (
                                        <img
                                            key={i}
                                            src={icon}
                                            alt={`Stat Perk ${i}`}
                                            className="stat-icon"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'other' && events && (
                    <div className="other-tab">
                        <React.Fragment>
                            {events.map((e, i) => (
                                <div className={"game-event" + (e.delta > 0 ? ' good' : ' bad')}>
                                    <div className="top-half">
                                        <img className="champ-icon" src={e.left} alt="" />
                                        <img className="sword-icon" src='/images/sword.png' alt="" />
                                        <img className="champ-icon" src={e.right} alt="" />
                                    </div>
                                    <div className="bottom-half">
                                        <span>{formatTime(e.time)}</span>
                                        <span className="event-delta">{(e.delta > 0 ? '+' : '') + e.delta}</span>
                                    </div>
                                </div>
                            ))}
                        </React.Fragment>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Runes;
