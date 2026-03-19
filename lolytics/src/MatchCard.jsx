function MatchCard({ visible, index, onClick, leftImage, rightImage, win }) {
    const borderColor = win ? '#42cdff' : '#fc4747';

    return (
        <div
            className={`match-card ${visible ? 'show' : ''}`}
            style={{
                transition: `opacity 0.4s ease ${index * 0.2}s, transform 0.2s ease`,
                border: `3px solid ${borderColor}`
            }}
            onClick={onClick}
        >
            <div className='match-card-content'>
                {leftImage && (
                    <img
                        src={leftImage}
                        alt='left'
                        className='match-card-image left'
                    />
                )}
                <span className='match-card-text'>vs</span>
                {rightImage && (
                    <img
                        src={rightImage}
                        alt='right'
                        className='match-card-image right'
                    />
                )}
            </div>
        </div>
    );
}

export default MatchCard;
