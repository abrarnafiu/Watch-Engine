import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav style={nav}>
      <div style={section}>
        <Link active={isActive('/')} onClick={() => navigate('/')}>Search</Link>
        <Link active={isActive('/brands')} onClick={() => navigate('/brands')}>Brands</Link>
      </div>
      <div style={{ ...section, justifySelf: 'center' }}>
        <span onClick={() => navigate('/')} style={logo}>Watch Engine</span>
      </div>
      <div style={{ ...section, justifySelf: 'end' }}>
        <Link active={isActive('/alerts')} onClick={() => navigate('/alerts')}>Alerts</Link>
        <Link active={isActive('/pricing')} onClick={() => navigate('/pricing')}>Pro</Link>
        <Link active={isActive('/profile')} onClick={() => navigate('/profile')}>Profile</Link>
      </div>
    </nav>
  );
}

function Link({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <span
      onClick={onClick}
      style={{
        color: active ? '#e8e8e3' : '#4a4a4a',
        fontSize: '0.8rem',
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        letterSpacing: '0.03em',
        cursor: 'pointer',
        transition: 'color 0.15s',
        textTransform: 'uppercase' as const,
      }}
      onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.color = '#888'; }}
      onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.color = '#4a4a4a'; }}
    >
      {children}
    </span>
  );
}

const nav: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  padding: '1.5rem 3rem',
  position: 'relative',
  zIndex: 10,
};

const section: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '2rem',
};

const logo: React.CSSProperties = {
  fontFamily: "'Georgia', serif",
  fontSize: '1.05rem',
  fontWeight: 400,
  color: '#f5f5f0',
  cursor: 'pointer',
  letterSpacing: '-0.02em',
};
