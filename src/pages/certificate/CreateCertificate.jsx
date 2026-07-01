import { useState } from 'react';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../context/Firebase';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { 
  FaUser, 
  FaIdCard, 
  FaCalendarAlt, 
  FaSave,
  FaArrowLeft,
  FaCertificate,
  FaEye,
  FaQrcode,
  FaBriefcase,
  FaCheckCircle,
  FaTimes
} from 'react-icons/fa';
import ninjaImg from '../../image/ninjaimg.jpg';
import CertificateTemplate from './CertificateTemplate';
import { calculateInternshipPeriod } from '../../utils/certificateUtils';
import '../../style/CreateCertificate.css';

const CreateCertificate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [previewCertificate, setPreviewCertificate] = useState(null);
  
  const [formData, setFormData] = useState({
    candidateName: '',
    role: '',
    startDate: '',
    endDate: '',
    issueDate: new Date().toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState({});

  // Generate unique certificate ID
  const generateCertificateId = async () => {
    let isUnique = false;
    let newId = '';
    
    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      newId = `ND-INTERN-${randomNum}`;
      
      // Check if ID already exists
      try {
        const docRef = doc(db, 'certificates', newId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          isUnique = true;
        }
      } catch (error) {
        console.error('Error checking certificate ID:', error);
        break;
      }
    }
    
    return newId;
  };

  // Generate QR Code
  const generateQRCode = async (certificateId) => {
    try {
      // Always use current domain (localhost for development, real domain for production)
      const verificationUrl = `${window.location.origin}/admin.html#/verify/${certificateId}`;
      
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return { qrCodeDataUrl, verificationUrl };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  };

  // Calculate internship period
  const getInternshipPeriod = (startDate, endDate) => {
    return calculateInternshipPeriod(startDate, endDate);
  };

  // Show certificate preview
  const handlePreview = () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields to preview');
      return;
    }

    const previewData = {
      certificateId: 'ND-INTERN-PREVIEW',
      candidateName: formData.candidateName,
      role: formData.role,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      issueDate: new Date(formData.issueDate),
      internshipPeriod: getInternshipPeriod(formData.startDate, formData.endDate),
      qrCodeImage: '', // Will show placeholder
      status: 'valid'
    };

    setPreviewCertificate(previewData);
    setShowCertificatePreview(true);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.candidateName.trim()) {
      newErrors.candidateName = 'Candidate name is required';
    }
    
    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    
    if (!formData.issueDate) {
      newErrors.issueDate = 'Issue date is required';
    }
    
    // Check if end date is after start date
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setLoading(true);
    
    try {
      // Generate certificate ID
      const certificateId = await generateCertificateId();
      setGeneratedId(certificateId);
      
      // Generate QR code
      const { qrCodeDataUrl, verificationUrl } = await generateQRCode(certificateId);
      setQrCodeUrl(qrCodeDataUrl);
      
      // Calculate internship period
      const internshipPeriod = getInternshipPeriod(formData.startDate, formData.endDate);
      
      // Prepare certificate data
      const certificateData = {
        certificateId,
        candidateName: formData.candidateName.trim(),
        role: formData.role.trim(),
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        issueDate: new Date(formData.issueDate),
        internshipPeriod,
        qrCodeImage: qrCodeDataUrl,
        verificationUrl,
        status: 'valid',
        createdAt: new Date(),
        createdBy: 'Co-Admin', // You can get this from user context
        updatedAt: new Date()
      };
      
      // Save to Firebase
      await addDoc(collection(db, 'certificates'), certificateData);
      
      toast.success('Certificate created successfully!');
      setShowPreview(true);
      
    } catch (error) {
      console.error('Error creating certificate:', error);
      toast.error('Failed to create certificate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success view
  if (showPreview) {
    return (
      <div className="certificate-dashboard">
        <div className="ninja-header">
          <div className="header-content">
            <div className="header-left">
              <img src={ninjaImg} alt="Ninja" className="header-ninja-img" />
              <div>
                <div className="ninja-title">Certificate Created Successfully!</div>
                <div className="ninja-subtitle">Certificate ID: {generatedId}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="success-container">
          <div className="success-card">
            <div className="success-icon">
              <FaCheckCircle />
            </div>
            <h2>Certificate Created!</h2>
            <p>Your certificate has been successfully created and saved.</p>
            
            <div className="certificate-details">
              <div className="detail-row">
                <span className="label">Certificate ID:</span>
                <span className="value id-badge">{generatedId}</span>
              </div>
              <div className="detail-row">
                <span className="label">Candidate:</span>
                <span className="value">{formData.candidateName}</span>
              </div>
              <div className="detail-row">
                <span className="label">Role:</span>
                <span className="value role-badge">{formData.role}</span>
              </div>
              <div className="detail-row">
                <span className="label">Period:</span>
                <span className="value">{getInternshipPeriod(formData.startDate, formData.endDate)}</span>
              </div>
            </div>

            {qrCodeUrl && (
              <div className="qr-preview">
                <h4><FaQrcode /> QR Code Generated</h4>
                <img src={qrCodeUrl} alt="Certificate QR Code" className="qr-image" />
                <p>Scan to verify certificate</p>
              </div>
            )}

            <div className="success-actions">
              <button 
                className="btn secondary"
                onClick={() => {
                  setShowPreview(false);
                  setFormData({
                    candidateName: '',
                    role: '',
                    startDate: '',
                    endDate: '',
                    issueDate: new Date().toISOString().split('T')[0]
                  });
                  setGeneratedId('');
                  setQrCodeUrl('');
                }}
              >
                Create Another
              </button>
              <Link to="/certificate/dashboard" className="btn primary">
                View All Certificates
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="certificate-dashboard">
      {/* Header */}
      <div className="ninja-header">
        <div className="header-content">
          <div className="header-left">
            <img src={ninjaImg} alt="Ninja" className="header-ninja-img" />
            <div>
              <div className="ninja-title">Create New Certificate</div>
              <div className="ninja-subtitle">Generate internship certificate with QR verification</div>
            </div>
          </div>
          <div className="header-right">
            <Link to="/certificate/dashboard" className="back-btn">
              <FaArrowLeft /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="form-container">
        <div className="form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* Candidate Name */}
              <div className="form-group">
                <label htmlFor="candidateName">
                  <FaUser /> Candidate Name *
                </label>
                <input
                  type="text"
                  id="candidateName"
                  name="candidateName"
                  value={formData.candidateName}
                  onChange={handleInputChange}
                  placeholder="Enter candidate full name"
                  className={errors.candidateName ? 'error' : ''}
                />
                {errors.candidateName && (
                  <span className="error-message">{errors.candidateName}</span>
                )}
              </div>

              {/* Role */}
              <div className="form-group">
                <label htmlFor="role">
                  <FaBriefcase /> Role/Position *
                </label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  placeholder="e.g., Frontend Developer, UI/UX Designer"
                  className={errors.role ? 'error' : ''}
                />
                {errors.role && (
                  <span className="error-message">{errors.role}</span>
                )}
              </div>

              {/* Start Date */}
              <div className="form-group">
                <label htmlFor="startDate">
                  <FaCalendarAlt /> Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className={errors.startDate ? 'error' : ''}
                />
                {errors.startDate && (
                  <span className="error-message">{errors.startDate}</span>
                )}
              </div>

              {/* End Date */}
              <div className="form-group">
                <label htmlFor="endDate">
                  <FaCalendarAlt /> End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={errors.endDate ? 'error' : ''}
                />
                {errors.endDate && (
                  <span className="error-message">{errors.endDate}</span>
                )}
              </div>

              {/* Issue Date */}
              <div className="form-group">
                <label htmlFor="issueDate">
                  <FaIdCard /> Issue Date *
                </label>
                <input
                  type="date"
                  id="issueDate"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleInputChange}
                  className={errors.issueDate ? 'error' : ''}
                />
                {errors.issueDate && (
                  <span className="error-message">{errors.issueDate}</span>
                )}
              </div>

              {/* Preview */}
              {formData.startDate && formData.endDate && (
                <div className="form-group preview-group">
                  <label>
                    <FaEye /> Internship Period Preview
                  </label>
                  <div className="preview-box">
                    <div className="preview-period">
                      {getInternshipPeriod(formData.startDate, formData.endDate)}
                    </div>
                    <div className="preview-dates">
                      {formData.startDate} to {formData.endDate}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit and Preview Buttons */}
            <div className="form-actions">
              <button 
                type="button"
                onClick={handlePreview}
                className="btn secondary"
                disabled={loading}
              >
                <FaEye /> Preview Certificate
              </button>
              <button 
                type="submit" 
                className="btn primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Creating Certificate...
                  </>
                ) : (
                  <>
                    <FaSave /> Create Certificate
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="info-card">
          <h3><FaQrcode /> What happens next?</h3>
          <ul>
            <li>Unique certificate ID will be generated (ND-INTERN-XXX format)</li>
            <li>QR code will be created with verification URL</li>
            <li>Certificate will be stored in the database</li>
            <li>You can view, revoke, or activate certificates later</li>
          </ul>
          
          <div className="url-info">
            <strong>Verification URL:</strong>
            <code>{window.location.origin}/verify/[CERTIFICATE-ID]</code>
          </div>
        </div>
      </div>

      {/* Certificate Preview Modal */}
      {showCertificatePreview && previewCertificate && (
        <div className="certificate-modal-overlay">
          <div className="certificate-modal">
            <div className="certificate-modal-header">
              <h3>Certificate Preview</h3>
              <div className="certificate-modal-actions">
                <button 
                  onClick={() => setShowCertificatePreview(false)}
                  className="modal-action-btn close"
                >
                  <FaTimes /> Close Preview
                </button>
              </div>
            </div>
            <div className="certificate-modal-content">
              <div className="certificate-container">
                <CertificateTemplate 
                  certificate={previewCertificate} 
                  showQR={false}
                />
              </div>
            </div>
            <div className="certificate-modal-footer">
              <div className="certificate-info">
                <span>This is a preview. QR code will be generated after saving.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCertificate;