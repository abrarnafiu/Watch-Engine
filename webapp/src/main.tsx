import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Home from './pages/index.tsx'
import About from './pages/about.tsx'
import Brands from './pages/brands.tsx'
import Login from './pages/login.tsx'
import BrandPage from './pages/brandPage.tsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/brands" element={<Brands />} />
        <Route path="/login" element={<Login />} />
        <Route path="/brand/:brand" element={<BrandPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)


