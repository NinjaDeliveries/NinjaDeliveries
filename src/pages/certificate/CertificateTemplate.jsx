import React from 'react';
import { formatDate } from '../../utils/certificateUtils';
import ninjaLogo from './ninjaimg.JPG';
import ninjaSign from './sign.JPG';

// Certificate Template Component - Professional Internship Certificate
const CertificateTemplate = ({ certificate, showQR = true }) => {
  return (
    <div 
      className="certificate-container" 
      id="certificate-template"
      style={{
        width: '842px',
        height: '595px',
        backgroundColor: '#ffffff',
        border: '12px solid #1e40af',
        borderRadius: '8px',
        fontFamily: 'Times New Roman, serif',
        lineHeight: '1.4',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Decorative Circles */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.05 }}>
        <div style={{
          position: 'absolute',
          top: '40px',
          left: '40px',
          width: '128px',
          height: '128px',
          border: '4px solid #93c5fd',
          borderRadius: '50%'
        }}></div>
        <div style={{
          position: 'absolute',
          top: '80px',
          right: '80px',
          width: '96px',
          height: '96px',
          border: '4px solid #93c5fd',
          borderRadius: '50%'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '80px',
          width: '80px',
          height: '80px',
          border: '4px solid #93c5fd',
          borderRadius: '50%'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '40px',
          right: '40px',
          width: '112px',
          height: '112px',
          border: '4px solid #93c5fd',
          borderRadius: '50%'
        }}></div>
      </div>

      {/* Main Content Container */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 32px 16px 32px'
      }}>
        {/* Header Section - Logo, Title, QR Code */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px'
        }}>
          {/* Logo */}
          <img 
            src={ninjaLogo}
            alt="Ninja Deliveries Logo" 
            style={{
              width: '96px',
              height: '96px',
              objectFit: 'contain'
            }}
          />

          {/* Company Title */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{
              fontSize: '32px',
              fontFamily: 'Times New Roman, serif',
              color: '#1e40af',
              fontWeight: 'bold',
              letterSpacing: '2px',
              margin: '0 0 4px 0'
            }}>
              NINJA DELIVERIES
            </h1>
          </div>

          {/* QR Code */}
          {showQR && (
            <img 
              src={certificate.qrCodeImage} 
              alt="QR Code for verification" 
              style={{
                width: '96px',
                height: '96px',
                objectFit: 'contain'
              }}
            />
          )}
        </div>

        {/* Certificate Title */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <h2 style={{
            fontSize: '22px',
            fontFamily: 'Times New Roman, serif',
            color: '#374151',
            fontWeight: 'bold',
            letterSpacing: '1px',
            margin: '0'
          }}>
            CERTIFICATE OF INTERNSHIP
          </h2>
        </div>

        {/* Main Certificate Content */}
        <div style={{
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingBottom: '60px'
        }}>
          {/* "This is to certify that" */}
          <p style={{
            fontSize: '15px',
            fontFamily: 'Times New Roman, serif',
            color: '#4b5563',
            fontStyle: 'italic',
            margin: '0 0 8px 0'
          }}>
            This is to certify that
          </p>

          {/* Candidate Name */}
          <div style={{ margin: '0 0 16px 0' }}>
            <h3 style={{
              fontSize: '34px',
              fontFamily: 'Times New Roman, serif',
              color: '#1e3a8a',
              fontWeight: 'bold',
              margin: '0',
              paddingBottom: '8px',
              display: 'inline-block',
              paddingLeft: '20px',
              paddingRight: '20px'
            }}>
              {certificate.candidateName}
            </h3>
          </div>

          {/* Certificate Text */}
          <div style={{ margin: '0', lineHeight: '1.5' }}>
            {/* "has successfully completed" */}
            <p style={{
              fontSize: '17px',
              fontFamily: 'Times New Roman, serif',
              color: '#1f2937',
              lineHeight: '1.6',
              margin: '8px 0'
            }}>
              has successfully completed the internship at
            </p>

            {/* Company Name */}
            <p style={{
              fontSize: '22px',
              fontFamily: 'Times New Roman, serif',
              color: '#1e40af',
              fontWeight: 'bold',
              lineHeight: '1.4',
              margin: '8px 0'
            }}>
              Ninja Deliveries
            </p>

            {/* Internship Period */}
            <p style={{
              fontSize: '17px',
              fontFamily: 'Times New Roman, serif',
              color: '#1f2937',
              lineHeight: '1.6',
              margin: '8px 0'
            }}>
              from <span style={{ fontWeight: 'bold' }}>{certificate.internshipPeriod}</span>
            </p>
          </div>

          {/* Appreciation Text */}
          <div style={{ marginTop: '12px', paddingLeft: '16px', paddingRight: '16px' }}>
            <p style={{
              fontSize: '13px',
              fontFamily: 'Times New Roman, serif',
              color: '#4b5563',
              fontStyle: 'italic',
              lineHeight: '1.4',
              textAlign: 'center',
              margin: '12px 0',
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              During this period, the candidate has demonstrated dedication, enthusiasm, and a strong willingness to learn. We appreciate the contributions and wish all the best for future endeavors.
            </p>
          </div>
        </div>

        {/* Bottom Section - Certificate Info and Signature */}
        <div style={{ 
          marginTop: 'auto',
          position: 'absolute',
          bottom: '16px',
          left: '32px',
          right: '32px'
        }}>
          {/* Main Bottom Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            width: '100%'
          }}>
            {/* Left Side - Certificate Information */}
            <div style={{ textAlign: 'left' }}>
              <p style={{
                fontSize: '11px',
                fontFamily: 'Times New Roman, serif',
                color: '#6b7280',
                margin: '0 0 2px 0'
              }}>
                Issue Date: <span style={{ fontWeight: '600', color: '#374151' }}>
                  {formatDate(certificate.issueDate)}
                </span>
              </p>
              <p style={{
                fontSize: '9px',
                fontFamily: 'Times New Roman, serif',
                color: '#9ca3af',
                margin: '0'
              }}>
                Certificate ID: {certificate.certificateId}
              </p>
            </div>

            {/* Right Side - Signature Section */}
            <div style={{ textAlign: 'center' }}>
              {/* Signature Image */}
              <img 
                src={ninjaSign}
                alt="Signature" 
                style={{
                  height: '40px',
                  width: 'auto',
                  marginBottom: '2px',
                  display: 'block',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}
              />

              {/* Signature Line */}
              <div style={{
                width: '120px',
                height: '1px',
                backgroundColor: '#374151',
                margin: '0 auto 2px auto'
              }}></div>

              {/* Founder Name */}
              <p style={{
                fontSize: '11px',
                fontFamily: 'Times New Roman, serif',
                color: '#374151',
                fontWeight: 'bold',
                margin: '0 0 1px 0'
              }}>
                ABHAY KUMAR
              </p>

              {/* Title */}
              <p style={{
                fontSize: '9px',
                fontFamily: 'Times New Roman, serif',
                color: '#6b7280',
                margin: '0'
              }}>
                Founder & Director
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateTemplate;