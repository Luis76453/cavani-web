import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

export default function AdminSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { name: 'Dashboard', path: '/admin', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z' },
    { name: 'Productos', path: '/admin/products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { name: 'Pedidos', path: '/admin/orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { name: 'Categorías', path: '/admin/categories', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { name: 'Cupones', path: '/admin/coupons', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' }
  ];

  const renderNavLinks = (onItemClick = () => {}) => (
    <nav className="space-y-2">
      {links.map((link) => {
        const isActive = location.pathname === link.path;
        return (
          <Link
            key={link.path}
            to={link.path}
            onClick={onItemClick}
            className={`flex items-center space-x-3 px-4 py-3 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors ${
              isActive ? 'bg-steel text-white' : 'text-neutral-dark hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={link.icon} />
            </svg>
            <span>{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );

  const renderFooterActions = () => (
    <div className="space-y-3">
      <Link
        to="/"
        className="flex items-center space-x-3 px-4 py-2 rounded-md text-[10px] uppercase tracking-wider text-neutral-dark hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Ir a la Tienda</span>
      </Link>
      
      <button
        onClick={logout}
        className="w-full flex items-center space-x-3 px-4 py-2 rounded-md text-[10px] uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors focus:outline-none"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>Cerrar Sesión</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on lg screens and up) */}
      <aside className="hidden lg:flex w-64 bg-primary text-white flex-col h-screen sticky top-0 shrink-0 border-r border-white/10">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10">
          <Link to="/">
            <BrandLogo admin={true} />
          </Link>
        </div>

        {/* Nav Links */}
        <div className="flex-1 p-6">
          {renderNavLinks()}
        </div>

        {/* Footer / Actions */}
        <div className="p-6 border-t border-white/10">
          {renderFooterActions()}
        </div>
      </aside>

      {/* Mobile Header Top Bar (visible on screens below lg) */}
      <header className="lg:hidden w-full bg-primary text-white flex items-center justify-between px-6 py-4 border-b border-white/10 h-16 shrink-0 z-40">
        {/* Left: Hamburger menu button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="focus:outline-none p-1 -ml-1 text-white hover:text-neutral-dark transition-colors"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Center/Right: Logo */}
        <Link to="/">
          <BrandLogo admin={true} />
        </Link>

        {/* Empty placeholder for alignment */}
        <div className="w-6"></div>
      </header>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-primary/95 backdrop-blur-sm z-50 flex flex-col p-6 animate-fade-in">
          {/* Header row in drawer */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              <BrandLogo admin={true} />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-neutral-dark p-2 focus:outline-none"
              aria-label="Cerrar menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Links list */}
          <div className="flex-grow py-6 overflow-y-auto">
            {renderNavLinks(() => setMobileMenuOpen(false))}
          </div>

          {/* Footer actions */}
          <div className="pt-6 border-t border-white/10">
            {renderFooterActions()}
          </div>
        </div>
      )}
    </>
  );
}
