function MatchCard({ visible, index, onClick, leftImage, rightImage }) {
    return (
        <div
            className={`match-card ${visible ? 'show' : ''}`}
            style={{
                transition: `opacity 0.4s ease ${index * 0.2}s, transform 0.4s ease`,
            }}
            onClick={onClick}
        >
            <div className="match-card-content">
                {leftImage && (
                    <img
                        src={leftImage}
                        alt="left"
                        className="match-card-image left"
                    />
                )}
                <span className="match-card-text">vs</span>
                {rightImage && (
                    <img
                        src={rightImage}
                        alt="right"
                        className="match-card-image right"
                    />
                )}
            </div>
        </div>
    );
}

export default MatchCard;
