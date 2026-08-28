import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const { login, register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect') || '/';
  const startMode = queryParams.get('mode') || 'login';

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(redirectPath);
    }
  }, [isAuthenticated, loading, navigate, redirectPath]);

  const [isLogin, setIsLogin] = useState(startMode === 'login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: ''
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const { email, password, first_name, last_name, phone } = formData;

    if (isLogin) {
      const res = await login(email, password);
      setIsSubmitting(false);
      if (res.success) {
        navigate(redirectPath);
      } else {
        setErrorMessage(res.message);
      }
    } else {
      if (!first_name || !last_name) {
        setErrorMessage('Nombre y Apellido son obligatorios.');
        setIsSubmitting(false);
        return;
      }
      const res = await register(email, password, first_name, last_name, phone);
      setIsSubmitting(false);
      if (res.success) {
        navigate(redirectPath);
      } else {
        setErrorMessage(res.message);
      }
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 pt-20">
      
      {/* Left Column: Premium visual look */}
      <div className="hidden lg:relative lg:flex bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=1000&q=80" 
            alt="caVani Campaign"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary/50 to-transparent"></div>
        <div className="relative text-white max-w-md p-8 space-y-6 z-10">
          <span className="text-[10px] tracking-[0.3em] font-semibold uppercase text-steel-light">caVani Medical</span>
          <h2 className="font-serif text-4xl font-light leading-snug">
            Eleva tu apariencia profesional.
          </h2>
          <p className="text-xs font-light text-neutral-dark/80 leading-relaxed">
            Crea una cuenta para guardar tus scrubs favoritos, gestionar tus direcciones de entrega y realizar un seguimiento detallado de tus pedidos.
          </p>
        </div>
      </div>

      {/* Right Column: Interactive Forms */}
      <div className="flex items-center justify-center bg-neutral-light px-6 py-12">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm border border-neutral-light/50 space-y-8">
          
          {/* Header selectors */}
          <div className="flex justify-center border-b border-neutral-light pb-4">
            <button
              onClick={() => { setIsLogin(true); setErrorMessage(''); }}
              className={`flex-1 text-center text-xs font-bold uppercase tracking-wider pb-2 focus:outline-none ${isLogin ? 'border-b-2 border-primary text-primary' : 'text-primary/55'}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setIsLogin(false); setErrorMessage(''); }}
              className={`flex-1 text-center text-xs font-bold uppercase tracking-wider pb-2 focus:outline-none ${!isLogin ? 'border-b-2 border-primary text-primary' : 'text-primary/55'}`}
            >
              Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* Display message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-md">
                {errorMessage}
              </div>
            )}

            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Nombre *</label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 focus:outline-none focus:border-primary bg-neutral-light/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Apellido *</label>
                  <input
                    type="text"
                    name="last_name"
                    required
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 focus:outline-none focus:border-primary bg-neutral-light/50"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Correo Electrónico *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 focus:outline-none focus:border-primary bg-neutral-light/50"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Teléfono (Opcional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 focus:outline-none focus:border-primary bg-neutral-light/50"
                />
              </div>
            )}

            <div>
              <label className="block text-[9px] uppercase tracking-wider font-semibold text-primary/60 mb-1.5">Contraseña *</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full text-xs border border-neutral-dark/20 rounded px-3 py-2.5 focus:outline-none focus:border-primary bg-neutral-light/50"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded hover:bg-steel transition-colors focus:outline-none disabled:opacity-60"
            >
              {isSubmitting ? 'Procesando...' : (isLogin ? 'Ingresar' : 'Registrarse')}
            </button>
          </form>

          {/* Quick accounts details for demo evaluation */}
          <div className="border-t border-neutral-light pt-6 text-[10px] text-primary/60 text-center font-light leading-relaxed">
            <span className="font-semibold block mb-1">Cuentas de Prueba para Evaluación:</span>
            <div className="flex flex-col space-y-1">
              {/* cuentas */}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
