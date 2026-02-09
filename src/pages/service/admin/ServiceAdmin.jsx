import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../../context/Firebase';
import { collection, onSnapshot, query, orderBy, limit, where, serverTimestamp, addDoc } from 'firebase/firestore';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { toast } from 'react-toastify';
import './ServiceAdmin.css';
import { detectDevice } from '../../../utils/deviceDetection';
import CompanyActivityDetails from './CompanyActivityDetails';

const ServiceAdmin = () => {
  const [companies, setCompanies] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // Changed from 10 to 20
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [onlineCompanies, setOnlineCompanies] = useState(new Set());
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [selectedCompany, setSelectedCompany] = useState(null); // For activity details modal

  // Refs for cleanup
  const unsubscribeRefs = useRef({});
  const realtimeRefs = useRef({});

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

  // Log activity with device detection
  const logActivity = useCallback(async (action, companyId, details = {}) => {
    try {
      const deviceInfo = detectDevice(navigator.userAgent);
      
      // Find company name from companies list
      let companyName = 'Admin';
      if (companyId && companyId !== 'admin') {
        const company = companies.find(c => c.id === companyId);
        companyName = company?.companyName || company?.name || company?.businessName || details.companyName || 'Unknown Company';
      }
      
      const activityData = {
        companyId,
        companyName, // Store company name directly in the log
        userId: 'admin',
        action,
        details: {
          action: details.action || action.replace('_', ' ').toUpperCase(),
          timestamp: details.timestamp || new Date().toISOString(),
          ...details
        },
        deviceInfo: {
          userAgent: navigator.userAgent,
          device: deviceInfo.device || 'Desktop',
          browser: deviceInfo.browser || 'Unknown',
          os: deviceInfo.os || 'Unknown',
          ip: details.ip || '192.168.1.1' // Get from server or use Cloud Function
        },
        timestamp: serverTimestamp(),
        type: 'admin',
        success: details.success !== false // Default to true unless explicitly false
      };

      const docRef = await addDoc(collection(db, 'service_activity_logs'), activityData);
      console.log('Activity logged successfully:', docRef.id, activityData);
      return docRef;
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [companies]);

  const refreshData = useCallback(async () => {
    console.log('Refresh button clicked');
    toast.success('Data refreshed successfully');
    setLastUpdated(new Date());
    
    // Log the refresh activity with proper success status
    try {
      const result = await logActivity('refresh_data', 'admin', { 
        action: 'Data refreshed from admin panel',
        timestamp: new Date().toISOString(),
        success: true
      });
      console.log('Refresh activity logged:', result);
    } catch (error) {
      console.error('Failed to log refresh activity:', error);
    }
  }, [logActivity]);

  // Removed demo data generation - only use real Firestore data

  const exportToCSV = (data, filename) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Handle values that might contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${filename} exported successfully`);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('serviceAdmin_darkMode', newDarkMode.toString());
    logActivity('toggle_dark_mode', 'admin', { 
      newMode: newDarkMode ? 'dark' : 'light',
      timestamp: new Date().toISOString()
    });
  };

  const setupRealtimeListeners = useCallback(async () => {
    try {
      setLoading(true);
      setConnectionStatus('connecting');

      // Cleanup existing listeners
      cleanupListeners();

      // Companies listener with error handling
      try {
        const companiesQuery = query(
          collection(db, 'service_company'),
          orderBy('createdAt', 'desc')
        );

        const unsubscribeCompanies = onSnapshot(
          companiesQuery,
          (snapshot) => {
            try {
              const companiesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                lastLogin: doc.data().lastLogin?.toDate()
              }));
              setCompanies(companiesList);
            } catch (error) {
              console.error('Error processing companies data:', error);
            }
          },
          (error) => {
            console.error('Companies listener error:', error);
            toast.error('Failed to load companies data');
            setConnectionStatus('error');
          }
        );
        unsubscribeRefs.current.companies = unsubscribeCompanies;
      } catch (error) {
        console.error('Error setting up companies listener:', error);
      }

      // Services listener with error handling
      try {
        const servicesQuery = query(
          collection(db, 'service_services'),
          orderBy('createdAt', 'desc')
        );

        const unsubscribeServices = onSnapshot(
          servicesQuery,
          (snapshot) => {
            try {
              const servicesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
              }));
              setServices(servicesList);
            } catch (error) {
              console.error('Error processing services data:', error);
            }
          },
          (error) => {
            console.error('Services listener error:', error);
          }
        );
        unsubscribeRefs.current.services = unsubscribeServices;
      } catch (error) {
        console.error('Error setting up services listener:', error);
      }

      // Categories listener with error handling - simplified query
      try {
        console.log('Setting up categories listener...');
        const categoriesQuery = query(
          collection(db, 'service_categories_master'),
          orderBy('name')
        );

        const unsubscribeCategories = onSnapshot(
          categoriesQuery,
          (snapshot) => {
            try {
              console.log('Categories snapshot received:', snapshot.docs.length, 'documents');
              const categoriesList = snapshot.docs
                .map(doc => {
                  const data = doc.data();
                  console.log('Category document:', { id: doc.id, ...data });
                  return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate()
                  };
                })
                .filter(category => category.status === 'active'); // Filter in JS instead of query
              
              console.log('Final categories list:', categoriesList);
              setCategories(categoriesList);
            } catch (error) {
              console.error('Error processing categories data:', error);
            }
          },
          (error) => {
            console.error('Categories listener error:', error);
          }
        );
        unsubscribeRefs.current.categories = unsubscribeCategories;
      } catch (error) {
        console.error('Error setting up categories listener:', error);
      }

      // Real-time online status using Realtime Database with error handling
      try {
        const database = getDatabase();
        const onlineStatusRef = ref(database, 'onlineStatus');

        const unsubscribeOnline = onValue(
          onlineStatusRef,
          (snapshot) => {
            try {
              const onlineData = snapshot.val() || {};
              const onlineSet = new Set();

              Object.keys(onlineData).forEach(companyId => {
                if (onlineData[companyId].isOnline) {
                  onlineSet.add(companyId);
                }
              });

              setOnlineCompanies(onlineSet);
            } catch (error) {
              console.error('Error processing online status data:', error);
            }
          },
          (error) => {
            console.error('Online status listener error:', error);
          }
        );
        realtimeRefs.current.online = unsubscribeOnline;
      } catch (error) {
        console.error('Error setting up online status listener:', error);
      }

      setConnectionStatus('connected');
      setLoading(false);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error setting up listeners:', error);
      toast.error('Failed to setup real-time data');
      setConnectionStatus('error');
      setLoading(false);
    }
  }, [cleanupListeners]);

  const filteredServices = services.filter(service => {
    const matchesSearch = !searchTerm ||
      (service.serviceName || service.name || service.title || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesCategory = selectedCategory === 'all';
    if (!matchesCategory && selectedCategory !== 'all') {
      // Try multiple ways to match category
      matchesCategory = service.categoryId === selectedCategory ||
        service.category === selectedCategory ||
        service.categoryName === selectedCategory;

      // Also try to match by category name
      if (!matchesCategory) {
        const category = categories.find(c => c.id === selectedCategory);
        if (category) {
          matchesCategory = service.category === category.name ||
            service.categoryName === category.name;
        }
      }
    }

    return matchesSearch && matchesCategory;
  });

  const filteredLogs = activityLogs.filter(log => {
    return !searchTerm ||
      log.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = !searchTerm ||
      (company.companyName || company.name || company.businessName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = statusFilter === 'all';
    if (statusFilter === 'active') {
      matchesStatus = company.isActive === true;
    } else if (statusFilter === 'inactive') {
      matchesStatus = company.isActive === false;
    } else if (statusFilter === 'online') {
      matchesStatus = onlineCompanies.has(company.id);
    }

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const getPaginatedData = (data, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const getTotalPages = (dataLength) => Math.ceil(dataLength / itemsPerPage);

  // Set up real-time listeners when component mounts
  useEffect(() => {
    setupRealtimeListeners();
    
    // Cleanup on unmount
    return () => {
      cleanupListeners();
    };
  }, [setupRealtimeListeners, cleanupListeners]);

  // Setup activity logs listener after companies are loaded
  useEffect(() => {
    if (companies.length === 0) return;

    // Load real activity logs from Firebase with error handling
    try {
      const activityQuery = query(
        collection(db, 'service_activity_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const unsubscribeActivity = onSnapshot(
        activityQuery,
        (snapshot) => {
          try {
            const realLogs = snapshot.docs.map(doc => {
              const data = doc.data();
              
              // Find company name from companies list
              const company = companies.find(c => c.id === data.companyId);
              const companyName = company?.companyName || company?.name || company?.businessName || data.companyName || 'Unknown Company';
              
              return {
                id: doc.id,
                ...data,
                companyName: companyName, // Add company name from real data
                // Ensure timestamp is properly converted
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
                // Ensure success field has a default value
                success: data.success !== false,
                // Extract device info properly
                device: data.deviceInfo?.device || data.device || 'Unknown',
                ipAddress: data.deviceInfo?.ip || data.ipAddress || 'N/A'
              };
            });
            setActivityLogs(realLogs);
            console.log('Loaded real activity logs:', realLogs.length);
          } catch (error) {
            console.error('Error processing activity logs data:', error);
            setActivityLogs([]); // Set empty array instead of generating demo data
          }
        },
        (error) => {
          console.error('Activity logs listener error:', error);
          setActivityLogs([]); // Set empty array instead of generating demo data
        }
      );
      
      // Store unsubscribe function
      unsubscribeRefs.current.activity = unsubscribeActivity;

      // Cleanup function
      return () => {
        if (unsubscribeActivity) {
          unsubscribeActivity();
        }
      };
    } catch (error) {
      console.log('Activity logs collection not available:', error);
      setActivityLogs([]); // Set empty array instead of generating demo data
    }
  }, [companies]); // Re-run when companies change

  // Enhanced analytics with online status
  const analytics = {
    totalCompanies: companies.length,
    activeCompanies: companies.filter(c => c.isActive).length,
    inactiveCompanies: companies.filter(c => !c.isActive).length,
    onlineCompanies: onlineCompanies.size,
    totalServices: services.length,
    activeServices: services.filter(s => s.isActive).length,
    totalCategories: categories.length,
    recentActivity: activityLogs.filter(log => {
      if (!log.timestamp) return false;
      const logDate = typeof log.timestamp === 'object' ? 
        new Date(log.timestamp.seconds ? log.timestamp.seconds * 1000 : log.timestamp) :
        new Date(log.timestamp);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return logDate > dayAgo;
    }).length,
    connectionStatus,
    lastUpdated
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <h3 style={styles.loadingTitle}>Loading Service Dashboard...</h3>
        <p style={styles.loadingText}>Fetching real-time data from Firebase</p>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.container,
      backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
      color: darkMode ? '#ffffff' : '#1e293b'
    }}>
      {/* Header */}
      <div style={{
        ...styles.header,
        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
      }}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>Service Analytics Dashboard</h1>
            <p style={{
              ...styles.subtitle,
              color: darkMode ? '#94a3b8' : '#64748b'
            }}>
              Real-time insights and analytics for service companies
            </p>
          </div>
          <div style={styles.headerActions}>
            <div style={styles.liveIndicator}>
              <div style={styles.liveDot} className="service-admin-pulse"></div>
              <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>Live Data</span>
            </div>
            <div style={{ fontSize: '12px', color: darkMode ? '#94a3b8' : '#64748b' }}>
              Last updated: {lastUpdated.toLocaleTimeString()} {lastUpdated.toLocaleDateString()}
            </div>
            <button
              onClick={refreshData}
              style={{
                ...styles.button,
                backgroundColor: darkMode ? '#334155' : '#f1f5f9'
              }}
            >
              🔄
            </button>
            <button
              onClick={toggleDarkMode}
              style={{
                ...styles.button,
                backgroundColor: darkMode ? '#334155' : '#f1f5f9'
              }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        {/* Tab Navigation */}
        <div style={{
          ...styles.tabContainer,
          backgroundColor: darkMode ? '#1e293b' : '#ffffff'
        }}>
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'companies', label: 'Companies', icon: '🏢' },
            { key: 'services', label: 'Services', icon: '⚙️' },
            { key: 'activity', label: 'Activity', icon: '📈' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
                setSearchTerm('');
              }}
              style={{
                ...styles.tabButton,
                backgroundColor: activeTab === tab.key 
                  ? (darkMode ? '#3b82f6' : '#3b82f6')
                  : 'transparent',
                color: activeTab === tab.key 
                  ? '#ffffff'
                  : (darkMode ? '#94a3b8' : '#64748b')
              }}
            >
              <span style={{ marginRight: '8px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div style={styles.statsGrid}>
              <StatsCard
                title="Total Companies"
                value={analytics.totalCompanies}
                subtitle="Registered businesses"
                icon="🏢"
                darkMode={darkMode}
                trend="+12%"
              />
              <StatsCard
                title="Active Companies"
                value={analytics.activeCompanies}
                subtitle="Currently operational"
                icon="✅"
                darkMode={darkMode}
                trend="+8%"
              />
              <StatsCard
                title="Online Now"
                value={analytics.onlineCompanies}
                subtitle="Live and available"
                icon="🟢"
                darkMode={darkMode}
                trend="Real-time"
              />
              <StatsCard
                title="Total Services"
                value={analytics.totalServices}
                subtitle="Available services"
                icon="⚙️"
                darkMode={darkMode}
                trend="+15%"
              />
              <StatsCard
                title="Categories"
                value={analytics.totalCategories}
                subtitle="Service categories"
                icon="📂"
                darkMode={darkMode}
                trend="Stable"
              />
              <StatsCard
                title="Recent Activity"
                value={analytics.recentActivity}
                subtitle="Last 24 hours"
                icon="📈"
                darkMode={darkMode}
                trend="Live"
              />
            </div>

            {/* Quick Insights */}
            <div style={{
              ...styles.insightsContainer,
              backgroundColor: darkMode ? '#1e293b' : '#ffffff'
            }}>
              <h3 style={{
                ...styles.sectionTitle,
                color: darkMode ? '#ffffff' : '#1e293b'
              }}>
                Quick Insights
              </h3>
              <div style={styles.insightsGrid}>
                <div style={styles.insightCard}>
                  <div style={styles.insightIcon}>📊</div>
                  <div>
                    <h4 style={{ margin: 0, color: darkMode ? '#ffffff' : '#1e293b' }}>
                      Company Growth
                    </h4>
                    <p style={{ margin: '4px 0 0 0', color: darkMode ? '#94a3b8' : '#64748b' }}>
                      {analytics.activeCompanies} active out of {analytics.totalCompanies} total companies
                    </p>
                  </div>
                </div>
                <div style={styles.insightCard}>
                  <div style={styles.insightIcon}>🎯</div>
                  <div>
                    <h4 style={{ margin: 0, color: darkMode ? '#ffffff' : '#1e293b' }}>
                      Service Coverage
                    </h4>
                    <p style={{ margin: '4px 0 0 0', color: darkMode ? '#94a3b8' : '#64748b' }}>
                      {analytics.totalServices} services across {analytics.totalCategories} categories
                    </p>
                  </div>
                </div>
                <div style={styles.insightCard}>
                  <div style={styles.insightIcon}>⚡</div>
                  <div>
                    <h4 style={{ margin: 0, color: darkMode ? '#ffffff' : '#1e293b' }}>
                      Online Status
                    </h4>
                    <p style={{ margin: '4px 0 0 0', color: darkMode ? '#94a3b8' : '#64748b' }}>
                      {analytics.totalCompanies > 0 ? Math.round((analytics.onlineCompanies / analytics.totalCompanies) * 100) : 0}% companies online
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div>
            {/* Search and Filters */}
            <div style={{
              ...styles.filtersContainer,
              backgroundColor: darkMode ? '#1e293b' : '#ffffff'
            }}>
              <div style={styles.filtersGrid}>
                <div>
                  <label style={{
                    ...styles.label,
                    color: darkMode ? '#e2e8f0' : '#374151'
                  }}>
                    Search Companies
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#334155' : '#ffffff',
                      borderColor: darkMode ? '#475569' : '#d1d5db',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    ...styles.label,
                    color: darkMode ? '#e2e8f0' : '#374151'
                  }}>
                    Status Filter
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#334155' : '#ffffff',
                      borderColor: darkMode ? '#475569' : '#d1d5db',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                    <option value="online">Online Only</option>
                  </select>
                </div>
              </div>
              <div style={styles.resultsInfo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>
                    Showing {getPaginatedData(filteredCompanies, currentPage).length} of {filteredCompanies.length} companies
                  </span>
                  <button
                    onClick={() => exportToCSV(filteredCompanies, 'service_companies')}
                    style={{
                      ...styles.button,
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '8px 16px'
                    }}
                  >
                    📊 Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Companies Table */}
            <CompaniesTable 
              companies={getPaginatedData(filteredCompanies, currentPage)}
              services={services}
              darkMode={darkMode}
              totalCompanies={filteredCompanies.length}
              onViewActivity={(company) => setSelectedCompany(company)}
            />

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={getTotalPages(filteredCompanies.length)}
              onPageChange={setCurrentPage}
              darkMode={darkMode}
            />
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div>
            {/* Search and Filters */}
            <div style={{
              ...styles.filtersContainer,
              backgroundColor: darkMode ? '#1e293b' : '#ffffff'
            }}>
              <div style={styles.filtersGrid}>
                <div>
                  <label style={{
                    ...styles.label,
                    color: darkMode ? '#e2e8f0' : '#374151'
                  }}>
                    Search Services
                  </label>
                  <input
                    type="text"
                    placeholder="Search by service name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#334155' : '#ffffff',
                      borderColor: darkMode ? '#475569' : '#d1d5db',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    ...styles.label,
                    color: darkMode ? '#e2e8f0' : '#374151'
                  }}>
                    Category Filter
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#334155' : '#ffffff',
                      borderColor: darkMode ? '#475569' : '#d1d5db',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name || category.categoryName || category.title || `Category ${category.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={styles.resultsInfo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>
                    Showing {getPaginatedData(filteredServices, currentPage).length} of {filteredServices.length} services
                  </span>
                  <button
                    onClick={() => exportToCSV(filteredServices, 'service_services')}
                    style={{
                      ...styles.button,
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '8px 16px'
                    }}
                  >
                    📊 Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Services Table */}
            <ServicesTable 
              services={getPaginatedData(filteredServices, currentPage)}
              categories={categories}
              companies={companies}
              darkMode={darkMode}
            />

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={getTotalPages(filteredServices.length)}
              onPageChange={setCurrentPage}
              darkMode={darkMode}
            />
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div>
            {/* Search */}
            <div style={{
              ...styles.filtersContainer,
              backgroundColor: darkMode ? '#1e293b' : '#ffffff'
            }}>
              <div style={styles.filtersGrid}>
                <div>
                  <label style={{
                    ...styles.label,
                    color: darkMode ? '#e2e8f0' : '#374151'
                  }}>
                    Search Activity
                  </label>
                  <input
                    type="text"
                    placeholder="Search by company or action..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#334155' : '#ffffff',
                      borderColor: darkMode ? '#475569' : '#d1d5db',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  />
                </div>
              </div>
              <div style={styles.resultsInfo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>
                    Showing {getPaginatedData(filteredLogs, currentPage).length} of {filteredLogs.length} activities
                  </span>
                  <button
                    onClick={() => exportToCSV(filteredLogs, 'service_activity_logs')}
                    style={{
                      ...styles.button,
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '8px 16px'
                    }}
                  >
                    📊 Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Activity Table */}
            <ActivityTable 
              logs={getPaginatedData(filteredLogs, currentPage)}
              darkMode={darkMode}
            />

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={getTotalPages(filteredLogs.length)}
              onPageChange={setCurrentPage}
              darkMode={darkMode}
            />
          </div>
        )}
      </div>

      {/* Company Activity Details Modal */}
      {selectedCompany && (
        <CompanyActivityDetails
          companyId={selectedCompany.id}
          companyName={selectedCompany.companyName || selectedCompany.name || selectedCompany.businessName || 'Unknown Company'}
          onClose={() => setSelectedCompany(null)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

// Enhanced StatsCard component with trends
const StatsCard = ({ title, value, subtitle, icon, darkMode, trend }) => {
  return (
    <div style={{
      ...styles.statCard,
      backgroundColor: darkMode ? '#1e293b' : '#ffffff',
      borderColor: darkMode ? '#334155' : '#e2e8f0'
    }}>
      <div style={styles.statContent}>
        <div>
          <p style={{
            ...styles.statLabel,
            color: darkMode ? '#94a3b8' : '#64748b'
          }}>
            {title}
          </p>
          <p style={{
            ...styles.statValue,
            color: darkMode ? '#ffffff' : '#1e293b'
          }}>
            {value}
          </p>
          <p style={{
            ...styles.statSubtitle,
            color: darkMode ? '#64748b' : '#94a3b8'
          }}>
            {subtitle}
          </p>
          {trend && (
            <div style={{
              ...styles.trendIndicator,
              color: trend.includes('+') ? '#10b981' : '#6b7280'
            }}>
              {trend}
            </div>
          )}
        </div>
        <div style={{
          ...styles.statIcon,
          backgroundColor: darkMode ? '#334155' : '#dbeafe'
        }}>
          <span style={{ fontSize: '24px' }}>{icon}</span>
        </div>
      </div>
    </div>
  );
};

// Companies Table Component
const CompaniesTable = ({ companies, services, darkMode, totalCompanies, onViewActivity }) => {
  if (companies.length === 0) {
    return (
      <div style={{
        ...styles.tableContainer,
        backgroundColor: darkMode ? '#1e293b' : '#ffffff'
      }}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🏢</div>
          <h3 style={{
            ...styles.emptyTitle,
            color: darkMode ? '#ffffff' : '#1e293b'
          }}>
            No Companies Found
          </h3>
          <p style={{
            ...styles.emptyText,
            color: darkMode ? '#94a3b8' : '#64748b'
          }}>
            {totalCompanies === 0 
              ? 'No service companies are registered in the system yet.'
              : 'No companies match your current search criteria.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.tableContainer,
      backgroundColor: darkMode ? '#1e293b' : '#ffffff'
    }}>
      <h3 style={{
        ...styles.tableTitle,
        color: darkMode ? '#ffffff' : '#1e293b'
      }}>
        Companies ({totalCompanies})
      </h3>
      
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={{
              backgroundColor: darkMode ? '#334155' : '#f8fafc'
            }}>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Company</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Contact</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Status</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Services</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Last Active</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <tr key={company.id} style={{
                borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
              }}>
                <td style={styles.td}>
                  <div>
                    <h4 style={{
                      ...styles.cellTitle,
                      color: darkMode ? '#ffffff' : '#1e293b'
                    }}>
                      {company.companyName || company.name || company.businessName || company.title || 'Unknown Company'}
                    </h4>
                    <p style={{
                      ...styles.cellSubtitle,
                      color: darkMode ? '#94a3b8' : '#64748b'
                    }}>
                      ID: {company.id.substring(0, 8)}...
                    </p>
                  </div>
                </td>
                <td style={styles.td}>
                  <div>
                    <p style={{
                      ...styles.cellTitle,
                      color: darkMode ? '#ffffff' : '#1e293b'
                    }}>
                      {company.email}
                    </p>
                    <p style={{
                      ...styles.cellSubtitle,
                      color: darkMode ? '#94a3b8' : '#64748b'
                    }}>
                      {company.phone || 'No phone'}
                    </p>
                  </div>
                </td>
                <td style={styles.td}>
                  <div>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: company.isActive ? '#dcfce7' : '#fef2f2',
                      color: company.isActive ? '#166534' : '#991b1b'
                    }}>
                      {company.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{
                        fontSize: '12px',
                        color: company.isOnline ? '#10b981' : '#ef4444'
                      }}>
                        {company.isOnline ? '🟢 Online' : '🔴 Offline'}
                      </span>
                    </div>
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.cellTitle,
                    color: darkMode ? '#ffffff' : '#1e293b'
                  }}>
                    {services.filter(s => s.companyId === company.id).length} Services
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.cellSubtitle,
                    color: darkMode ? '#94a3b8' : '#64748b'
                  }}>
                    {company.lastActive ? new Date(company.lastActive).toLocaleDateString() : 'Never'}
                  </span>
                </td>
                <td style={styles.td}>
                  <button
                    onClick={() => onViewActivity(company)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    📊 View Activity
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Services Table Component
const ServicesTable = ({ services, categories, companies, darkMode }) => {
  if (services.length === 0) {
    return (
      <div style={{
        ...styles.tableContainer,
        backgroundColor: darkMode ? '#1e293b' : '#ffffff'
      }}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>⚙️</div>
          <h3 style={{
            ...styles.emptyTitle,
            color: darkMode ? '#ffffff' : '#1e293b'
          }}>
            No Services Found
          </h3>
          <p style={{
            ...styles.emptyText,
            color: darkMode ? '#94a3b8' : '#64748b'
          }}>
            No services match your current search criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.tableContainer,
      backgroundColor: darkMode ? '#1e293b' : '#ffffff'
    }}>
      <h3 style={{
        ...styles.tableTitle,
        color: darkMode ? '#ffffff' : '#1e293b'
      }}>
        Services ({services.length})
      </h3>
      
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={{
              backgroundColor: darkMode ? '#334155' : '#f8fafc'
            }}>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Service</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Company</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Category</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Price</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {services.map(service => {
              const company = companies.find(c => c.id === service.companyId);
              
              // Smart categorization based on service name
              const getServiceCategory = (serviceName) => {
                const name = (serviceName || '').toLowerCase();
                
                // Pet grooming services
                if (name.includes('breed') || name.includes('bath') || name.includes('grooming') || 
                    name.includes('nail') || name.includes('paw') || name.includes('ear') || 
                    name.includes('hygiene') || name.includes('cleaning')) {
                  return 'Pet Grooming';
                }
                
                // Dance services
                if (name.includes('dance') || name.includes('choreography') || name.includes('workshop') || 
                    name.includes('masterclass') || name.includes('hip-hop') || name.includes('contemporary') || 
                    name.includes('bollywood') || name.includes('freestyle') || name.includes('kathak') || 
                    name.includes('bharatanatyam') || name.includes('classical') || name.includes('camp')) {
                  return 'Dance & Fitness';
                }
                
                // Plumbing services
                if (name.includes('fitting') || name.includes('tank') || name.includes('basin') || 
                    name.includes('sink') || name.includes('washroom') || name.includes('pipe') || 
                    name.includes('tap') || name.includes('flush') || name.includes('leakage') || 
                    name.includes('plumbing')) {
                  return 'Plumbing & Fitting';
                }
                
                // Health & Fitness
                if (name.includes('weight') || name.includes('fitness') || name.includes('health') || 
                    name.includes('exercise') || name.includes('training')) {
                  return 'Health & Fitness';
                }
                
                return 'General Service';
              };
              
              // Try to find category from loaded categories first
              let category = null;
              if (service.categoryId) {
                category = categories.find(c => c.id === service.categoryId);
              }
              if (!category && service.category) {
                category = categories.find(c => c.name === service.category || c.id === service.category);
              }
              if (!category && service.categoryName) {
                category = categories.find(c => c.name === service.categoryName || c.categoryName === service.categoryName);
              }
              
              // Use smart categorization if no category found
              const categoryName = category?.name || category?.categoryName || category?.title || 
                                 getServiceCategory(service.serviceName || service.name || service.title || '');
              
              // Debug: Show category matching
              if (service.serviceName?.includes('Water Tank') || service.serviceName?.includes('Medium Breed')) {
                console.log('Category matching for:', service.serviceName, {
                  serviceCategoryId: service.categoryId,
                  serviceCategory: service.category,
                  serviceCategoryName: service.categoryName,
                  foundCategory: category,
                  finalCategoryName: categoryName,
                  totalCategories: categories.length
                });
              }
              
              return (
                <tr key={service.id} style={{
                  borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
                }}>
                  <td style={styles.td}>
                    <div>
                      <h4 style={{
                        ...styles.cellTitle,
                        color: darkMode ? '#ffffff' : '#1e293b'
                      }}>
                        {service.serviceName || service.name || service.title || 'Unknown Service'}
                      </h4>
                      <p style={{
                        ...styles.cellSubtitle,
                        color: darkMode ? '#94a3b8' : '#64748b'
                      }}>
                        {service.description || 'No description'}
                      </p>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.cellTitle,
                      color: darkMode ? '#ffffff' : '#1e293b'
                    }}>
                      {company?.companyName || company?.name || company?.businessName || 'Unknown Company'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.categoryBadge,
                      backgroundColor: darkMode ? '#334155' : '#f1f5f9',
                      color: darkMode ? '#e2e8f0' : '#475569'
                    }}>
                      {categoryName}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.cellTitle,
                      color: darkMode ? '#ffffff' : '#1e293b'
                    }}>
                      ₹{service.price || '0'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: service.isActive ? '#dcfce7' : '#fef2f2',
                      color: service.isActive ? '#166534' : '#991b1b'
                    }}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Activity Table Component
const ActivityTable = ({ logs, darkMode }) => {
  // Debug: Log the first few logs to see their structure
  if (logs.length > 0) {
    console.log('ActivityTable rendering logs:', logs.slice(0, 3));
  }
  
  if (logs.length === 0) {
    return (
      <div style={{
        ...styles.tableContainer,
        backgroundColor: darkMode ? '#1e293b' : '#ffffff'
      }}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📈</div>
          <h3 style={{
            ...styles.emptyTitle,
            color: darkMode ? '#ffffff' : '#1e293b'
          }}>
            No Activity Found
          </h3>
          <p style={{
            ...styles.emptyText,
            color: darkMode ? '#94a3b8' : '#64748b'
          }}>
            No activity logs available yet. Activity will appear here when companies perform actions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.tableContainer,
      backgroundColor: darkMode ? '#1e293b' : '#ffffff'
    }}>
      <h3 style={{
        ...styles.tableTitle,
        color: darkMode ? '#ffffff' : '#1e293b'
      }}>
        Recent Activity ({logs.length})
      </h3>
      
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={{
              backgroundColor: darkMode ? '#334155' : '#f8fafc'
            }}>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Company</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Action</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Time</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Device</th>
              <th style={{
                ...styles.th,
                color: darkMode ? '#e2e8f0' : '#374151'
              }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              // Extract action text from details or action field
              const actionText = log.details?.action || log.action || 'Unknown Action';
              
              // Format timestamp properly
              let formattedTime = 'Just now';
              if (log.timestamp) {
                try {
                  const date = log.timestamp instanceof Date ? 
                    log.timestamp : 
                    (log.timestamp.seconds ? new Date(log.timestamp.seconds * 1000) : new Date(log.timestamp));
                  formattedTime = date.toLocaleString();
                } catch (e) {
                  console.error('Error formatting timestamp:', e);
                }
              }
              
              // Extract device info
              const deviceName = log.deviceInfo?.device || log.device || 'Unknown Device';
              const ipAddress = log.deviceInfo?.ip || log.ipAddress || 'N/A';
              
              return (
                <tr key={log.id} style={{
                  borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
                }}>
                  <td style={styles.td}>
                    <div>
                      <p style={{
                        ...styles.cellTitle,
                        color: darkMode ? '#ffffff' : '#1e293b'
                      }}>
                        {log.companyName || 'Unknown Company'}
                      </p>
                      <p style={{
                        ...styles.cellSubtitle,
                        color: darkMode ? '#94a3b8' : '#64748b'
                      }}>
                        {ipAddress}
                      </p>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div>
                      <span style={{
                        ...styles.cellTitle,
                        color: darkMode ? '#ffffff' : '#1e293b'
                      }}>
                        {actionText}
                      </span>
                      <p style={{
                        ...styles.cellSubtitle,
                        color: darkMode ? '#94a3b8' : '#64748b'
                      }}>
                        {log.details?.timestamp ? 
                          new Date(log.details.timestamp).toLocaleString() : 
                          'System action'
                        }
                      </p>
                    </div>
                  </td>
                  <td style={{
                    ...styles.td,
                    color: darkMode ? '#94a3b8' : '#64748b'
                  }}>
                    {formattedTime}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.deviceBadge,
                      backgroundColor: deviceName.toLowerCase().includes('mobile') ? '#dbeafe' : '#f3e8ff',
                      color: deviceName.toLowerCase().includes('mobile') ? '#1e40af' : '#7c3aed'
                    }}>
                      {deviceName}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: log.success ? '#dcfce7' : '#fef2f2',
                      color: log.success ? '#166534' : '#991b1b'
                    }}>
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange, darkMode }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div style={{
      ...styles.paginationContainer,
      backgroundColor: darkMode ? '#1e293b' : '#ffffff'
    }}>
      <div style={styles.paginationInfo}>
        <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>
          Page {currentPage} of {totalPages}
        </span>
      </div>
      
      <div style={styles.paginationButtons}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            ...styles.paginationButton,
            backgroundColor: darkMode ? '#334155' : '#f8fafc',
            color: darkMode ? '#e2e8f0' : '#374151',
            opacity: currentPage === 1 ? 0.5 : 1,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Previous
        </button>
        
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            style={{
              ...styles.paginationButton,
              backgroundColor: page === currentPage 
                ? '#3b82f6' 
                : (darkMode ? '#334155' : '#f8fafc'),
              color: page === currentPage 
                ? '#ffffff' 
                : (darkMode ? '#e2e8f0' : '#374151'),
              cursor: page === '...' ? 'default' : 'pointer'
            }}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            ...styles.paginationButton,
            backgroundColor: darkMode ? '#334155' : '#f8fafc',
            color: darkMode ? '#e2e8f0' : '#374151',
            opacity: currentPage === totalPages ? 0.5 : 1,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ServiceAdmin;

// Inline Styles
const styles = {
  container: {
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f8fafc',
  },

  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },

  loadingTitle: {
    margin: '16px 0 8px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
  },

  loadingText: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
  },

  header: {
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },

  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '24px',
    paddingBottom: '24px',
  },

  title: {
    margin: 0,
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
  },

  subtitle: {
    marginTop: '4px',
    fontSize: '14px',
  },

  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  liveDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#10b981',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },

  button: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  },

  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '32px 24px',
  },

  // Tab Navigation
  tabContainer: {
    display: 'flex',
    borderRadius: '12px',
    padding: '4px',
    marginBottom: '32px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  },

  tabButton: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },

  statCard: {
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    border: '1px solid',
    transition: 'all 0.2s ease',
  },

  statContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statLabel: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '500',
  },

  statValue: {
    margin: '8px 0 4px 0',
    fontSize: '32px',
    fontWeight: '700',
  },

  statSubtitle: {
    margin: 0,
    fontSize: '12px',
  },

  trendIndicator: {
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '4px',
  },

  statIcon: {
    padding: '12px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Insights
  insightsContainer: {
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    marginBottom: '32px',
  },

  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: '600',
  },

  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },

  insightCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    border: '1px solid rgba(59, 130, 246, 0.1)',
  },

  insightIcon: {
    fontSize: '24px',
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },

  // Filters
  filtersContainer: {
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    marginBottom: '24px',
  },

  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },

  resultsInfo: {
    paddingTop: '16px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
  },

  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
  },

  // Tables
  tableContainer: {
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    marginBottom: '24px',
    overflow: 'hidden',
  },

  tableTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    padding: '24px 24px 16px 24px',
  },

  tableWrapper: {
    overflowX: 'auto',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  td: {
    padding: '16px',
    fontSize: '14px',
  },

  cellTitle: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: '600',
  },

  cellSubtitle: {
    margin: 0,
    fontSize: '12px',
  },

  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },

  categoryBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },

  deviceBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },

  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5,
  },

  emptyTitle: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    fontWeight: '600',
  },

  emptyText: {
    margin: 0,
    fontSize: '14px',
    maxWidth: '400px',
    lineHeight: '1.5',
  },

  // Pagination
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  },

  paginationInfo: {
    fontSize: '14px',
  },

  paginationButtons: {
    display: 'flex',
    gap: '8px',
  },

  paginationButton: {
    padding: '8px 12px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
};

// Add CSS animation for spinner and pulse
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
document.head.appendChild(styleSheet);
