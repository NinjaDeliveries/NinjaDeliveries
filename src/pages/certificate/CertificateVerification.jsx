import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../context/Firebase';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaCertificate, 
  FaCalendarAlt, 
  FaUser, 
  FaBriefcase,
  FaIdCard,
  FaShieldAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import { formatDate } from '../../utils/certificateUtils';
import ninjaLogo from '../../image/ninjaimg.jpg';
import '../../style/CertificateVerification.css';

const CertificateVerification = () => {
  const { certificateId } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real Firebase verification
  useEffect(() => {
    const verifyCertificate = async () => {
      try {
        setLoading(true);
        console.log('🔍 Checking certificate ID:', certificateId);
        console.log('🔥 Firebase db:', db);
        
        // Query Firebase for certificate with this ID
        console.log('📋 Querying certificates collection...');
        const q = query(
          collection(db, 'certificates'), 
          where('certificateId', '==', certificateId)
        );
        
        console.log('🔎 Executing query...');
        const querySnapshot = await getDocs(q);
        
        console.log('📊 Query result - Empty:', querySnapshot.empty);
        console.log('📊 Query result - Size:', querySnapshot.size);
        
        if (querySnapshot.empty) {
          console.log('❌ Certificate not found in database');
          console.log('🔍 Searched for certificateId:', certificateId);
          setError('Certificate not found');
        } else {
          const certData = querySnapshot.docs[0].data();
          console.log('✅ Certificate found:', certData);
          setCertificate(certData);
        }
      } catch (err) {
        console.error('💥 Error verifying certificate:', err);
        setError('Error verifying certificate: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (certificateId) {
      verifyCertificate();
    } else {
      setError('No certificate ID provided');
      setLoading(false);
    }
  }, [certificateId]);

  if (loading) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <div className="verification-card loading">
            <div className="loading-spinner"></div>
            <h2>Verifying Certificate...</h2>
            <p>Certificate ID: {certificateId}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <div className="verification-card error">
            <div className="verification-icon error">
              <FaTimesCircle />
            </div>
            <h2>Certificate Not Found</h2>
            <p>The certificate with ID <strong>{certificateId}</strong> could not be verified.</p>
            <div className="error-details">
              <FaExclamationTriangle />
              <span>This certificate may not exist or has been removed.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isValid = certificate && certificate.status === 'valid';

  return (
    <div className="verification-page">
      <div className="verification-container">
        <div className={`verification-card ${isValid ? 'valid' : 'revoked'}`}>
          
          {/* Header */}
          <div className="verification-header">
            <img src={ninjaLogo} alt="Ninja Deliveries" className="company-logo" />
            <h1>Certificate Verification</h1>
          </div>

          {/* Status */}
          <div className={`verification-status ${isValid ? 'valid' : 'revoked'}`}>
            <div className="verification-icon">
              {isValid ? <FaCheckCircle /> : <FaTimesCircle />}
            </div>
            <h2>
              {isValid ? 'Certificate Verified ✅' : 'Certificate Revoked ❌'}
            </h2>
            <p>
              {isValid 
                ? 'This certificate is authentic and valid.' 
                : 'This certificate has been revoked and is no longer valid.'
              }
            </p>
          </div>

          {/* Certificate Details */}
          <div className="certificate-details">
            <h3><FaCertificate /> Certificate Details</h3>
            
            <div className="detail-grid">
              <div className="detail-item">
                <FaIdCard className="detail-icon" />
                <div>
                  <span className="detail-label">Certificate ID</span>
                  <span className="detail-value">{certificate.certificateId}</span>
                </div>
              </div>

              <div className="detail-item">
                <FaUser className="detail-icon" />
                <div>
                  <span className="detail-label">Candidate Name</span>
                  <span className="detail-value">{certificate.candidateName}</span>
                </div>
              </div>

              <div className="detail-item">
                <FaBriefcase className="detail-icon" />
                <div>
                  <span className="detail-label">Role</span>
                  <span className="detail-value">{certificate.role}</span>
                </div>
              </div>

              <div className="detail-item">
                <FaCalendarAlt className="detail-icon" />
                <div>
                  <span className="detail-label">Internship Period</span>
                  <span className="detail-value">{certificate.internshipPeriod}</span>
                </div>
              </div>

              <div className="detail-item">
                <FaCalendarAlt className="detail-icon" />
                <div>
                  <span className="detail-label">Issue Date</span>
                  <span className="detail-value">{formatDate(certificate.issueDate)}</span>
                </div>
              </div>

              <div className="detail-item">
                <FaShieldAlt className="detail-icon" />
                <div>
                  <span className="detail-label">Status</span>
                  <span className={`detail-value status ${certificate.status}`}>
                    {certificate.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="verification-footer">
            <div className="company-info">
              <h4>Issued by</h4>
              <p><strong>Ninja Deliveries</strong></p>
              <p>This certificate was digitally issued and can be verified at any time.</p>
            </div>
          </div>

          {/* Security Note */}
          <div className="security-note">
            <FaShieldAlt />
            <span>This verification is secured and cannot be forged. Each certificate has a unique QR code.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateVerification;