import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);

  // Initialize or fetch guest session_id on mount
  useEffect(() => {
    let sId = localStorage.getItem('cavani_session_id');
    if (!sId) {
      sId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('cavani_session_id', sId);
    }
    setSessionId(sId);
  }, []);

  // Fetch cart whenever session_id or user shifts
  const fetchCart = async () => {
    const sId = localStorage.getItem('cavani_session_id');
    if (!sId && !user) return;
    
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

  useEffect(() => {
    if (sessionId !== null) {
      fetchCart();
    }
  }, [user, sessionId]);

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
      getCartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
