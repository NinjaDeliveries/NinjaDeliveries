import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  orderBy, 
  query 
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../context/Firebase';
import { toast } from 'react-toastify';
import { 
  FaSearch, 
  FaFilter, 
  FaCertificate, 
  FaEye, 
  FaToggleOn, 
  FaToggleOff,
  FaPlus,
  FaDownload,
  FaCalendarAlt,
  FaUser,
  FaIdCard,
  FaSignOutAlt,
  FaBell,
  FaCog
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ninjaImg from '../../image/ninjaimg.jpg';
import CertificateViewModal from './CertificateViewModal';
import CertificateTemplate from './CertificateTemplate';
import '../../style/CertificateDashboard.css';

const CertificateDashboard = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [filteredCertificates, setFilteredCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    revoked: 0
  });

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  // Fetch certificates from Firebase
  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'certificates'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const certificatesData = [];
      querySnapshot.forEach((doc) => {
        certificatesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setCertificates(certificatesData);
      setFilteredCertificates(certificatesData);
      
      // Calculate stats
      const total = certificatesData.length;
      const valid = certificatesData.filter(cert => cert.status === 'valid').length;
      const revoked = certificatesData.filter(cert => cert.status === 'revoked').length;
      
      setStats({ total, valid, revoked });
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  // Filter certificates based on search and status
  useEffect(() => {
    let filtered = certificates;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cert => 
        cert.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.certificateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(cert => cert.status === statusFilter);
    }

    setFilteredCertificates(filtered);
  }, [searchTerm, statusFilter, certificates]);

  // View certificate
  const handleViewCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setShowCertificateModal(true);
  };

  // Download certificate as PDF
  const handleDownloadPDF = async (certificate) => {
    try {
      // Create a temporary container for the certificate
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      // Render the certificate template
      const React = require('react');
      const ReactDOM = require('react-dom');
      
      // Create a temporary element to render the certificate
      const certificateDiv = document.createElement('div');
      tempContainer.appendChild(certificateDiv);
      
      // For now, we'll show the modal which has the download functionality
      handleViewCertificate(certificate);
      
      // Clean up
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    }
  };

  // Close certificate modal
  const handleCloseCertificateModal = () => {
    setShowCertificateModal(false);
    setSelectedCertificate(null);
  };

  // Toggle certificate status
  const toggleCertificateStatus = async (certificateId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'valid' ? 'revoked' : 'valid';
      const certificateRef = doc(db, 'certificates', certificateId);
      
      await updateDoc(certificateRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      // Update local state
      setCertificates(prev => 
        prev.map(cert => 
          cert.id === certificateId 
            ? { ...cert, status: newStatus }
            : cert
        )
      );

      toast.success(`Certificate ${newStatus === 'valid' ? 'activated' : 'revoked'} successfully`);
    } catch (error) {
      console.error('Error updating certificate status:', error);
      toast.error('Failed to update certificate status');
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  if (loading) {
    return (
      <div className="certificate-dashboard">
        <div className="ninja-header">
          <div className="ninja-title">Certificate Management</div>
          <div className="ninja-subtitle">Loading certificates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="certificate-dashboard">
      {/* Enhanced Header */}
      <div className="ninja-header">
        <div className="header-content">
          <div className="header-left">
            <img src={ninjaImg} alt="Ninja" className="header-ninja-img" />
            <div className="header-text">
              <div className="ninja-title">Certificate Management</div>
              <div className="ninja-subtitle">Manage internship certificates</div>
            </div>
          </div>
          <div className="header-right">
            <div className="header-actions">
              <button className="header-action-btn notification-btn" title="Notifications">
                <FaBell />
                <span className="notification-badge">2</span>
              </button>
              <button className="header-action-btn settings-btn" title="Settings">
                <FaCog />
              </button>
              <Link to="/certificate/create" className="create-btn">
                <FaPlus /> Create Certificate
              </Link>
              <button onClick={handleLogout} className="logout-btn" title="Logout">
                <FaSignOutAlt /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="stats-container">
        <div className="stat-card total">
          <div className="stat-icon">
            <FaCertificate />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Certificates</div>
            <div className="stat-trend">+2 this month</div>
          </div>
        </div>
        
        <div className="stat-card valid">
          <div className="stat-icon">
            <FaToggleOn />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.valid}</div>
            <div className="stat-label">Valid Certificates</div>
            <div className="stat-trend">All active</div>
          </div>
        </div>
        
        <div className="stat-card revoked">
          <div className="stat-icon">
            <FaToggleOff />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats.revoked}</div>
            <div className="stat-label">Revoked Certificates</div>
            <div className="stat-trend">0 this month</div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="filters-container">
        <div className="filters-left">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, certificate ID, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="filters-right">
          <div className="filter-container">
            <FaFilter className="filter-icon" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="valid">Valid</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
          <button className="filter-btn export-btn">
            <FaDownload /> Export Data
          </button>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="table-container">
        {filteredCertificates.length === 0 ? (
          <div className="no-data">
            <FaCertificate className="no-data-icon" />
            <div className="no-data-title">No Certificates Found</div>
            <div className="no-data-subtitle">
              {certificates.length === 0 ? 
                'Start by creating your first certificate' : 
                'Try adjusting your search or filter criteria'
              }
            </div>
            {certificates.length === 0 && (
              <Link to="/certificate/create" className="create-first-btn">
                <FaPlus /> Create First Certificate
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="certificates-table">
              <thead>
                <tr>
                  <th><FaIdCard /> Certificate ID</th>
                  <th><FaUser /> Candidate Name</th>
                  <th>Role</th>
                  <th><FaCalendarAlt /> Internship Period</th>
                  <th>Issue Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCertificates.map((certificate) => (
                  <tr key={certificate.id}>
                    <td className="certificate-id">
                      <span className="id-badge">{certificate.certificateId}</span>
                    </td>
                    <td className="candidate-name">
                      <div className="name-cell">
                        <FaUser className="user-icon" />
                        {certificate.candidateName}
                      </div>
                    </td>
                    <td className="role">
                      <span className="role-badge">{certificate.role}</span>
                    </td>
                    <td className="period">
                      <div className="period-cell">
                        <div className="period-text">{certificate.internshipPeriod}</div>
                        <div className="period-dates">
                          {formatDate(certificate.startDate)} - {formatDate(certificate.endDate)}
                        </div>
                      </div>
                    </td>
                    <td className="issue-date">
                      {formatDate(certificate.issueDate)}
                    </td>
                    <td className="status">
                      <span className={`status-badge ${certificate.status}`}>
                        {certificate.status === 'valid' ? (
                          <>
                            <FaToggleOn className="status-icon" />
                            Valid
                          </>
                        ) : (
                          <>
                            <FaToggleOff className="status-icon" />
                            Revoked
                          </>
                        )}
                      </span>
                    </td>
                    <td className="actions">
                      <div className="action-buttons">
                        <button 
                          className="action-btn view"
                          onClick={() => handleViewCertificate(certificate)}
                          title="View Certificate"
                        >
                          <FaEye />
                        </button>
                        <button 
                          className={`action-btn toggle ${certificate.status}`}
                          onClick={() => toggleCertificateStatus(certificate.id, certificate.status)}
                          title={certificate.status === 'valid' ? 'Revoke Certificate' : 'Activate Certificate'}
                        >
                          {certificate.status === 'valid' ? <FaToggleOff /> : <FaToggleOn />}
                        </button>
                        <button 
                          className="action-btn download"
                          onClick={() => handleDownloadPDF(certificate)}
                          title="Download PDF"
                        >
                          <FaDownload />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Certificate View Modal */}
      <CertificateViewModal
        certificate={selectedCertificate}
        isOpen={showCertificateModal}
        onClose={handleCloseCertificateModal}
      />
    </div>
  );
};

export default CertificateDashboard;