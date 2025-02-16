export default function Navbar() {
  return (
    <div style={styles.navbar}>
      <ul style={styles.buttonsContainer}>
        <a href="/" style={styles.buttons}><li>Logo</li></a>
        <a href="/" style={styles.buttons}><li>Home</li></a>
        <a href="/about" style={styles.buttons}><li>About</li></a>
        <a href="/brands" style={styles.buttons}><li>Brands</li></a>
      </ul>
    </div>
  )
}

const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#1a1a1a',
    color: 'rgba(255, 255, 255, 0.87)',
    margin: 0,
  },
  
  buttonsContainer: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 500,
    textDecoration: 'none',
    display: 'flex',
    gap: '2rem',
    listStyle: 'none',
    border: 'none',
    padding: 0,
  },

  buttons: {
    textDecoration: 'none',
    color: 'white',
  }
}
