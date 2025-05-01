import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/navbar';
import Home from './pages/index';
import Login from './pages/login';
import Profile from './pages/profile';
import ProfileSetup from './pages/profile-setup';
import Brands from './pages/brands';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/brands" element={<Brands />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App; 