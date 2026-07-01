// Certificate utility functions

export const formatDate = (date) => {
  if (!date) return '';
  
  // Handle Firebase Timestamp or regular Date
  const dateObj = date.toDate ? date.toDate() : new Date(date);
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const generateCertificateId = () => {
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `ND-INTERN-${randomNum}`;
};

export const calculateInternshipPeriod = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
  const startYear = start.getFullYear();
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
  const endYear = end.getFullYear();
  
  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startMonth} ${startYear}`;
    } else {
      return `${startMonth} - ${endMonth} ${startYear}`;
    }
  } else {
    return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
  }
};