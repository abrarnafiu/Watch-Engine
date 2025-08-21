import logo from '../assets/watch-engine-logo1.png';

export default function Navbar() {
  return (
    <div style={styles.navbar}>
      <div style={styles.leftSection}>
        <a href="/" style={styles.buttons}><span>Search</span></a>
        <a href="/about" style={styles.buttons}><span>About</span></a>
        <a href="/brands" style={styles.buttons}><span>Brands</span></a>
      </div>
      <div style={styles.middleSection}>
        <a href="/" style={styles.buttons}><img src={logo} alt="Logo" style={{ height: '60px' }}></img></a>
      </div>
      <div style={styles.rightSection}>
        <a href="/profile" style={styles.buttons}><span>Profile</span></a>
      </div>
    </div>
  )
}

const styles = {
  navbar: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    padding: '1rem 3.5rem',
    backgroundColor: 'transparent',
    color: 'rgba(255, 255, 255, 0.87)',
    margin: 0,
    position: 'relative' as const,
    zIndex: 10,
    animation: 'slideDown 0.8s ease-out',
  },
  
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '3rem',
    justifySelf: 'start',
  },

  middleSection: {
    display: 'flex',
    alignItems: 'center',
    justifySelf: 'center',
  },

  rightSection: {
    display: 'flex',
    alignItems: 'center',
    justifySelf: 'end',
  },

  buttons: {
    textDecoration: 'none',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: 100,
    fontFamily: "'Montserrat', sans-serif",
    letterSpacing: '0.01em',
    transition: 'all 0.3s ease',
    position: 'relative' as const,
    
    '&:hover': {
      opacity: 0.8,
      transform: 'translateY(-2px)',
    },
  }
}
