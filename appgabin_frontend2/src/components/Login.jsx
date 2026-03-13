// src/components/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../AuthContext';

const Login = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo Section */}
        <div className="login-logo-section">
          <div className="login-logo">
            <div className="logo-icon">G</div>
          </div>
          <h1 className="login-title">App Gabinete</h1>
          <p className="login-subtitle">Gestión Integral de Servicios Profesionales</p>
        </div>

        {/* Content Section */}
        <div className="login-content">
          <h2 className="login-heading">{isSignUp ? 'Crear cuenta' : 'Bienvenido de nuevo'}</h2>
          <p className="login-description">
            {isSignUp ? 'Regístrate para acceder' : 'Accede a tu cuenta para continuar'}
          </p>

          {error && <p className="error-message">{error}</p>}

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary">
              {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </form>

          {/* Toggle between sign-in and sign-up */}
          <p className="toggle-text">
            {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="toggle-link">
              {isSignUp ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </p>

          {/* Divider */}
          <div className="divider">
            <span>o</span>
          </div>

          {/* Google Sign-In Button */}
          <button onClick={signInWithGoogle} className="btn-google">
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <text x="12" y="17" fontSize="14" fontWeight="bold" textAnchor="middle" fill="white">
                G
              </text>
            </svg>
            <span>Iniciar sesión con Google</span>
          </button>

          {/* Footer */}
          <p className="login-footer">
            Iniciando sesión, aceptas nuestros Términos de Servicio
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;