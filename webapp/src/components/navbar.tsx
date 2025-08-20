import logo from '../assets/logo-placeholder-image.png';

export default function Navbar() {
  return (
    <div style={styles.navbar}>
      <div style={styles.leftSection}>
        <a href="/" style={styles.buttons}><img src={logo} alt="Logo" style={{ height: '30px' }}></img></a>
        <a href="#about" style={styles.buttons}><span>About</span></a>
        <a href="/brands" style={styles.buttons}><span>Brands</span></a>
      </div>
      <div style={styles.rightSection}>
        <a href="/profile" style={styles.buttons}><span>Profile</span></a>
      </div>
    </div>
  )
}

const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
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
    gap: '2rem',
  },

  rightSection: {
    display: 'flex',
    alignItems: 'center',
  },

  buttons: {
    textDecoration: 'none',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: 500,
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
