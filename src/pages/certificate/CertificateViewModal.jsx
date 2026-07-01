import { FaTimes, FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import CertificateTemplate from './CertificateTemplate';
import '../../style/CertificateModal.css';

const CertificateViewModal = ({ certificate, isOpen, onClose }) => {
  if (!isOpen || !certificate) return null;

  const handleDownloadPDF = async () => {
    try {
      const certificateElement = document.getElementById('certificate-template');
      
      if (!certificateElement) {
        throw new Error('Certificate template not found');
      }

      // Create canvas from the certificate element
      const canvas = await html2canvas(certificateElement, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Calculate PDF dimensions (A4 landscape)
      const imgWidth = 297; // A4 width in mm (landscape)
      const imgHeight = 210; // A4 height in mm (landscape)
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Add the canvas as image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Download the PDF
      const fileName = `Certificate_${certificate.certificateId}_${certificate.candidateName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="certificate-modal-overlay">
      <div className="certificate-modal">
        <div className="certificate-modal-header">
          <h3>
            Certificate Preview - {certificate.certificateId}
          </h3>
          <div className="certificate-modal-actions">
            <button 
              onClick={handleDownloadPDF}
              className="modal-action-btn download"
              title="Download PDF"
            >
              <FaDownload /> Download PDF
            </button>
            <button 
              onClick={onClose}
              className="modal-action-btn close"
              title="Close Modal"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="certificate-modal-content">
          <div className="certificate-container">
            <CertificateTemplate 
              certificate={certificate} 
              showQR={true} 
            />
          </div>
        </div>

        <div className="certificate-modal-footer">
          <div className="certificate-info">
            <span><strong>Candidate:</strong> {certificate.candidateName}</span>
            <span><strong>Role:</strong> {certificate.role}</span>
            <span><strong>Period:</strong> {certificate.internshipPeriod}</span>
            <span><strong>Status:</strong> 
              <span className={`status-badge ${certificate.status}`}>
                {certificate.status}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateViewModal;