import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  limit, 
  where, 
  getDocs,
  doc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../context/Firebase';
import { getDatabase, ref, onValue, off } from 'firebase/database';

// Import components
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardCards from './components/DashboardCards';
import Charts from './components/Charts';
import TopCompaniesTable from './components/TopCompaniesTableNew';
import RecentActivityTable from './components/RecentActivityTable';

// Import CSS
import './ServiceAdmin.css';

const ServiceAdmin = () => {
  // State management
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');

  // Data states
  const [companies, setCompanies] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [onlineCompanies, setOnlineCompanies] = useState(new Set());

  // Stats states
  const [dashboardStats, setDashboardStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    inactiveCompanies: 0,
    newRegistrations: 0,
    totalServices: 0,
    categories: 0,
    todayActivity: 0,
    onlineNow: 0,
    revenue: 0,
    bookings: 0,
    completionRate: 0,
    growthRate: 0
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    city: 'all',
    category: 'all',
    dateRange: '7d'
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Refs for cleanup
  const unsubscribeRefs = useRef({});
  const realtimeRefs = useRef({});

  // Device detection utility
  const detectDevice = useCallback((userAgent) => {
    const ua = userAgent.toLowerCase();
    
    // Detect device type
    let device = 'Desktop';
    if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
      device = /tablet|ipad/i.test(ua) ? 'Tablet' : 'Mobile';
    }

    // Detect OS
    let os = 'Unknown';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

    // Detect browser
    let browser = 'Unknown';
    if (/chrome/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/edge/i.test(ua)) browser = 'Edge';
    else if (/opera/i.test(ua)) browser = 'Opera';

    return { device, os, browser };
  }, []);

  // Setup real-time listeners
  const setupRealtimeListeners = useCallback(async () => {
    try {
      setLoading(true);
      setConnectionStatus('connecting');

      // Cleanup existing listeners
      cleanupListeners();

      // Companies listener
      const companiesQuery = query(
        collection(db, 'companies'),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribeCompanies = onSnapshot(
        companiesQuery,
        (snapshot) => {
          const companiesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCompanies(companiesData);
          updateDashboardStats(companiesData);
        },
        (error) => {
          console.error('Companies listener error:', error);
          setError('Failed to load companies data');
        }
      );
      unsubscribeRefs.current.companies = unsubscribeCompanies;

      // Services listener
      const servicesQuery = query(
        collection(db, 'services'),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribeServices = onSnapshot(
        servicesQuery,
        (snapshot) => {
          const servicesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setServices(servicesData);
        },
        (error) => {
          console.error('Services listener error:', error);
        }
      );
      unsubscribeRefs.current.services = unsubscribeServices;

      // Categories listener
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('status', '==', 'active')
      );
      
      const unsubscribeCategories = onSnapshot(
        categoriesQuery,
        (snapshot) => {
          const categoriesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCategories(categoriesData);
        },
        (error) => {
          console.error('Categories listener error:', error);
        }
      );
      unsubscribeRefs.current.categories = unsubscribeCategories;

      // Activity logs listener
      const activityQuery = query(
        collection(db, 'activityLogs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      const unsubscribeActivity = onSnapshot(
        activityQuery,
        (snapshot) => {
          const activityData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setActivityLogs(activityData);
        },
        (error) => {
          console.error('Activity logs listener error:', error);
        }
      );
      unsubscribeRefs.current.activity = unsubscribeActivity;

      // Real-time online status using Realtime Database
      const database = getDatabase();
      const onlineStatusRef = ref(database, 'onlineStatus');
      
      const unsubscribeOnline = onValue(
        onlineStatusRef,
        (snapshot) => {
          const onlineData = snapshot.val() || {};
          const onlineSet = new Set();
          
          Object.keys(onlineData).forEach(companyId => {
            if (onlineData[companyId].isOnline) {
              onlineSet.add(companyId);
            }
          });
          
          setOnlineCompanies(onlineSet);
          setDashboardStats(prev => ({ ...prev, onlineNow: onlineSet.size }));
        },
        (error) => {
          console.error('Online status listener error:', error);
        }
      );
      realtimeRefs.current.online = unsubscribeOnline;

      setConnectionStatus('connected');
      setLoading(false);

    } catch (error) {
      console.error('Error setting up listeners:', error);
      setError('Failed to initialize real-time data');
      setConnectionStatus('error');
      setLoading(false);
    }
  }, []);

  // Cleanup listeners
  const cleanupListeners = useCallback(() => {
    Object.values(unsubscribeRefs.current).forEach(unsubscribe => {
      if (unsubscribe) unsubscribe();
    });
    Object.values(realtimeRefs.current).forEach(unsubscribe => {
      if (unsubscribe) unsubscribe();
    });
    unsubscribeRefs.current = {};
    realtimeRefs.current = {};
  }, []);

  // Update dashboard stats
  const updateDashboardStats = useCallback((companiesData) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const stats = {
      totalCompanies: companiesData.length,
      activeCompanies: companiesData.filter(c => c.status === 'active').length,
      inactiveCompanies: companiesData.filter(c => c.status === 'inactive').length,
      newRegistrations: companiesData.filter(c => 
        c.createdAt && c.createdAt.toDate() >= todayStart
      ).length,
      totalServices: services.length,
      categories: categories.length,
      todayActivity: activityLogs.filter(log => 
        log.timestamp && log.timestamp.toDate() >= todayStart
      ).length,
      onlineNow: onlineCompanies.size,
      revenue: companiesData.reduce((sum, c) => sum + (c.billing?.totalRevenue || 0), 0),
      bookings: companiesData.reduce((sum, c) => sum + (c.metrics?.totalBookings || 0), 0),
      completionRate: companiesData.length > 0 
        ? Math.round(companiesData.reduce((sum, c) => sum + (c.metrics?.completionRate || 0), 0) / companiesData.length)
        : 0,
      growthRate: 12.5 // Calculate based on historical data
    };

    setDashboardStats(stats);
  }, [services, categories, activityLogs, onlineCompanies]);

  // Log activity
  const logActivity = useCallback(async (action, companyId, details = {}) => {
    try {
      const activityData = {
        companyId,
        userId: 'admin', // Get from auth context
        action,
        details,
        deviceInfo: {
          userAgent: navigator.userAgent,
          ...detectDevice(navigator.userAgent),
          ip: '192.168.1.1' // Get from server or use Cloud Function
        },
        timestamp: serverTimestamp(),
        type: 'admin'
      };

      await addDoc(collection(db, 'activityLogs'), activityData);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [detectDevice]);

  // Handle company action
  const handleCompanyAction = useCallback(async (company, action) => {
    try {
      const companyRef = doc(db, 'companies', company.id);
      
      switch (action) {
        case 'activate':
          await updateDoc(companyRef, { 
            status: 'active',
            updatedAt: serverTimestamp()
          });
          await logActivity('activate_company', company.id, { 
            companyName: company.companyName 
          });
          break;
          
        case 'deactivate':
          await updateDoc(companyRef, { 
            status: 'inactive',
            updatedAt: serverTimestamp()
          });
          await logActivity('deactivate_company', company.id, { 
            companyName: company.companyName 
          });
          break;
          
        case 'delete':
          // Soft delete or handle with Cloud Function
          await updateDoc(companyRef, { 
            status: 'deleted',
            updatedAt: serverTimestamp()
          });
          await logActivity('delete_company', company.id, { 
            companyName: company.companyName 
          });
          break;
      }
    } catch (error) {
      console.error('Failed to perform company action:', error);
    }
  }, [logActivity]);

  // Export data
  const exportData = useCallback(async (type) => {
    try {
      let data = [];
      let filename = '';
      
      switch (type) {
        case 'companies':
          data = companies.map(c => ({
            'Company Name': c.companyName,
            'Owner': c.ownerName,
            'Email': c.email,
            'Phone': c.phone,
            'City': c.city,
            'Status': c.status,
            'Registration Date': c.createdAt?.toDate?.().toLocaleDateString(),
            'Total Bookings': c.metrics?.totalBookings || 0,
            'Revenue': c.billing?.totalRevenue || 0
          }));
          filename = 'companies_export.csv';
          break;
          
        case 'activity':
          data = activityLogs.map(log => ({
            'Company': log.companyName,
            'Action': log.action,
            'Timestamp': log.timestamp?.toDate?.().toLocaleString(),
            'Device': log.deviceInfo?.device || 'Unknown',
            'IP': log.deviceInfo?.ip || 'Unknown'
          }));
          filename = 'activity_logs_export.csv';
          break;
      }

      // Convert to CSV and download
      const csv = convertToCSV(data);
      downloadCSV(csv, filename);
      
      await logActivity('export_data', 'admin', { type, count: data.length });
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  }, [companies, activityLogs, logActivity]);

  // Utility functions
  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Initialize
  useEffect(() => {
    setupRealtimeListeners();
    
    return () => {
      cleanupListeners();
    };
  }, [setupRealtimeListeners, cleanupListeners]);

  // Handle search
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setCurrentPage(1);
  }, []);

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="admin-overview">
            <DashboardCards 
              stats={dashboardStats}
              darkMode={darkMode}
              loading={loading}
            />
            <Charts 
              data={{ companies, services, bookings }}
              darkMode={darkMode}
              loading={loading}
              onExport={() => exportData('charts')}
            />
          </div>
        );
        
      case 'companies':
        return (
          <TopCompaniesTable
            companies={companies}
            darkMode={darkMode}
            loading={loading}
            onExport={() => exportData('companies')}
            onCompanyClick={handleCompanyAction}
          />
        );
        
      case 'services':
        return (
          <div className="services-section">
            <h2>Services Management</h2>
            <p>Services component will be implemented here</p>
          </div>
        );
        
      case 'logs':
        return (
          <RecentActivityTable
            logs={activityLogs}
            darkMode={darkMode}
            loading={loading}
            onExport={() => exportData('activity')}
          />
        );
        
      case 'analytics':
        return (
          <div className="analytics-section">
            <h2>Advanced Analytics</h2>
            <p>Advanced analytics component will be implemented here</p>
          </div>
        );
        
      case 'settings':
        return (
          <div className="settings-section">
            <h2>Admin Settings</h2>
            <p>Settings component will be implemented here</p>
          </div>
        );
        
      default:
        return renderContent();
    }
  };

  if (error) {
    return (
      <div className="admin-error">
        <h2>Error Loading Admin Dashboard</h2>
        <p>{error}</p>
        <button onClick={setupRealtimeListeners}>Retry</button>
      </div>
    );
  }

  return (
    <div className={`service-admin ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        darkMode={darkMode}
      />

      {/* Main Content */}
      <div className={`admin-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Topbar */}
        <Topbar
          darkMode={darkMode}
          onDarkModeToggle={() => setDarkMode(!darkMode)}
          onSearch={handleSearch}
          notifications={[]}
          user={{ name: 'Admin User', email: 'admin@ninja.com' }}
        />

        {/* Content Area */}
        <div className="admin-content">
          {/* Connection Status */}
          <div className={`connection-status ${connectionStatus}`}>
            <span className="status-dot"></span>
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'error' && 'Connection Error'}
          </div>

          {/* Render Content */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ServiceAdmin;
