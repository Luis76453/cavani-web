import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Navigation Layouts
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminSidebar from './components/AdminSidebar';

// Public Pages
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutFailure from './pages/CheckoutFailure';
import CheckoutPending from './pages/CheckoutPending';
import Auth from './pages/Auth';
import Profile from './pages/Profile';

// Static Info Pages
import { Nosotros, FAQ, Envios, Cambios, Terminos, Privacidad } from './pages/StaticPages';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminCategories from './pages/AdminCategories';
import AdminCoupons from './pages/AdminCoupons';

// Scroll to top helper component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Immediate top scroll on navigation
    });
  }, [pathname]);

  return null;
}

// Shop Layout wrapper (standard sticky header, viewport content spacer, footer)
function ShopLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-neutral-light/30">
        {children}
      </main>
      <Footer />
    </div>
  );
}

// Route Guard to verify Admin role
function AdminGuard({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-xs">Cargando privilegios...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/auth?redirect=admin" replace />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-neutral-light overflow-hidden">
      <AdminSidebar />
      <main className="flex-grow flex flex-col lg:h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            
            {/* Public/Customer Shop Routes */}
            <Route path="/" element={<ShopLayout><Home /></ShopLayout>} />
            <Route path="/catalog" element={<ShopLayout><Catalog /></ShopLayout>} />
            <Route path="/product/:slug" element={<ShopLayout><ProductDetail /></ShopLayout>} />
            <Route path="/cart" element={<ShopLayout><Cart /></ShopLayout>} />
            <Route path="/checkout" element={<ShopLayout><Checkout /></ShopLayout>} />
            <Route path="/checkout/success" element={<ShopLayout><CheckoutSuccess /></ShopLayout>} />
            <Route path="/checkout/failure" element={<ShopLayout><CheckoutFailure /></ShopLayout>} />
            <Route path="/checkout/pending" element={<ShopLayout><CheckoutPending /></ShopLayout>} />
            <Route path="/auth" element={<ShopLayout><Auth /></ShopLayout>} />
            <Route path="/profile" element={<ShopLayout><Profile /></ShopLayout>} />
            
            {/* Static pages */}
            <Route path="/nosotros" element={<ShopLayout><Nosotros /></ShopLayout>} />
            <Route path="/faq" element={<ShopLayout><FAQ /></ShopLayout>} />
            <Route path="/envios" element={<ShopLayout><Envios /></ShopLayout>} />
            <Route path="/cambios" element={<ShopLayout><Cambios /></ShopLayout>} />
            <Route path="/terminos" element={<ShopLayout><Terminos /></ShopLayout>} />
            <Route path="/privacidad" element={<ShopLayout><Privacidad /></ShopLayout>} />

            {/* Protected Admin Routes */}
            <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/products" element={<AdminGuard><AdminProducts /></AdminGuard>} />
            <Route path="/admin/orders" element={<AdminGuard><AdminOrders /></AdminGuard>} />
            <Route path="/admin/categories" element={<AdminGuard><AdminCategories /></AdminGuard>} />
            <Route path="/admin/coupons" element={<AdminGuard><AdminCoupons /></AdminGuard>} />

            {/* Catch-all fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
