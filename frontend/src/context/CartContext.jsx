import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [cartWarnings, setCartWarnings] = useState([]);

  // Initialize prevUserRef with the initial mount state of user ID (preventing refresh-trigger false merges)
  const prevUserRef = useRef(user?.id || null);

  // Initialize guest session_id only if there is no session and no active logged-in user
  useEffect(() => {
    if (!user) {
      let sId = localStorage.getItem('cavani_session_id');
      if (!sId) {
        sId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('cavani_session_id', sId);
      }
      setSessionId(sId);
    } else {
      setSessionId(null);
    }
  }, [user]);

  // Fetch cart details from database
  const fetchCart = async () => {
    const sId = localStorage.getItem('cavani_session_id');
    // If not logged in and guest session isn't initialized, we can't load the cart
    if (!user && !sId) return;
    
    setLoading(true);
    try {
      const res = await api.get('/cart', {
        params: !user ? { session_id: sId } : {}
      });
      setCartItems(res.data.items || []);
    } catch (err) {
      console.error('Failed to load cart:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync / Merge cart upon auth state transitions
  const userId = user?.id;
  useEffect(() => {
    const handleCartAuthSync = async () => {
      const sId = localStorage.getItem('cavani_session_id');
      
      // Merge only if moving from guest (prevUserRef was null) to logged-in user (userId is active)
      const wasGuest = prevUserRef.current === null;
      const isLoggedInNow = userId !== undefined && userId !== null;

      if (wasGuest && isLoggedInNow && sId) {
        try {
          setLoading(true);
          const res = await api.post('/cart/merge', { session_id: sId });
          
          if (res.data.warnings && res.data.warnings.length > 0) {
            setCartWarnings(res.data.warnings);
          } else {
            setCartWarnings([]);
          }

          // Clear guest session id completely from client storage
          localStorage.removeItem('cavani_session_id');
          setSessionId(null);
        } catch (err) {
          console.error('Cart merge error on login:', err);
        }
      }

      await fetchCart();
      
      // Update ref to track auth transition state
      prevUserRef.current = userId || null;
    };

    handleCartAuthSync();
  }, [userId]); // Only runs when user ID shifts (login/logout/switch)

  const addToCart = async (variantId, quantity = 1) => {
    const sId = localStorage.getItem('cavani_session_id');
    try {
      const res = await api.post('/cart/items', {
        variant_id: variantId,
        quantity,
        session_id: !user ? sId : undefined
      });
      await fetchCart();
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Error al agregar el producto al carrito.'
      };
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      await api.put(`/cart/items/${itemId}`, { quantity });
      await fetchCart();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Error al actualizar la cantidad.'
      };
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
      await fetchCart();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Error al eliminar el producto.'
      };
    }
  };

  const getSubtotal = () => {
    return cartItems.reduce((acc, item) => acc + parseFloat(item.price) * item.quantity, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      loading,
      addToCart,
      updateQuantity,
      removeFromCart,
      fetchCart,
      getSubtotal,
      getCartCount,
      cartWarnings,
      setCartWarnings
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
