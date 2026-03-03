import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../../context/Firebase';
import { collection, onSnapshot, query, orderBy, limit, where, serverTimestamp, addDoc } from 'firebase/firestore';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { toast } from 'react-toastify';
import './ServiceAdmin.css';
import { detectDevice } from '../../../utils/deviceDetection';
import CompanyActivityDetails from './CompanyActivityDetails';
import { getBookingPrice } from '../../../utils/packagePricingFix';

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
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSearchTerm, setBookingSearchTerm] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');
  const [bookingDateFilter, setBookingDateFilter] = useState('all');
  const [workerCountMap, setWorkerCountMap] = useState({}); // NEW: Worker count per company
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState([]);
  const [exportFilename, setExportFilename] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);

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
      const activityData = {
        companyId,
        userId: 'admin',
        action,
        details: {
          action: details.action || action.replace('_', ' ').toUpperCase(),
          timestamp: details.timestamp || new Date().toISOString(),
          ...details
        },
        deviceInfo: {
          userAgent: navigator.userAgent,
          ...deviceInfo,
          ip: '192.168.1.1' // Get from server or use Cloud Function
        },
        timestamp: serverTimestamp(),
        type: 'admin',
        success: details.success !== false // Default to true unless explicitly false
      };

      const docRef = await addDoc(collection(db, 'service_activity_logs'), activityData);
      console.log('Activity logged successfully:', docRef.id);
      return docRef;
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, []);

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

  // Open export modal with field selection
  const openExportModal = (data, filename) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Enrich data based on type
    let enrichedData = data;
    let priorityFields = []; // Fields to show first
    
    if (filename === 'service_companies') {
      // Enrich company data with computed fields
      enrichedData = data.map(company => {
        const companyServices = services.filter(s => s.companyId === company.id);
        const workerCount = workerCountMap[company.id] || 0;
        const isOnline = onlineCompanies.has(company.id);
        
        return {
          // Basic Info (Priority fields)
          companyName: company.companyName || company.name || company.businessName || 'Unknown',
          email: company.email || 'N/A',
          phone: company.phone || company.phoneNumber || company.mobile || 'N/A',
          status: company.isActive ? 'Active' : 'Inactive',
          onlineStatus: isOnline ? 'Online' : 'Offline',
          totalServices: companyServices.length,
          totalWorkers: workerCount,
          
          // Additional Info
          ownerName: company.ownerName || company.owner || 'N/A',
          ownerPhone: company.ownerPhone || 'N/A',
          address: company.address || 'N/A',
          city: company.city || 'N/A',
          state: company.state || 'N/A',
          pincode: company.pincode || 'N/A',
          
          // Dates
          createdAt: company.createdAt ? new Date(company.createdAt).toLocaleString() : 'N/A',
          lastActive: company.lastActive ? new Date(company.lastActive).toLocaleString() : 'Never',
          lastLogin: company.lastLogin ? new Date(company.lastLogin).toLocaleString() : 'Never',
          
          // Technical (less priority)
          id: company.id,
          deliveryZoneName: company.deliveryZoneName || 'N/A',
          type: company.type || 'N/A'
        };
      });
      
      // Priority fields for companies
      priorityFields = [
        'companyName', 'email', 'phone', 'status', 'onlineStatus', 
        'totalServices', 'totalWorkers', 'ownerName', 'ownerPhone',
        'address', 'city', 'state', 'createdAt', 'lastActive'
      ];
      
    } else if (filename === 'service_services') {
      // Enrich service data
      enrichedData = data.map(service => {
        const company = companies.find(c => c.id === service.companyId);
        const category = categories.find(cat => cat.id === service.categoryId);
        
        return {
          serviceName: service.serviceName || service.name || service.title || 'Unknown',
          companyName: company?.companyName || company?.name || 'Unknown Company',
          categoryName: category?.name || service.categoryName || service.category || 'Uncategorized',
          price: service.price || 0,
          duration: service.duration || 'N/A',
          status: service.isActive ? 'Active' : 'Inactive',
          description: service.description || 'N/A',
          createdAt: service.createdAt ? new Date(service.createdAt).toLocaleString() : 'N/A',
          id: service.id
        };
      });
      
      priorityFields = [
        'serviceName', 'companyName', 'categoryName', 'price', 
        'duration', 'status', 'description', 'createdAt'
      ];
      
    } else if (filename === 'service_bookings') {
      // Enrich booking data
      enrichedData = data.map(booking => ({
        bookingId: booking.bookingId || booking.id,
        companyName: booking.companyName || 'Unknown',
        customerName: booking.customerName || 'Unknown',
        customerPhone: booking.customerPhone || 'N/A',
        customerEmail: booking.customerEmail || 'N/A',
        serviceName: booking.serviceName || 'N/A',
        status: booking.status || 'PENDING',
        totalPrice: booking.totalPrice || booking.price || 0,
        bookingDate: booking.displayDateTime || (booking.bookingDate ? new Date(booking.bookingDate).toLocaleString() : 'N/A'),
        createdAt: booking.createdAt ? new Date(booking.createdAt).toLocaleString() : 'N/A',
        isPackage: booking.isPackage ? 'Yes' : 'No',
        id: booking.id
      }));
      
      priorityFields = [
        'bookingId', 'companyName', 'customerName', 'customerPhone', 
        'serviceName', 'status', 'totalPrice', 'bookingDate', 'isPackage'
      ];
      
    } else if (filename === 'service_activity_logs') {
      // Enrich activity logs
      enrichedData = data.map(log => ({
        companyName: log.companyName || 'Unknown',
        action: log.action || 'N/A',
        timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A',
        device: log.device || 'Unknown',
        ipAddress: log.ipAddress || 'N/A',
        success: log.success ? 'Yes' : 'No',
        id: log.id
      }));
      
      priorityFields = [
        'companyName', 'action', 'timestamp', 'device', 'success'
      ];
    }

    // Get only the fields we defined (no extra fields)
    const fields = Object.keys(enrichedData[0]);

    setExportData(enrichedData);
    setExportFilename(filename);
    setAvailableFields(fields);
    // Select priority fields by default
    setSelectedFields(priorityFields.length > 0 ? priorityFields : fields);
    setShowExportModal(true);
  };

  // Export selected fields to CSV
  const exportToCSV = () => {
    if (exportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    const csvContent = [
      selectedFields.join(','),
      ...exportData.map(row =>
        selectedFields.map(field => {
          let value = row[field];
          
          // Handle dates
          if (value instanceof Date) {
            value = value.toISOString();
          }
          
          // Handle objects
          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }
          
          // Handle null/undefined
          if (value === null || value === undefined) {
            value = '';
          }
          
          // Convert to string
          value = String(value);
          
          // Handle values that might contain commas or quotes
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${exportFilename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${exportFilename} exported successfully with ${selectedFields.length} fields`);
    setShowExportModal(false);
  };

  // Toggle field selection
  const toggleFieldSelection = (field) => {
    setSelectedFields(prev => {
      if (prev.includes(field)) {
        return prev.filter(f => f !== field);
      } else {
        return [...prev, field];
      }
    });
  };

  // Select/Deselect all fields
  const toggleAllFields = () => {
    if (selectedFields.length === availableFields.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields([...availableFields]);
    }
  };

  // Get user-friendly field label
  const getFieldLabel = (field) => {
    const labels = {
      // Company fields
      companyName: '🏢 Company Name',
      email: '📧 Email',
      phone: '📱 Phone',
      status: '✅ Status',
      onlineStatus: '🟢 Online Status',
      totalServices: '🛠️ Total Services',
      totalWorkers: '👷 Total Workers',
      ownerName: '👤 Owner Name',
      ownerPhone: '📞 Owner Phone',
      address: '📍 Address',
      city: '🏙️ City',
      state: '🗺️ State',
      pincode: '📮 PIN Code',
      createdAt: '📅 Created Date',
      lastActive: '⏰ Last Active',
      lastLogin: '🔐 Last Login',
      id: '🆔 ID',
      deliveryZoneName: '🚚 Delivery Zone',
      type: '📋 Type',
      
      // Service fields
      serviceName: '🛠️ Service Name',
      categoryName: '📂 Category',
      price: '💰 Price',
      duration: '⏱️ Duration',
      description: '📝 Description',
      
      // Booking fields
      bookingId: '🎫 Booking ID',
      customerName: '👤 Customer Name',
      customerPhone: '📱 Customer Phone',
      customerEmail: '📧 Customer Email',
      totalPrice: '💰 Total Price',
      bookingDate: '📅 Booking Date',
      isPackage: '📦 Is Package',
      
      // Activity fields
      action: '⚡ Action',
      timestamp: '⏰ Timestamp',
      device: '📱 Device',
      ipAddress: '🌐 IP Address',
      success: '✅ Success'
    };
    
    return labels[field] || field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
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

              console.log('🔥 Firebase Realtime Database - Online Status Data:', onlineData);

              // Check multiple possible data structures
              Object.keys(onlineData).forEach(companyId => {
                const companyStatus = onlineData[companyId];
                
                // Log each company's status
                console.log(`Company ${companyId}:`, companyStatus);
                
                // Check different possible structures
                const isOnline = 
                  companyStatus === true || // Simple boolean
                  companyStatus?.isOnline === true || // Object with isOnline
                  companyStatus?.online === true || // Object with online
                  companyStatus?.status === 'online' || // Object with status string
                  companyStatus?.state === 'online'; // Object with state string
                
                if (isOnline) {
                  onlineSet.add(companyId);
                  console.log(`✅ Company ${companyId} is ONLINE`);
                } else {
                  console.log(`❌ Company ${companyId} is OFFLINE`);
                }
              });

              console.log('🟢 Total Online Companies:', onlineSet.size, Array.from(onlineSet));
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
        unsubscribeRefs.current.activity = unsubscribeActivity;
      } catch (error) {
        console.log('Activity logs collection not available:', error);
        setActivityLogs([]); // Set empty array instead of generating demo data
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

  // Setup real-time bookings listener with enhanced data processing
  const setupBookingsListener = useCallback(() => {
    try {
      setBookingsLoading(true);
      
      // Cleanup existing bookings listener
      if (unsubscribeRefs.current.bookings) {
        unsubscribeRefs.current.bookings();
      }

      // Bookings listener with error handling
      const bookingsQuery = query(
        collection(db, 'service_bookings'),
        orderBy('createdAt', 'desc'),
        limit(200) // Increased limit to handle package filtering
      );

      const unsubscribeBookings = onSnapshot(
        bookingsQuery,
        (snapshot) => {
          try {
            // Create a map of companies for quick lookup
            const companiesMap = {};
            companies.forEach(company => {
              companiesMap[company.id] = company;
            });

            // Process all bookings
            const allBookings = snapshot.docs.map(doc => {
              const data = doc.data();
              const company = companiesMap[data.companyId];
              
              // Format dates properly - handle Firestore Timestamp
              let createdAt = null;
              let bookingDate = null;
              
              try {
                if (data.createdAt) {
                  if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
                    createdAt = data.createdAt.toDate();
                  } else if (data.createdAt.seconds) {
                    createdAt = new Date(data.createdAt.seconds * 1000);
                  } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
                    createdAt = new Date(data.createdAt);
                  }
                }
                
                if (data.bookingDate) {
                  if (data.bookingDate.toDate && typeof data.bookingDate.toDate === 'function') {
                    bookingDate = data.bookingDate.toDate();
                  } else if (data.bookingDate.seconds) {
                    bookingDate = new Date(data.bookingDate.seconds * 1000);
                  } else if (typeof data.bookingDate === 'string' || typeof data.bookingDate === 'number') {
                    bookingDate = new Date(data.bookingDate);
                  }
                }
                
                // If bookingDate is invalid, use createdAt
                if (!bookingDate || isNaN(bookingDate.getTime())) {
                  bookingDate = createdAt;
                }
              } catch (e) {
                console.error('Error parsing dates:', e);
              }
              
              // Get company details
              const companyName = company?.companyName || company?.name || company?.businessName || data.companyName || 'Unknown Company';
              const companyOwner = company?.ownerName || company?.owner || company?.contactPerson || company?.ownerDetails?.name || 'Not specified';
              const companyLogo = company?.logoUrl || company?.logo || company?.imageUrl || null;
              const companyPhone = company?.phoneNumber || company?.phone || company?.contactNumber || company?.mobile || 'Not provided';
              
              // Get service/booking type (not category)
              const serviceName = data.bookingType || data.serviceName || data.service?.name || data.serviceTitle || data.type || 'Unknown Service';
              
              // Format date and time for display
              const formatDateTime = (date) => {
                if (!date) return 'Not set';
                try {
                  const d = date instanceof Date ? date : new Date(date);
                  if (isNaN(d.getTime())) return 'Not set';
                  
                  // Format as DD-MM-YYYY HH:MM AM/PM
                  const day = d.getDate().toString().padStart(2, '0');
                  const month = (d.getMonth() + 1).toString().padStart(2, '0');
                  const year = d.getFullYear();
                  
                  let hours = d.getHours();
                  const minutes = d.getMinutes().toString().padStart(2, '0');
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  hours = hours % 12;
                  hours = hours ? hours : 12; // the hour '0' should be '12'
                  
                  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
                } catch (e) {
                  return 'Not set';
                }
              };
              const displayDateTime = formatDateTime(bookingDate || createdAt);
              
              // Get status from Firebase - if null/undefined/empty, set to PENDING
              const rawStatus = data.status;
              let finalStatus = 'PENDING'; // Default to PENDING for new bookings
              
              if (rawStatus && rawStatus.trim() !== '') {
                // If status exists and is not empty, convert to uppercase
                finalStatus = rawStatus.toUpperCase();
              }
              
              // Debug: Log status processing
              console.log('📊 Booking status:', {
                id: doc.id,
                companyName,
                rawStatus: rawStatus,
                finalStatus: finalStatus,
                hasStatus: !!rawStatus
              });
              
              return {
                id: doc.id,
                ...data,
                // Company details
                companyName,
                companyOwner,
                companyLogo,
                companyPhone,
                // Date details
                createdAt,
                bookingDate,
                displayDateTime,
                // Price
                totalPrice: data.totalPrice || data.price || data.amount || 0,
                // Status - PENDING if not set by company
                status: finalStatus,
                // Customer details
                customerName: data.customerName || data.customer?.name || 'Unknown Customer',
                customerPhone: data.customerPhone || data.customer?.phone || 'Not provided',
                customerEmail: data.customerEmail || data.customer?.email || 'Not provided',
                // Service details (actual service/booking type, not category)
                serviceName,
                // Package info
                isPackage: data.isPackage || data.packageBooking || false,
                parentBookingId: data.parentBookingId || null,
                packageId: data.packageId || null
              };
            });

            // Filter out package sub-entries (daily entries)
            // Keep only: 1) Non-package bookings, 2) Main package bookings (isPackage: true), 3) Bookings without parentBookingId
            const filteredBookings = allBookings.filter(booking => {
              // If it's not a package and doesn't have a parent, keep it
              if (!booking.isPackage && !booking.parentBookingId) return true;
              
              // If it's a main package booking, keep it
              if (booking.isPackage && !booking.parentBookingId) return true;
              
              // If it has a parentBookingId (sub-entry), filter it out
              if (booking.parentBookingId) return false;
              
              return true;
            });

            // Sort by date (most recent first)
            const sortedBookings = filteredBookings.sort((a, b) => {
              const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
              const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
              return dateB - dateA;
            });

            // Limit to 100 for performance
            const finalBookings = sortedBookings.slice(0, 100);
            
            setBookings(finalBookings);
            console.log('Loaded real-time bookings:', finalBookings.length, 'filtered from', allBookings.length);
          } catch (error) {
            console.error('Error processing bookings data:', error);
            toast.error('Failed to process bookings data');
            setBookings([]);
          } finally {
            setBookingsLoading(false);
          }
        },
        (error) => {
          console.error('Bookings listener error:', error);
          toast.error('Failed to load bookings data');
          setBookings([]);
          setBookingsLoading(false);
        }
      );
      
      unsubscribeRefs.current.bookings = unsubscribeBookings;
      
    } catch (error) {
      console.error('Error setting up bookings listener:', error);
      toast.error('Failed to setup bookings listener');
      setBookingsLoading(false);
    }
  }, [companies]); // Re-run when companies change to update company details

  // Setup real-time workers count listener
  const setupWorkersListener = useCallback(() => {
    try {
      // Cleanup existing workers listener
      if (unsubscribeRefs.current.workers) {
        unsubscribeRefs.current.workers();
      }

      // Workers listener - fetch all workers and count by companyId
      const workersQuery = query(
        collection(db, 'service_workers'),
        where('isActive', '==', true) // Only count active workers
      );

      const unsubscribeWorkers = onSnapshot(
        workersQuery,
        (snapshot) => {
          try {
            // Create a map of companyId -> worker count
            const countMap = {};
            
            snapshot.docs.forEach(doc => {
              const data = doc.data();
              const companyId = data.companyId;
              
              if (companyId) {
                countMap[companyId] = (countMap[companyId] || 0) + 1;
              }
            });

            setWorkerCountMap(countMap);
            console.log('✅ Worker counts updated:', countMap);
          } catch (error) {
            console.error('Error processing workers data:', error);
            setWorkerCountMap({});
          }
        },
        (error) => {
          console.error('Workers listener error:', error);
          setWorkerCountMap({});
        }
      );
      
      unsubscribeRefs.current.workers = unsubscribeWorkers;
      
    } catch (error) {
      console.error('Error setting up workers listener:', error);
      setWorkerCountMap({});
    }
  }, []);

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

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !bookingSearchTerm ||
      (booking.companyName || '').toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
      (booking.customerName || '').toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
      (booking.serviceName || '').toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
      (booking.bookingId || '').toLowerCase().includes(bookingSearchTerm.toLowerCase());

    const matchesStatus = bookingStatusFilter === 'all' || 
      (booking.status || '').toLowerCase() === bookingStatusFilter.toLowerCase();

    // Date filtering logic
    let matchesDate = bookingDateFilter === 'all';
    if (!matchesDate && bookingDateFilter === 'today' && booking.bookingDate) {
      const today = new Date();
      const bookingDate = new Date(booking.bookingDate);
      matchesDate = bookingDate.toDateString() === today.toDateString();
    }
    if (!matchesDate && bookingDateFilter === 'week' && booking.bookingDate) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const bookingDate = new Date(booking.bookingDate);
      matchesDate = bookingDate >= weekAgo;
    }
    if (!matchesDate && bookingDateFilter === 'month' && booking.bookingDate) {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const bookingDate = new Date(booking.bookingDate);
      matchesDate = bookingDate >= monthAgo;
    }

    return matchesSearch && matchesStatus && matchesDate;
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
    setupWorkersListener(); // NEW: Setup workers listener
    
    // Setup bookings listener after a short delay to ensure companies are loaded
    const timer = setTimeout(() => {
      if (companies.length > 0) {
        setupBookingsListener();
      }
    }, 1000);
    
    // Cleanup on unmount
    return () => {
      cleanupListeners();
      clearTimeout(timer);
    };
  }, [setupRealtimeListeners, setupWorkersListener, cleanupListeners]);

  // Setup bookings listener when companies are loaded or change
  useEffect(() => {
    if (companies.length === 0) return;
    setupBookingsListener();
  }, [companies, setupBookingsListener]);

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
    totalBookings: bookings.length,
    recentBookings: bookings.filter(booking => {
      if (!booking.createdAt) return false;
      const bookingDate = booking.createdAt instanceof Date ? 
        booking.createdAt : new Date(booking.createdAt);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return bookingDate > dayAgo;
    }).length,
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
            { key: 'bookings', label: 'Bookings', icon: '📅' },
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
                title="Total Bookings"
                value={analytics.totalBookings}
                subtitle="All bookings"
                icon="📅"
                darkMode={darkMode}
                trend="Live"
              />
              <StatsCard
                title="Recent Bookings"
                value={analytics.recentBookings}
                subtitle="Last 24 hours"
                icon="🆕"
                darkMode={darkMode}
                trend="Real-time"
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
                    onClick={() => openExportModal(filteredCompanies, 'service_companies')}
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
              onlineCompanies={onlineCompanies}
              workerCountMap={workerCountMap}
              onCompanyClick={(company) => {
                setSelectedCompany(company);
                setShowActivityModal(true);
              }}
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
                    onClick={() => openExportModal(filteredServices, 'service_services')}
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

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
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
                    Search Bookings
                  </label>
                  <input
                    type="text"
                    placeholder="Search by company, customer, service, or booking ID..."
                    value={bookingSearchTerm}
                    onChange={(e) => setBookingSearchTerm(e.target.value)}
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
                    value={bookingStatusFilter}
                    onChange={(e) => setBookingStatusFilter(e.target.value)}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#334155' : '#ffffff',
                      borderColor: darkMode ? '#475569' : '#d1d5db',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    ...styles.label,
                    color: darkMode ? '#e2e8f0' : '#374151'
                  }}>
                    Date Filter
                  </label>
                  <select
                    value={bookingDateFilter}
                    onChange={(e) => setBookingDateFilter(e.target.value)}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#334155' : '#ffffff',
                      borderColor: darkMode ? '#475569' : '#d1d5db',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>
              </div>
              <div style={styles.resultsInfo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: darkMode ? '#94a3b8' : '#64748b' }}>
                    Showing {getPaginatedData(filteredBookings, currentPage).length} of {filteredBookings.length} bookings
                    {bookingsLoading && ' (Loading...)'}
                  </span>
                  <button
                    onClick={() => openExportModal(filteredBookings, 'service_bookings')}
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

            {/* Bookings Table */}
            <BookingsTable 
              bookings={getPaginatedData(filteredBookings, currentPage)}
              darkMode={darkMode}
              loading={bookingsLoading}
              onViewDetails={(booking) => {
                setSelectedBooking(booking);
                setShowBookingModal(true);
              }}
              logActivity={logActivity}
              toast={toast}
            />

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={getTotalPages(filteredBookings.length)}
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
                    onClick={() => openExportModal(filteredLogs, 'service_activity_logs')}
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
      {showActivityModal && selectedCompany && (
        <CompanyActivityDetails
          companyId={selectedCompany.id}
          companyName={selectedCompany.companyName || selectedCompany.name || selectedCompany.businessName || 'Unknown Company'}
          onClose={() => {
            setShowActivityModal(false);
            setSelectedCompany(null);
          }}
          darkMode={darkMode}
        />
      )}

      {/* Booking Details Modal */}
      {showBookingModal && selectedBooking && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: darkMode ? '#1e293b' : 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              paddingBottom: '16px'
            }}>
              <h3 style={{ margin: 0, color: darkMode ? 'white' : '#1e293b' }}>Booking Details</h3>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedBooking(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: darkMode ? '#94a3b8' : '#64748b',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '12px', color: darkMode ? '#e2e8f0' : '#1e293b' }}>Booking Information</h4>
              <div style={{ 
                backgroundColor: darkMode ? '#1e293b' : '#f8fafc', 
                padding: '16px', 
                borderRadius: '8px',
                border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: darkMode ? '#94a3b8' : '#64748b' }}>Booking ID</p>
                    <p style={{ margin: '4px 0', fontWeight: '500', color: darkMode ? 'white' : '#1e293b' }}>
                      {selectedBooking.bookingId || selectedBooking.id}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: darkMode ? '#94a3b8' : '#64748b' }}>Status</p>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: selectedBooking.status === 'confirmed' ? '#dcfce7' : 
                                    selectedBooking.status === 'cancelled' ? '#fee2e2' : 
                                    selectedBooking.status === 'completed' ? '#dbeafe' : '#fef3c7',
                      color: selectedBooking.status === 'confirmed' ? '#166534' : 
                            selectedBooking.status === 'cancelled' ? '#991b1b' : 
                            selectedBooking.status === 'completed' ? '#1e40af' : '#92400e'
                    }}>
                      {selectedBooking.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '12px', color: darkMode ? '#e2e8f0' : '#1e293b' }}>Customer Details</h4>
              <div style={{ 
                backgroundColor: darkMode ? '#1e293b' : '#f8fafc', 
                padding: '16px', 
                borderRadius: '8px',
                border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
              }}>
                <p style={{ margin: '4px 0', color: darkMode ? '#e2e8f0' : '#1e293b' }}>
                  <strong>Name:</strong> {selectedBooking.customerName || 'N/A'}
                </p>
                <p style={{ margin: '4px 0', color: darkMode ? '#cbd5e1' : '#475569' }}>
                  <strong>Phone:</strong> {selectedBooking.customerPhone || 'Not provided'}
                </p>
                <p style={{ margin: '4px 0', color: darkMode ? '#cbd5e1' : '#475569' }}>
                  <strong>Email:</strong> {selectedBooking.customerEmail || 'Not provided'}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '12px', color: darkMode ? '#e2e8f0' : '#1e293b' }}>Service Details</h4>
              <div style={{ 
                backgroundColor: darkMode ? '#1e293b' : '#f8fafc', 
                padding: '16px', 
                borderRadius: '8px',
                border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
              }}>
                <p style={{ margin: '4px 0', color: darkMode ? '#e2e8f0' : '#1e293b' }}>
                  <strong>Service:</strong> {selectedBooking.serviceName || 'N/A'}
                </p>
                <p style={{ margin: '4px 0', color: darkMode ? '#cbd5e1' : '#475569' }}>
                  <strong>Category:</strong> {selectedBooking.serviceCategory || selectedBooking.serviceCategory || 'General'}
                </p>
                <p style={{ margin: '4px 0', color: darkMode ? '#cbd5e1' : '#475569' }}>
                  <strong>Company:</strong> {selectedBooking.companyName || 'N/A'}
                </p>
                <p style={{ margin: '4px 0', color: darkMode ? '#cbd5e1' : '#475569' }}>
                  <strong>Date & Time:</strong> {selectedBooking.bookingDate ? new Date(selectedBooking.bookingDate).toLocaleString() : 'Not specified'}
                </p>
                <p style={{ margin: '4px 0', color: darkMode ? '#cbd5e1' : '#475569' }}>
                  <strong>Time:</strong> {selectedBooking.bookingTime || 'Not specified'}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '12px', color: darkMode ? '#e2e8f0' : '#1e293b' }}>Payment Details</h4>
              <div style={{ 
                backgroundColor: darkMode ? '#1e293b' : '#f8fafc', 
                padding: '16px', 
                borderRadius: '8px',
                border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
              }}>
                <p style={{ margin: '4px 0', color: darkMode ? '#e2e8f0' : '#1e293b' }}>
                  <strong>Total Price:</strong> ₹{selectedBooking.totalPrice || selectedBooking.price || 0}
                </p>
                <p style={{ margin: '4px 0', color: darkMode ? '#cbd5e1' : '#475569' }}>
                  <strong>Payment Status:</strong> {selectedBooking.paymentStatus || 'Pending'}
                </p>
                <p style={{ margin: '4px 0', color: darkMode ? '#cbd5e1' : '#475569' }}>
                  <strong>Payment Method:</strong> {selectedBooking.paymentMethod || 'Not specified'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedBooking(null);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: darkMode ? '#334155' : '#e2e8f0',
                  color: darkMode ? '#e2e8f0' : '#1e293b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Add call to company functionality
                  toast.info(`Calling company about booking: ${selectedBooking.bookingId || selectedBooking.id}`);
                  logActivity('call_company_booking', 'admin', {
                    bookingId: selectedBooking.id,
                    action: 'Called company about booking'
                  });
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                📞 Call Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: darkMode ? '#1e293b' : '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                margin: '0 0 8px 0', 
                color: darkMode ? '#ffffff' : '#1e293b',
                fontSize: '20px',
                fontWeight: '600'
              }}>
                📊 Export to CSV
              </h3>
              <p style={{ 
                margin: 0, 
                color: darkMode ? '#94a3b8' : '#64748b',
                fontSize: '14px'
              }}>
                Select the fields you want to export ({exportData.length} records)
              </p>
            </div>

            {/* Select All Checkbox */}
            <div style={{
              padding: '12px',
              backgroundColor: darkMode ? '#334155' : '#f8fafc',
              borderRadius: '8px',
              marginBottom: '16px',
              border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: darkMode ? '#e2e8f0' : '#1e293b'
              }}>
                <input
                  type="checkbox"
                  checked={selectedFields.length === availableFields.length}
                  onChange={toggleAllFields}
                  style={{
                    marginRight: '8px',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                {selectedFields.length === availableFields.length ? 'Deselect All' : 'Select All'} ({selectedFields.length}/{availableFields.length})
              </label>
            </div>

            {/* Fields List */}
            <div style={{
              maxHeight: '400px',
              overflow: 'auto',
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '8px'
              }}>
                {availableFields.map(field => (
                  <label
                    key={field}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      backgroundColor: darkMode ? '#334155' : '#ffffff',
                      border: `2px solid ${selectedFields.includes(field) 
                        ? '#3b82f6' 
                        : (darkMode ? '#475569' : '#e2e8f0')}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '13px',
                      fontWeight: selectedFields.includes(field) ? '600' : '400',
                      color: darkMode ? '#e2e8f0' : '#374151',
                      boxShadow: selectedFields.includes(field) 
                        ? '0 2px 4px rgba(59, 130, 246, 0.2)' 
                        : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = darkMode ? '#475569' : '#f8fafc';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#ffffff';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field)}
                      onChange={() => toggleFieldSelection(field)}
                      style={{
                        marginRight: '10px',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: '#3b82f6'
                      }}
                    />
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {getFieldLabel(field)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '12px',
              paddingTop: '16px',
              borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
            }}>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setSelectedFields([]);
                  setAvailableFields([]);
                  setExportData([]);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: darkMode ? '#334155' : '#e2e8f0',
                  color: darkMode ? '#e2e8f0' : '#1e293b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = darkMode ? '#475569' : '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#e2e8f0';
                }}
              >
                Cancel
              </button>
              <button
                onClick={exportToCSV}
                disabled={selectedFields.length === 0}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedFields.length === 0 ? '#94a3b8' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedFields.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  opacity: selectedFields.length === 0 ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (selectedFields.length > 0) {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedFields.length > 0) {
                    e.currentTarget.style.backgroundColor = '#10b981';
                  }
                }}
              >
                📥 Export CSV ({selectedFields.length} fields)
              </button>
            </div>
          </div>
        </div>
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
const CompaniesTable = ({ companies, services, darkMode, totalCompanies, onlineCompanies, workerCountMap, onCompanyClick }) => {
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
              }}>Workers</th>
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
                borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              >
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Combined Status Badge - Active = Online, Inactive = Offline */}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '12px',
                      backgroundColor: company.isActive 
                        ? '#d1fae5' 
                        : '#fee2e2',
                      color: company.isActive 
                        ? '#065f46' 
                        : '#991b1b',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: `2px solid ${company.isActive 
                        ? '#6ee7b7' 
                        : '#fca5a5'}`
                    }}>
                      <span style={{ fontSize: '12px' }}>
                        {company.isActive ? '🟢' : '🔴'}
                      </span>
                      {company.isActive ? 'Online' : 'Offline'}
                    </span>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: darkMode ? '#334155' : '#f0f9ff',
                      color: darkMode ? '#60a5fa' : '#0369a1',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      border: `1px solid ${darkMode ? '#475569' : '#bae6fd'}`
                    }}>
                      👷 {workerCountMap[company.id] || 0}
                    </span>
                  </div>
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
                    onClick={() => onCompanyClick && onCompanyClick(company)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                      e.currentTarget.style.transform = 'translateY(0)';
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

// Bookings Table Component - Enhanced Professional Version (v2.0 - 8 Columns)
// Updated: Removed Booking ID column, optimized layout
const BookingsTable = ({ bookings, darkMode, loading, onViewDetails, logActivity, toast }) => {
  // State for date filter
  const [selectedDate, setSelectedDate] = React.useState('all');
  const [availableDates, setAvailableDates] = React.useState([]);

  // Get unique dates from bookings and sort them
  React.useEffect(() => {
    if (bookings.length > 0) {
      const dates = new Set();
      bookings.forEach(booking => {
        if (booking.bookingDate) {
          const date = new Date(booking.bookingDate);
          if (!isNaN(date.getTime())) {
            dates.add(date.toISOString().split('T')[0]); // YYYY-MM-DD format
          }
        }
      });
      const sortedDates = Array.from(dates).sort((a, b) => new Date(b) - new Date(a));
      setAvailableDates(sortedDates);
    }
  }, [bookings]);

  // Filter bookings by selected date
  const dateFilteredBookings = selectedDate === 'all' 
    ? bookings 
    : bookings.filter(booking => {
        if (!booking.bookingDate) return false;
        const bookingDateStr = new Date(booking.bookingDate).toISOString().split('T')[0];
        return bookingDateStr === selectedDate;
      });

  // Get today's date for comparison
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Format date for display
  const formatDateForDisplay = (dateStr) => {
    const date = new Date(dateStr);
    const today = getTodayDate();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === today) return '📅 Today';
    if (dateStr === yesterdayStr) return '📅 Yesterday';
    
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  if (loading) {
    return (
      <div className={`service-admin-table-container ${darkMode ? 'dark-mode' : ''}`}>
        <div className="service-admin-empty-state">
          <div className="service-admin-spinner"></div>
          <h3 className="service-admin-empty-title">
            Loading Bookings...
          </h3>
          <p className="service-admin-empty-text">
            Fetching real-time booking data from Firebase
          </p>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className={`service-admin-table-container ${darkMode ? 'dark-mode' : ''}`}>
        <div className="service-admin-empty-state">
          <div className="service-admin-empty-icon">📅</div>
          <h3 className="service-admin-empty-title">
            No Bookings Found
          </h3>
          <p className="service-admin-empty-text">
            No bookings match your current search criteria. Bookings will appear here in real-time when customers make bookings.
          </p>
        </div>
      </div>
    );
  }

  // Function to get status badge class - matches Firebase service_bookings status field
  const getStatusBadgeClass = (status) => {
    if (!status) return 'pending';
    const statusUpper = status.toUpperCase();
    
    // Match exact Firebase status values
    if (statusUpper === 'CONFIRMED' || statusUpper === 'APPROVED') return 'confirmed';
    if (statusUpper === 'COMPLETED' || statusUpper === 'DELIVERED') return 'completed';
    if (statusUpper === 'CANCELLED' || statusUpper === 'REJECTED' || statusUpper === 'DECLINED') return 'cancelled';
    if (statusUpper === 'ASSIGNED' || statusUpper === 'ACCEPTED') return 'assigned';
    if (statusUpper === 'PENDING' || statusUpper === 'WAITING') return 'pending';
    
    // Fallback for partial matches
    const statusLower = status.toLowerCase();
    if (statusLower.includes('confirm')) return 'confirmed';
    if (statusLower.includes('complet')) return 'completed';
    if (statusLower.includes('cancel') || statusLower.includes('reject')) return 'cancelled';
    if (statusLower.includes('assign') || statusLower.includes('accept')) return 'assigned';
    if (statusLower.includes('pend')) return 'pending';
    
    return 'pending';
  };

  // Function to check if booking is pending (for highlighting)
  const isPendingBooking = (status) => {
    const statusLower = (status || '').toLowerCase();
    return statusLower.includes('pending') || statusLower.includes('waiting');
  };

  // Function to check if booking is completed (for highlighting)
  const isCompletedBooking = (status) => {
    const statusLower = (status || '').toLowerCase();
    return statusLower.includes('completed') || statusLower.includes('delivered');
  };

  return (
    <div className="bookings-monitor-container">
      <div className="bookings-monitor-header">
        <h3 className="monitor-title">
          Live Bookings Monitor ({dateFilteredBookings.length})
        </h3>
        <div className="monitor-controls">
          <select 
            className="date-filter-dropdown"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option value="all">📅 All Dates ({bookings.length})</option>
            {availableDates.map(date => (
              <option key={date} value={date}>
                {formatDateForDisplay(date)} ({bookings.filter(b => {
                  if (!b.bookingDate) return false;
                  return new Date(b.bookingDate).toISOString().split('T')[0] === date;
                }).length})
              </option>
            ))}
          </select>
          <div className="monitor-live-badge">
            <div className="live-pulse-dot"></div>
            <span>Real-time Updates</span>
          </div>
        </div>
      </div>
      
      <div className="bookings-table-wrapper">
        <table className="bookings-table">
          <thead className="table-header-dark">
            <tr>
              <th className="col-company">COMPANY</th>
              <th className="col-customer">CUSTOMER</th>
              <th className="col-service">SERVICE</th>
              <th className="col-datetime">DATE & TIME</th>
              <th className="col-price">PRICE</th>
              <th className="col-status">STATUS</th>
              <th className="col-actions">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {dateFilteredBookings.map((booking, index) => {
              const statusClass = getStatusBadgeClass(booking.status);
              const isPending = isPendingBooking(booking.status);
              const isCompleted = isCompletedBooking(booking.status);
              const isEvenRow = index % 2 === 0;
              
              let rowClass = 'table-row';
              if (isEvenRow) rowClass += ' row-even';
              else rowClass += ' row-odd';
              
              const bookingDate = booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : 
                                 booking.date ? new Date(booking.date + 'T00:00:00').toLocaleDateString() : 'Not set';
              const bookingTime = booking.bookingTime || booking.time || 'Not specified';
              
              return (
                <tr 
                  key={booking.id} 
                  className={rowClass}
                  onClick={() => onViewDetails && onViewDetails(booking)}
                >
                  <td className="col-company">
                    <div className="cell-content">
                      <div className="cell-primary">{booking.companyName || 'Unknown Company'}</div>
                      <div className="cell-secondary">ID: {(booking.companyId || booking.id).substring(0, 8)}...</div>
                    </div>
                  </td>
                  <td className="col-customer">
                    <div className="cell-content">
                      <div className="cell-primary">{booking.customerName || 'Unknown'}</div>
                      <div className="cell-secondary">{booking.customerPhone || booking.phone || 'No phone'}</div>
                    </div>
                  </td>
                  <td className="col-service">
                    <div className="cell-content">
                      <div className="cell-primary">{booking.serviceName || booking.workName || 'Unknown Service'}</div>
                      <div className="cell-secondary">{booking.serviceCategory || booking.category || ''}</div>
                    </div>
                  </td>
                  <td className="col-datetime">
                    <div className="cell-content">
                      <div className="cell-primary">{bookingDate}</div>
                      <div className="cell-secondary">{bookingTime}</div>
                    </div>
                  </td>
                  <td className="col-price">
                    <div className="price-value">₹{(booking.totalPrice || booking.price || 0).toLocaleString()}</div>
                  </td>
                  <td className="col-status">
                    <span className={`status-badge status-${statusClass}`}>
                      {(booking.status || 'PENDING').toUpperCase()}
                    </span>
                  </td>
                  <td className="col-actions">
                    <div className="action-buttons">
                      <button
                        className="btn-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails && onViewDetails(booking);
                        }}
                      >
                        👁️ View
                      </button>
                      {(booking.customerPhone || booking.phone) && (
                        <a 
                          className="btn-call"
                          href={`tel:${booking.customerPhone || booking.phone}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toast && toast.info(`Calling ${booking.customerName}...`);
                            logActivity && logActivity('call_customer', 'admin', {
                              bookingId: booking.id,
                              customerName: booking.customerName,
                              customerPhone: booking.customerPhone || booking.phone
                            });
                          }}
                        >
                          📞 Call
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="bookings-table-footer">
        <div className="footer-info">
          Showing {dateFilteredBookings.length} bookings {selectedDate !== 'all' ? `for ${formatDateForDisplay(selectedDate)}` : 'from all dates'} • Updated just now
        </div>
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
    width: '100%',
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
    width: '100%',
    maxWidth: '100%',
    margin: '0',
    padding: '24px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    width: '100%',
    maxWidth: '100%',
    margin: '0',
    padding: '24px 16px',
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
