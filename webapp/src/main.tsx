import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Home from './pages/index'
import About from './pages/about'
import Brands from './pages/brands'
import Login from './pages/login'
import BrandPage from './pages/brandPage'
import WatchDetails from './pages/watchDetails'
import Profile from './pages/profile'
import ProfileSetup from './pages/profile-setup'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/login" element={<Login />} />
          <Route path="/brand/:id" element={<BrandPage />} />
          <Route path="/watch/:id" element={<WatchDetails />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile-setup" 
            element={
              <ProtectedRoute>
                <ProfileSetup />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)


