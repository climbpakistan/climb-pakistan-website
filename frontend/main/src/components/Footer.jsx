import { Link } from 'react-router-dom';
import { footerLinks } from '../data/siteData';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="logo-climb">Climb</span>&nbsp;<span className="logo-pakistan">Pakistan</span>
            </Link>
            <p>Your source for climbing in Pakistan. An initiative supporting the development of sport climbing nationwide.</p>
            <a
              href="https://www.instagram.com/climb_pakistan/"
              className="btn-instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              @climb_pakistan
            </a>
          </div>

          <div className="footer-col">
            <h5>Explore</h5>
            <ul>
              {footerLinks.explore.map((l) => (
                <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h5>More</h5>
            <ul>
              {footerLinks.more.map((l) => (
                <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h5>Contact</h5>
            <ul>
              <li><a href="mailto:contact@climbpakistan.com">contact@climbpakistan.com</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Climb Pakistan.</p>
          <div className="footer-legal">
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
