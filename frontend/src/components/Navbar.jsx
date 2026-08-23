import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { getCartCount } = useCart();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Monitor scroll for premium visual lock
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 bg-primary text-white ${scrolled ? 'shadow-md py-4' : 'py-6'}`}>
      <div className="max-w-7xl mx-auto px-3 min-[400px]:px-6 flex items-center justify-between">
        
        {/* Mobile menu button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Logo caVani */}
        <Link to="/">
          <BrandLogo />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8 text-xs font-semibold tracking-widest uppercase">
          <Link to="/catalog" className="hover:opacity-75 transition-opacity">Ver Todo</Link>
          <Link to="/catalog?category=scrubs" className="hover:opacity-75 transition-opacity">Scrubs</Link>
          <Link to="/catalog?category=enterizos" className="hover:opacity-75 transition-opacity">Enterizos</Link>
          <Link to="/catalog?category=accesorios" className="hover:opacity-75 transition-opacity">Accesorios</Link>
          <Link to="/nosotros" className="hover:opacity-75 transition-opacity">Nosotros</Link>
        </div>

        {/* Secondary Icons (Search, Favorites, Account, Cart) */}
        <div className="flex items-center space-x-3 min-[400px]:space-x-5 min-[500px]:space-x-6">
          
          {/* Search Toggle */}
          <div className="relative">
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="hover:opacity-75 transition-opacity focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {searchOpen && (
              <form onSubmit={handleSearchSubmit} className="absolute right-0 top-8 bg-white border border-neutral-light rounded shadow-lg p-2 flex items-center w-64">
                <input
                  type="text"
                  placeholder="Buscar scrubs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs text-primary focus:outline-none px-2 py-1"
                />
                <button type="submit" className="text-primary hover:text-steel p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            )}
          </div>

          {/* Account Icon / Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="hover:opacity-75 transition-opacity focus:outline-none flex items-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
            {profileDropdownOpen && (
              <div className="absolute right-0 top-8 bg-white border border-neutral-light rounded-md shadow-lg py-2 w-48 text-primary z-50 text-xs font-medium">
                {user ? (
                  <>
                    <div className="px-4 py-2 border-b border-neutral-light font-bold text-gray-700">
                      Hola, {user.first_name}
                    </div>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block px-4 py-2 hover:bg-neutral-light text-steel font-bold"
                      >
                        Panel Admin
                      </Link>
                    )}
                    <Link 
                      to="/profile" 
                      onClick={() => setProfileDropdownOpen(false)}
                      className="block px-4 py-2 hover:bg-neutral-light"
                    >
                      Mi Perfil
                    </Link>
                    <button 
                      onClick={() => {
                        logout();
                        setProfileDropdownOpen(false);
                        navigate('/');
                      }}
                      className="w-full text-left block px-4 py-2 hover:bg-neutral-light text-red-500 font-bold"
                    >
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/auth" 
                      onClick={() => setProfileDropdownOpen(false)}
                      className="block px-4 py-2 hover:bg-neutral-light"
                    >
                      Iniciar Sesión
                    </Link>
                    <Link 
                      to="/auth?mode=register" 
                      onClick={() => setProfileDropdownOpen(false)}
                      className="block px-4 py-2 hover:bg-neutral-light"
                    >
                      Crear Cuenta
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Cart Bag Icon */}
          <Link to="/cart" className="hover:opacity-75 transition-opacity relative flex items-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {getCartCount() > 0 && (
              <span className={`absolute -top-2 -right-2 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${scrolled ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                {getCartCount()}
              </span>
            )}
          </Link>
          
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-primary text-white py-6 px-6 border-t border-white/10 space-y-4 text-sm font-semibold tracking-wider uppercase">
          <Link to="/catalog" onClick={() => setMobileMenuOpen(false)} className="block py-2">Ver Todo</Link>
          <Link to="/catalog?category=scrubs" onClick={() => setMobileMenuOpen(false)} className="block py-2">Scrubs</Link>
          <Link to="/catalog?category=enterizos" onClick={() => setMobileMenuOpen(false)} className="block py-2">Enterizos</Link>
          <Link to="/catalog?category=accesorios" onClick={() => setMobileMenuOpen(false)} className="block py-2">Accesorios</Link>
          <Link to="/nosotros" onClick={() => setMobileMenuOpen(false)} className="block py-2">Nosotros</Link>
        </div>
      )}
    </nav>
  );
}
