import { useState, useRef } from 'react';
import Navbar from '../components/navbar';

export default function Home() {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight - 20}px`; // Adjust height dynamically
    }
  };

  return (
    <div>
      <Navbar />
      <div style={styles.chatBoxContainer}>
        <textarea
          ref={textareaRef}
          placeholder="Ask me anything..."
          value={text}
          onChange={handleChange}
          style={styles.chatBoxInput}
        />
      </div>
    </div>
  );
}

const styles = {
  chatBoxContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',  // Ensures full-page centering
    padding: '50px',
  },

  chatBoxInput: {
    width: '75%',
    minHeight: '10px',  // Start small, then grow
    maxHeight: '300px',  // Prevent infinite expansion
    padding: '0.8rem',
    fontSize: '1rem',
    borderRadius: '10px',
    border: '1px solid #ccc',
    outline: 'none',
    resize: 'none' as const,
    overflowY: 'hidden' as const,
  }
};
