import { Link } from 'react-router-dom';
import crownIcon from '../assets/crown-icon.webp';

function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
}

export function ChampionCard({ athlete, disciplineTitle, rank, points }) {
  return (
    <Link to={`/athletes/${athlete.slug}`} className="champion-card">
      <div className="champion-card-media" aria-hidden="true">
        {athlete.photoUrl ? (
          <img
            src={athlete.photoUrl}
            alt={athlete.name}
            className="champion-card-img"
            loading="lazy"
          />
        ) : (
          <div className="champion-avatar">{initials(athlete.name)}</div>
        )}
      </div>
      <div className="champion-card-body">
        <h3 className="champion-name">{athlete.name}</h3>
        <span className="champion-discipline">{disciplineTitle}</span>
        <div className="champion-stats">
          <div className="champion-stat">
            <span className="champion-stat-value">#{rank}</span>
            <span className="champion-stat-label">Rank</span>
          </div>
          <div className="champion-stat">
            <span className="champion-stat-value">{points.toLocaleString()}</span>
            <span className="champion-stat-label">Points</span>
          </div>
        </div>
        <span className="champion-view">
          View Profile
          <span className="champion-view-arrow" aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}

export default function AthleteCard({ athlete }) {
  return (
    <Link to={`/athletes/${athlete.slug}`} className="athlete-card">
      <div className="athlete-card-media" aria-hidden="true">
        {athlete.photoUrl ? (
          <img
            src={athlete.photoUrl}
            alt={athlete.name}
            className="athlete-card-img"
            loading="lazy"
          />
        ) : (
          <div className="athlete-card-avatar">{initials(athlete.name)}</div>
        )}
        {athlete.isChampion && (
          <span className="athlete-card-badge athlete-card-crown" title="National Champion">
            <img src={crownIcon} alt="National Champion" style={{ width: 22, height: 22, display: 'block' }} />
          </span>
        )}
      </div>
      <div className="athlete-card-body">
        <h3>{athlete.name}</h3>
        <p className="athlete-card-team">{athlete.team} · {athlete.hometown}</p>
        <div className="athlete-card-tags">
          {athlete.disciplines.map((d) => (
            <span className="tag" key={d}>{d}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
