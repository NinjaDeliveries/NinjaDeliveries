import { FaLock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const NoAccess = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      textAlign: 'center',
      padding: '20px'
    }}>
      <FaLock size={80} style={{ marginBottom: '20px', opacity: 0.8 }} />
      <h1 style={{ fontSize: '2.5rem', marginBottom: '15px' }}>Access Denied</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '30px', opacity: 0.9 }}>
        You don't have permission to access this page.
      </p>
      <button 
        onClick={() => navigate('/')}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          color: 'white',
          padding: '12px 30px',
          borderRadius: '25px',
          fontSize: '1rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(10px)'
        }}
        onMouseOver={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.3)';
          e.target.style.transform = 'translateY(-2px)';
        }}
        onMouseOut={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.2)';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        Go Back Home
      </button>
    </div>
  );
};

export default NoAccess;