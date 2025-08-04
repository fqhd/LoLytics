export default function MatchCard({ visible, index }) {
    return (
        <div
            className={`match-card ${visible ? 'show' : ''}`}
            style={{ transitionDelay: `${index * 0.2}s` }}
        >
            Match {index + 1}
        </div>
    );
}