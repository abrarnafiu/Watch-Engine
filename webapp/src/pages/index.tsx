import Navbar from '../compnents/navbar'
export default function Home() {
  return (
    <div>
      <Navbar />
      <div style={styles.chatBoxContainer}>
        <input 
          type="text"
          placeholder="Ask me anything..." 
          style={styles.chatBoxInput}
        />
      </div>
    </div>
  )
}

const styles = {
  chatBoxContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: '250px 200px 50px 200px',
  },

  chatBoxInput: {
    width: '75%',
    height: '75%',
    padding: '0.8rem',
    fontSize: '1rem',
    borderRadius: '10px',
    border: 'none',
    outline: 'none',
  }
}