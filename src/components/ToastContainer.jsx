import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [portalRoot, setPortalRoot] = useState(null);

  // Debug log
  console.log("🍞 ToastProvider rendered, toasts:", toasts);

  useEffect(() => {
    // Create or get portal root
    let root = document.getElementById('toast-portal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-portal-root';
      root.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
        display: block !important;
        visibility: visible !important;
      `;
      document.body.appendChild(root);
      console.log("✅ Toast portal root created and appended to body");
    }
    setPortalRoot(root);

    return () => {
      // Cleanup on unmount
      if (root && root.parentNode && toasts.length === 0) {
        root.parentNode.removeChild(root);
      }
    };
  }, []);

  const showToast = useCallback((message, type = 'info', details = null, duration = 4000) => {
    const id = Date.now();
    console.log("🍞 showToast called:", { id, message, type, details });
    setToasts(prev => [...prev, { id, message, type, details, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, details = null) => {
    showToast(message, 'success', details);
  }, [showToast]);

  const error = useCallback((message, details = null) => {
    showToast(message, 'error', details, 5000);
  }, [showToast]);

  const warning = useCallback((message, details = null) => {
    showToast(message, 'warning', details);
  }, [showToast]);

  const info = useCallback((message, details = null) => {
    showToast(message, 'info', details);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      {portalRoot && createPortal(
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            pointerEvents: 'none',
            position: 'relative',
            zIndex: 2147483647
          }}
        >
          {toasts.map(toast => {
            console.log("🍞 Rendering toast in portal:", toast.id, toast.message);
            return (
              <div key={toast.id} style={{ pointerEvents: 'auto' }}>
                <Toast
                  message={toast.message}
                  type={toast.type}
                  details={toast.details}
                  duration={toast.duration}
                  onClose={() => removeToast(toast.id)}
                />
              </div>
            );
          })}
        </div>,
        portalRoot
      )}
    </ToastContext.Provider>
  );
};
