import { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import AssignWorkerModal from "./AssignWorkerModal";
import "../../style/ServiceDashboard.css";

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAssign, setOpenAssign] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(""); // New date filter state
  const [showAllBookings, setShowAllBookings] = useState(false); // Toggle for showing all bookings vs today only

  const statusConfig = {
    pending: {
      label: "Pending",
      icon: (
        <svg className="bookings-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      ),
      className: "bookings-status-pending",
    },
    assigned: {
      label: "Assigned",
      icon: (
        <svg className="bookings-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="10" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      className: "bookings-status-assigned",
    },
    started: {
      label: "Started",
      icon: (
        <svg className="bookings-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
        </svg>
      ),
      className: "bookings-status-started",
    },
    completed: {
      label: "Completed",
      icon: (
        <svg className="bookings-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22,4 12,14.01 9,11.01"/>
        </svg>
      ),
      className: "bookings-status-completed",
    },
    expired: {
      label: "Expired",
      icon: (
        <svg className="bookings-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
      className: "bookings-status-expired",
    },
    rejected: {
      label: "Rejected",
      icon: (
        <svg className="bookings-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      ),
      className: "bookings-status-rejected",
    },
    cancelled: {
      label: "Cancelled",
      icon: (
        <svg className="bookings-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      ),
      className: "bookings-status-cancelled",
    },
  };
  //fetch booking with real-time listener
  const setupBookingsListener = () => {
    const user = auth.currentUser;
    if (!user) {
      console.log("❌ No user for listener setup");
      return null;
    }

    console.log("Setting up real-time bookings listener for company:", user.uid);

    const q = query(
      collection(db, "service_bookings"),
      where("companyId", "==", user.uid)
    );

    // Set up real-time listener with better error handling
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        try {
          console.log("📡 Real-time update received - bookings changed");
          console.log("📊 Snapshot metadata:", {
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
            fromCache: snapshot.metadata.fromCache,
            size: snapshot.size
          });
          
          // Process both cached and server data, but log the source
          const now = new Date();
          const today = now.toISOString().split("T")[0];
          const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

          const list = [];
          const expiredUpdates = [];

          snapshot.docs.forEach((docSnap) => {
            try {
              const data = docSnap.data();

              // Auto-expire logic - check if booking should be expired
              let shouldExpire = false;
              
              // 1. Past date bookings that are not completed/rejected/expired
              if (
                data.date < today &&
                !["completed", "rejected", "expired"].includes(data.status)
              ) {
                shouldExpire = true;
              }
              
              // 2. Same day bookings that are 1 hour past their time and still pending
              if (
                data.date === today &&
                data.time &&
                data.status === "pending"
              ) {
                const [hours, minutes] = data.time.split(':').map(Number);
                const bookingTime = hours * 60 + minutes; // Booking time in minutes
                const timeDiff = currentTime - bookingTime; // Difference in minutes
                
                // If more than 60 minutes past the booking time, expire it
                if (timeDiff > 60) {
                  shouldExpire = true;
                }
              }

              if (shouldExpire) {
                // Add to expired updates batch
                expiredUpdates.push({
                  id: docSnap.id,
                  ref: doc(db, "service_bookings", docSnap.id)
                });

                list.push({
                  id: docSnap.id,
                  ...data,
                  status: "expired",
                });
              } else {
                list.push({
                  id: docSnap.id,
                  ...data,
                });
              }
            } catch (docError) {
              console.error("Error processing document:", docSnap.id, docError);
            }
          });

          // Update expired bookings in database (only if not from cache)
          if (expiredUpdates.length > 0 && !snapshot.metadata.fromCache) {
            console.log(`Auto-expiring ${expiredUpdates.length} bookings`);
            expiredUpdates.forEach(async (update) => {
              try {
                await updateDoc(update.ref, {
                  status: "expired",
                  expiredAt: new Date(),
                });
              } catch (error) {
                console.error(`Failed to expire booking ${update.id}:`, error);
              }
            });
          }

          const source = snapshot.metadata.fromCache ? "cache" : "server";
          console.log(`📊 Real-time update from ${source}: ${list.length} bookings loaded`);
          setBookings(list);
          setLoading(false);
        } catch (snapshotError) {
          console.error("❌ Error processing snapshot:", snapshotError);
          // Fallback to manual fetch on snapshot processing error
          fetchBookings().finally(() => setLoading(false));
        }
      }, 
      (error) => {
        console.error("❌ Real-time bookings listener error:", error);
        console.log("🔄 Falling back to manual fetch due to listener error");
        // Fallback to manual fetch on error
        fetchBookings().finally(() => setLoading(false));
      }
    );

    return unsubscribe;
  };

  // Legacy fetch function for fallback (not used in real-time mode)
  const fetchBookings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_bookings"),
        where("companyId", "==", user.uid)
      );

      const snap = await getDocs(q);
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

      const list = [];
      const expiredUpdates = [];

      for (const docSnap of snap.docs) {
        const data = docSnap.data();

        // Auto-expire logic - check if booking should be expired
        let shouldExpire = false;
        
        // 1. Past date bookings that are not completed/rejected/expired
        if (
          data.date < today &&
          !["completed", "rejected", "expired"].includes(data.status)
        ) {
          shouldExpire = true;
        }
        
        // 2. Same day bookings that are 1 hour past their time and still pending
        if (
          data.date === today &&
          data.time &&
          data.status === "pending"
        ) {
          const [hours, minutes] = data.time.split(':').map(Number);
          const bookingTime = hours * 60 + minutes; // Booking time in minutes
          const timeDiff = currentTime - bookingTime; // Difference in minutes
          
          // If more than 60 minutes past the booking time, expire it
          if (timeDiff > 60) {
            shouldExpire = true;
          }
        }

        if (shouldExpire) {
          // Add to expired updates batch
          expiredUpdates.push({
            id: docSnap.id,
            ref: doc(db, "service_bookings", docSnap.id)
          });

          list.push({
            id: docSnap.id,
            ...data,
            status: "expired",
          });
        } else {
          list.push({
            id: docSnap.id,
            ...data,
          });
        }
      }

      // Update expired bookings in database
      if (expiredUpdates.length > 0) {
        console.log(`Auto-expiring ${expiredUpdates.length} bookings`);
        for (const update of expiredUpdates) {
          try {
            await updateDoc(update.ref, {
              status: "expired",
              expiredAt: new Date(),
            });
          } catch (error) {
            console.error(`Failed to expire booking ${update.id}:`, error);
          }
        }
      }

      setBookings(list);
    } catch (err) {
      console.error("Fetch bookings error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_categories"),
        where("companyId", "==", user.uid)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));

      setCategories(list);
    } catch (err) {
      console.error("Fetch categories error:", err);
    }
  };

  useEffect(() => {
    let bookingsUnsubscribe = null;
    let authUnsubscribe = null;
    let isComponentMounted = true;

    const initializeData = async () => {
      try {
        const user = auth.currentUser;
        if (user && isComponentMounted) {
          console.log("🔐 User authenticated for bookings:", user.uid);
          
          // Clean up any existing listener before setting up new one
          if (bookingsUnsubscribe) {
            bookingsUnsubscribe();
            bookingsUnsubscribe = null;
          }
          
          // First, fetch existing data immediately
          console.log("📥 Fetching existing bookings data...");
          await fetchBookings();
          
          // Add a small delay before setting up listener to prevent race conditions
          if (isComponentMounted) {
            setTimeout(() => {
              if (isComponentMounted) {
                // Then set up real-time listener for future updates
                console.log("📡 Setting up real-time listener...");
                bookingsUnsubscribe = setupBookingsListener();
              }
            }, 100);
          }
          
          // Fetch categories
          if (isComponentMounted) {
            await fetchCategories();
          }
        } else if (isComponentMounted) {
          console.log("❌ No user authenticated for bookings");
          setLoading(false);
          setBookings([]);
        }
      } catch (error) {
        console.error("❌ Error initializing bookings data:", error);
        if (isComponentMounted) {
          // Ensure we at least try to fetch data
          try {
            await fetchBookings();
            await fetchCategories();
          } catch (fallbackError) {
            console.error("❌ Fallback fetch also failed:", fallbackError);
          }
          setLoading(false);
        }
      }
    };

    // Listen for auth state changes
    authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (user && isComponentMounted) {
        console.log("🔐 Auth state changed - user logged in:", user.uid);
        initializeData();
      } else if (isComponentMounted) {
        console.log("🔐 Auth state changed - user logged out");
        // Clean up listener when user logs out
        if (bookingsUnsubscribe) {
          bookingsUnsubscribe();
          bookingsUnsubscribe = null;
        }
        setLoading(false);
        setBookings([]);
      }
    });

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up Bookings component listeners");
      isComponentMounted = false;
      if (authUnsubscribe) {
        authUnsubscribe();
      }
      if (bookingsUnsubscribe) {
        console.log("🔌 Cleaning up real-time bookings listener");
        bookingsUnsubscribe();
      }
    };
  }, []);

  const handleRejectBooking = async (booking) => {
    if (!window.confirm("Are you sure you want to reject this booking?")) return;

    try {
      const user = auth.currentUser;
      
      // Update booking status
      await updateDoc(
        doc(db, "service_bookings", booking.id),
        {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy: user?.uid,
        }
      );

      // Create a rejection record for admin tracking
      const rejectionData = {
        bookingId: booking.id,
        companyId: booking.companyId,
        companyName: booking.companyName || "Unknown Company",
        serviceName: booking.serviceName,
        workName: booking.workName,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        bookingDate: booking.date,
        bookingTime: booking.time,
        amount: booking.totalPrice || booking.price || booking.amount || 0,
        rejectedAt: new Date(),
        rejectedBy: user?.uid,
        status: "pending_review", // Admin can review this
      };

      // Add to rejected_bookings collection for admin review
      await setDoc(
        doc(db, "rejected_bookings", booking.id),
        rejectionData
      );

      // No need to call fetchBookings() - real-time listener will update automatically
      alert("Booking rejected successfully");
    } catch (err) {
      console.error("Reject booking failed:", err);
      alert("Failed to reject booking. Please try again.");
    }
  };

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Function to handle when additional services are added to an existing booking
  // This function should be called when the mobile app adds services to an existing booking
  // Example usage: handleServiceAddition(bookingId, { workName: "AC Cleaning", price: 200, notes: "Additional service" })
  const handleServiceAddition = async (bookingId, newService) => {
    try {
      const bookingRef = doc(db, "service_bookings", bookingId);
      const bookingSnap = await getDocs(query(collection(db, "service_bookings"), where("__name__", "==", bookingId)));
      
      if (!bookingSnap.empty) {
        const currentBooking = bookingSnap.docs[0].data();
        
        // Create services array if it doesn't exist
        const existingServices = currentBooking.services || [
          {
            workName: currentBooking.workName,
            serviceName: currentBooking.serviceName,
            price: currentBooking.totalPrice || currentBooking.price || currentBooking.amount || 0,
            notes: currentBooking.notes
          }
        ];
        
        // Add the new service
        const updatedServices = [...existingServices, newService];
        
        // Calculate total price
        const totalPrice = updatedServices.reduce((total, service) => 
          total + (service.price || service.totalPrice || service.amount || 0), 0
        );
        
        // Update the booking
        await updateDoc(bookingRef, {
          services: updatedServices,
          totalPrice: totalPrice,
          status: "started", // Reset to started since new work is added
          updatedAt: new Date(),
          serviceAddedAt: new Date()
        });
        
        console.log("Service added successfully to booking:", bookingId);
        // No need to call fetchBookings() - real-time listener will update automatically
      }
    } catch (error) {
      console.error("Error adding service to booking:", error);
    }
  };

  const handleStartWork = async (booking) => {
    try {
      const otp = generateOtp();

      await updateDoc(
        doc(db, "service_bookings", booking.id),
        {
          status: "started",
          startOtp: otp,
          otpVerified: false,
          startedAt: new Date(),
        }
      );

      console.log("START WORK OTP:", otp);
      // No need to call fetchBookings() - real-time listener will update automatically
    } catch (err) {
      console.error("Start work failed:", err);
    }
  };

  const handleCompleteWork = async (booking) => {
    try {
      if (!otpInput) {
        alert("Enter OTP");
        return;
      }

      if (otpInput !== booking.startOtp) {
        alert("Invalid OTP");
        return;
      }

      await updateDoc(
        doc(db, "service_bookings", booking.id),
        {
          status: "completed",
          otpVerified: true,
          completedAt: new Date(),
        }
      );

      setShowOtpModal(false);
      setOtpInput("");
      // No need to call fetchBookings() - real-time listener will update automatically
    } catch (err) {
      console.error("Complete work failed:", err);
    }
  };

  // Filter and sort bookings based on status filter and search
  const filteredBookings = bookings.filter((booking) => {
    // Search filter - include more fields for better search, including addOns array
    const matchesSearch = !searchQuery || 
      booking.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.workName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      // Search within addOns array
      (booking.addOns && booking.addOns.some(addon => 
        addon.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        addon.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      ));

    if (!matchesSearch) return false;

    // Date filter
    if (dateFilter && booking.date !== dateFilter) return false;

    // Today-only filter (when showAllBookings is false, only show today's bookings)
    if (!showAllBookings) {
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      if (booking.date !== today) return false;
    }

    // Status filters
    if (statusFilter === "all") {
      // Exclude completed, rejected, cancelled, and expired bookings from "Active" tab
      return booking.status !== "completed" && 
             booking.status !== "rejected" && 
             booking.status !== "cancelled" && 
             booking.status !== "expired";
    }
    if (statusFilter === "cancelled") {
      // Show cancelled bookings (customer cancellations from app with status: "cancelled")
      return booking.status === "cancelled";
    }
    if (statusFilter === "rejected") {
      // Show rejected bookings (company rejections with status: "rejected")
      return booking.status === "rejected";
    }
    if (statusFilter === "expired") return booking.status === "expired";
    return booking.status === statusFilter;
  }).sort((a, b) => {
    // Sort by date first (oldest first), then by time
    if (a.date !== b.date) {
      return new Date(a.date) - new Date(b.date);
    }
    // If same date, sort by time
    return (a.time || '').localeCompare(b.time || '');
  });

  // Group bookings by date for better organization
  const groupedBookings = filteredBookings.reduce((groups, booking) => {
    const date = booking.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(booking);
    return groups;
  }, {});

  // Helper function to format date with day name
  const formatDateWithDay = (dateString) => {
    if (!dateString) return 'Unknown Date';
    
    try {
      const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      // Format date string for comparison (YYYY-MM-DD)
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (dateString === todayStr) {
        return `Today, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else if (dateString === tomorrowStr) {
        return `Tomorrow, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else if (dateString === yesterdayStr) {
        return `Yesterday, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  // Helper function to format time in 12-hour format
  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  // Get status counts
  const getStatusCount = (status) => {
    if (status === "all") {
      // Exclude completed, rejected, cancelled, and expired bookings from "Active" count
      return bookings.filter(b => 
        b.status !== "completed" && 
        b.status !== "rejected" && 
        b.status !== "cancelled" && 
        b.status !== "expired"
      ).length;
    }
    return bookings.filter(b => b.status === status).length;
  };

  if (loading) {
    return (
      <div className="sd-main">
        <div className="bookings-loading">
          <div className="bookings-loading-spinner"></div>
          <p>Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-main">
      {/* Page Header */}
      <div className="sd-header">
        <div>
          <h1>Bookings</h1>
          <p>Bookings are created from the app only. Manage and track all customer bookings.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={async () => {
              setLoading(true);
              try {
                await fetchBookings();
              } catch (error) {
                console.error("Manual refresh failed:", error);
              } finally {
                setLoading(false);
              }
            }}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bookings-stats-grid">
        <div className="bookings-stat-card">
          <div className="bookings-stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
              <path d="M8 14h.01"/>
              <path d="M12 14h.01"/>
              <path d="M16 14h.01"/>
            </svg>
          </div>
          <div className="bookings-stat-content">
            <p className="bookings-stat-label">Total</p>
            <p className="bookings-stat-value">{bookings.length}</p>
          </div>
        </div>

        <div className="bookings-stat-card">
          <div className="bookings-stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
            </svg>
          </div>
          <div className="bookings-stat-content">
            <p className="bookings-stat-label">Active</p>
            <p className="bookings-stat-value">{bookings.filter(b => 
              b.status !== "completed" && 
              b.status !== "rejected" && 
              b.status !== "cancelled" && 
              b.status !== "expired"
            ).length}</p>
          </div>
        </div>

        <div className="bookings-stat-card">
          <div className="bookings-stat-icon pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div className="bookings-stat-content">
            <p className="bookings-stat-label">Pending</p>
            <p className="bookings-stat-value">{getStatusCount("pending")}</p>
          </div>
        </div>

        <div className="bookings-stat-card">
          <div className="bookings-stat-icon assigned">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="10" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="bookings-stat-content">
            <p className="bookings-stat-label">Assigned</p>
            <p className="bookings-stat-value">{getStatusCount("assigned")}</p>
          </div>
        </div>

        <div className="bookings-stat-card">
          <div className="bookings-stat-icon started">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
            </svg>
          </div>
          <div className="bookings-stat-content">
            <p className="bookings-stat-label">In Progress</p>
            <p className="bookings-stat-value">{getStatusCount("started")}</p>
          </div>
        </div>

        <div className="bookings-stat-card">
          <div className="bookings-stat-icon completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="bookings-stat-content">
            <p className="bookings-stat-label">Completed</p>
            <p className="bookings-stat-value">{getStatusCount("completed")}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bookings-filters">
        <div className="bookings-search">
          <svg className="bookings-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bookings-search-input"
          />
        </div>
        
        {/* Date Filter */}
        <div className="bookings-date-filter">
          <svg className="bookings-date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bookings-date-input"
            placeholder="Filter by date"
          />
          {dateFilter && (
            <button
              className="bookings-clear-date"
              onClick={() => setDateFilter("")}
              title="Clear date filter"
            >
              ✕
            </button>
          )}
        </div>

        {/* Today Only Toggle */}
        <div className="bookings-toggle-filter">
          <button
            className={`bookings-toggle-btn ${showAllBookings ? 'all-bookings' : 'today-only'}`}
            onClick={() => setShowAllBookings(!showAllBookings)}
            title={showAllBookings ? "Click to show today's bookings only" : "Click to show all bookings"}
          >
            <svg className="bookings-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {showAllBookings ? (
                // Calendar icon for "All Bookings"
                <>
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                  <path d="M8 14h.01"/>
                  <path d="M12 14h.01"/>
                  <path d="M16 14h.01"/>
                  <path d="M8 18h.01"/>
                  <path d="M12 18h.01"/>
                </>
              ) : (
                // Today icon for "Today Only"
                <>
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                  <circle cx="12" cy="16" r="2"/>
                </>
              )}
            </svg>
            <span className="bookings-toggle-text">
              {showAllBookings ? 'All Bookings' : 'Today Only'}
            </span>
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bookings-tabs">
        <button 
          className={`bookings-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          Active ({getStatusCount("all")})
        </button>
        <button 
          className={`bookings-tab ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          <svg className="bookings-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          Pending ({getStatusCount("pending")})
        </button>
        <button 
          className={`bookings-tab ${statusFilter === 'assigned' ? 'active' : ''}`}
          onClick={() => setStatusFilter('assigned')}
        >
          <svg className="bookings-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="10" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Assigned ({getStatusCount("assigned")})
        </button>
        <button 
          className={`bookings-tab ${statusFilter === 'started' ? 'active' : ''}`}
          onClick={() => setStatusFilter('started')}
        >
          <svg className="bookings-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
          </svg>
          Started ({getStatusCount("started")})
        </button>
        <button 
          className={`bookings-tab ${statusFilter === 'completed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('completed')}
        >
          <svg className="bookings-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
          Completed ({getStatusCount("completed")})
        </button>
        <button 
          className={`bookings-tab ${statusFilter === 'rejected' ? 'active' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          <svg className="bookings-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          Rejected ({getStatusCount("rejected")})
        </button>
        <button 
          className={`bookings-tab ${statusFilter === 'cancelled' ? 'active' : ''}`}
          onClick={() => setStatusFilter('cancelled')}
        >
          <svg className="bookings-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          Cancelled ({getStatusCount("cancelled")})
        </button>
        <button 
          className={`bookings-tab ${statusFilter === 'expired' ? 'active' : ''}`}
          onClick={() => setStatusFilter('expired')}
        >
          <svg className="bookings-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Expired ({getStatusCount("expired")})
        </button>
      </div>

      {/* Bookings List - Grouped by Date */}
      <div className="bookings-list">
        {Object.keys(groupedBookings).length === 0 ? (
          /* Empty State */
          <div className="bookings-empty-state">
            <div className="bookings-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
            </div>
            <h3>No bookings found</h3>
            <p>
              {searchQuery || statusFilter !== "all" || dateFilter
                ? "Try adjusting your filters"
                : !showAllBookings 
                  ? "No bookings for today. Toggle to 'All Bookings' to see future bookings."
                  : "Bookings will appear here when customers make them through the app"}
            </p>
          </div>
        ) : (
          /* Grouped Bookings */
          Object.entries(groupedBookings)
            .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB)) // Sort dates oldest first
            .map(([date, dateBookings]) => (
              <div key={date} className="bookings-date-group">
                {/* Date Header */}
                <div className="bookings-date-header">
                  <div className="bookings-date-info">
                    <h3 className="bookings-date-title">{formatDateWithDay(date)}</h3>
                    <span className="bookings-date-count">
                      {dateBookings.length} booking{dateBookings.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="bookings-date-line"></div>
                </div>

                {/* Bookings for this date */}
                <div className="bookings-date-items">
                  {dateBookings.map((booking) => {
                    const status = statusConfig[booking.status] || statusConfig.pending;
                    
                    return (
                      <div key={booking.id} className="bookings-card">
                        <div className="bookings-card-content">
                          <div className="bookings-main-section">
                            <div className="bookings-info">
                              <div className="bookings-header">
                                <div className="bookings-badges">
                                  <span className="bookings-time-badge">
                                    🕐 {formatTime(booking.time)}
                                  </span>
                                  <span className="bookings-id-badge">
                                    #{booking.id.slice(-8)}
                                  </span>
                                  {/* Package Type Badge */}
                                  {booking.packageType && (
                                    <span className="bookings-package-badge" style={{
                                      background: '#dbeafe',
                                      color: '#1e40af',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      textTransform: 'capitalize'
                                    }}>
                                      📦 {booking.packageType}
                                      {booking.packageDuration && ` (${booking.packageDuration})`}
                                    </span>
                                  )}
                                  <span className={`bookings-status-badge ${status.className}`}>
                                    {status.icon}
                                    <span>{status.label}</span>
                                  </span>
                                </div>
                                <h3 className="bookings-service-name">
                                  {/* Handle multiple services with addOns - show main service only */}
                                  {booking.workName || booking.serviceName || "Service Request"}
                                  {/* Show addon indicator */}
                                  {booking.addOns && booking.addOns.length > 0 && (
                                    <span className="addon-indicator">
                                      + {booking.addOns.map(addon => addon.name).join(', ')}
                                    </span>
                                  )}
                                </h3>
                                {booking.serviceName && booking.workName && booking.serviceName !== booking.workName && !booking.services && (
                                  <p className="bookings-main-service">Category: {booking.serviceName}</p>
                                )}
                              </div>

                              <div className="bookings-details">
                                <div className="bookings-detail-item">
                                  <svg className="bookings-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                  </svg>
                                  <span>{booking.customerName}</span>
                                </div>
                                {booking.customerPhone && (
                                  <div className="bookings-detail-item">
                                    <svg className="bookings-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                    </svg>
                                    <span>{booking.customerPhone}</span>
                                  </div>
                                )}
                                {(booking.customerAddress || booking.address || booking.location) && (
                                  <div className="bookings-detail-item">
                                    <svg className="bookings-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                      <circle cx="12" cy="10" r="3"/>
                                    </svg>
                                    <span>{booking.customerAddress || booking.address || booking.location}</span>
                                  </div>
                                )}
                              </div>

                              {booking.technicianName && (
                                <div className="bookings-technician-badge">
                                  <svg className="bookings-technician-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                    <circle cx="10" cy="7" r="4"/>
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                  </svg>
                                  Assigned to: {booking.technicianName}
                                </div>
                              )}

                              {/* Show indicator for add-on services - REMOVED LARGE ICON */}
                              {booking.addOns && booking.addOns.length > 0 && (
                                <div className="bookings-merged-indicator">
                                  Add-on services added
                                  {booking.serviceAddedAt && (
                                    <span className="merge-time">
                                      • Added {new Date(booking.serviceAddedAt.seconds * 1000).toLocaleTimeString()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bookings-actions-section">
                            <div className="bookings-amount">
                              <div className="bookings-price">
                                <span className="price-display">
                                  <span className="rupee-symbol">₹</span>
                                  <span className="price-amount">
                                    {/* Use totalPrice directly if it already includes addOns, otherwise calculate */}
                                    {(() => {
                                      // If totalPrice exists and addOns exist, assume totalPrice already includes addOns
                                      if (booking.totalPrice && booking.addOns && booking.addOns.length > 0) {
                                        console.log('Using existing totalPrice (includes addOns):', {
                                          bookingId: booking.id,
                                          totalPrice: booking.totalPrice,
                                          addOns: booking.addOns
                                        });
                                        return booking.totalPrice.toLocaleString();
                                      }
                                      
                                      // Otherwise calculate manually
                                      const basePrice = booking.totalPrice || booking.price || booking.amount || 0;
                                      const addOnsPrice = booking.addOns ? booking.addOns.reduce((total, addon) => total + (addon.price || 0), 0) : 0;
                                      const totalPrice = basePrice + addOnsPrice;
                                      
                                      console.log('Calculating price manually:', {
                                        bookingId: booking.id,
                                        basePrice,
                                        addOnsPrice,
                                        totalPrice
                                      });
                                      
                                      return totalPrice.toLocaleString();
                                    })()}
                                  </span>
                                </span>
                              </div>
                              <p className="bookings-category">
                                {booking.addOns && booking.addOns.length > 0 
                                  ? `${booking.addOns.length + 1} Services` 
                                  : (booking.categoryName || "Service")
                                }
                              </p>
                            </div>

                            <div className="bookings-actions">
                              <button
                                className="bookings-view-btn"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowDetailsModal(true);
                                }}
                              >
                                <svg className="bookings-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                  <circle cx="12" cy="12" r="3"/>
                                </svg>
                                View
                              </button>

                              {/* Action buttons based on status */}
                              {booking.status === "pending" && (
                                <>
                                  <button
                                    className="bookings-action-btn assign"
                                    onClick={() => {
                                      setSelectedBooking(booking);
                                      setOpenAssign(true);
                                    }}
                                  >
                                    <svg className="bookings-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                      <circle cx="10" cy="7" r="4"/>
                                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    Assign
                                  </button>
                                  <button
                                    className="bookings-action-btn reject"
                                    onClick={() => handleRejectBooking(booking)}
                                  >
                                    <svg className="bookings-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <circle cx="12" cy="12" r="10"/>
                                      <line x1="15" y1="9" x2="9" y2="15"/>
                                      <line x1="9" y1="9" x2="15" y2="15"/>
                                    </svg>
                                    Reject
                                  </button>
                                </>
                              )}

                              {booking.status === "assigned" && (
                                <>
                                  <button
                                    className="bookings-action-btn start"
                                    onClick={() => handleStartWork(booking)}
                                  >
                                    <svg className="bookings-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                                    </svg>
                                    Start Work
                                  </button>
                                  <button
                                    className="bookings-action-btn reject"
                                    onClick={() => handleRejectBooking(booking)}
                                  >
                                    <svg className="bookings-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <circle cx="12" cy="12" r="10"/>
                                      <line x1="15" y1="9" x2="9" y2="15"/>
                                      <line x1="9" y1="9" x2="15" y2="15"/>
                                    </svg>
                                    Reject
                                  </button>
                                </>
                              )}

                              {booking.status === "started" && (
                                <button
                                  className="bookings-action-btn complete"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowOtpModal(true);
                                  }}
                                >
                                  <svg className="bookings-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                    <polyline points="22,4 12,14.01 9,11.01"/>
                                  </svg>
                                  Complete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Assign Worker Modal */}
      {openAssign && (
        <AssignWorkerModal
          booking={selectedBooking}
          categories={categories}
          onClose={() => setOpenAssign(false)}
          onAssigned={() => {
            // No need to call fetchBookings() - real-time listener will update automatically
            setOpenAssign(false);
          }}
        />
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="modal-backdrop" onClick={() => setShowOtpModal(false)}>
          <div className="modal-content otp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Verify OTP</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpInput("");
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="otp-section">
                <label className="otp-label">Enter OTP to complete work:</label>
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="otp-input"
                  maxLength="6"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="modal-btn cancel-btn"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpInput("");
                }}
              >
                Cancel
              </button>
              <button
                className="modal-btn verify-btn"
                onClick={() => handleCompleteWork(selectedBooking)}
              >
                Verify & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="bookings-modal-backdrop" onClick={() => setShowDetailsModal(false)}>
          <div className="bookings-modal-content" onClick={(e) => e.stopPropagation()}>
            <style jsx>{`
              .multiple-services {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 4px;
              }
              .service-item {
                font-weight: 500;
              }
              .service-count-badge {
                background: #e0f2fe;
                color: #0277bd;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
                margin-left: 8px;
              }
              .multiple-services-details {
                space-y: 12px;
              }
              .service-detail-item {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 8px;
              }
              .service-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .service-info .service-name {
                margin: 0;
                font-weight: 500;
              }
              .service-info .service-price {
                margin: 0;
                font-weight: 600;
                color: #059669;
              }
              .service-notes {
                margin: 8px 0 0 0;
                font-size: 14px;
                color: #6b7280;
              }
              .total-services-summary {
                border-top: 2px solid #e5e7eb;
                padding-top: 12px;
                margin-top: 12px;
                text-align: right;
                color: #059669;
              }
              .bookings-merged-indicator {
                display: flex;
                align-items: center;
                gap: 6px;
                background: #fef3c7;
                color: #92400e;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                margin-top: 8px;
              }
              .bookings-merge-icon {
                width: 14px;
                height: 14px;
              }
              .merge-time {
                color: #78716c;
                font-weight: 400;
              }
              .addon-item {
                background: #f8fafc;
                border-left: 3px solid #3b82f6;
              }
              .addon-services-section {
                margin-top: 16px;
              }
              .addon-indicator {
                display: block;
                font-size: 14px;
                font-weight: 400;
                color: #6b7280;
                margin-top: 4px;
                line-height: 1.4;
              }
              .bookings-service-name {
                line-height: 1.3;
              }
            `}</style>
            <div className="bookings-modal-header">
              <div className="bookings-modal-title-section">
                <h2 className="bookings-modal-title">Booking Details</h2>
                {selectedBooking && (
                  <span className={`bookings-status-badge ${statusConfig[selectedBooking.status]?.className}`}>
                    {statusConfig[selectedBooking.status]?.icon}
                    <span>{statusConfig[selectedBooking.status]?.label}</span>
                  </span>
                )}
              </div>
              <span className="bookings-modal-id">#{selectedBooking.id}</span>
              <button
                className="bookings-modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="bookings-modal-body">
              {/* Service Info */}
              <div className="bookings-modal-section service-section">
                <h4>Service Details</h4>
                
                {/* Original Service */}
                <div className="service-detail-item">
                  <div className="service-info">
                    <p className="service-name">
                      {selectedBooking.workName || selectedBooking.serviceName || "Service Request"}
                    </p>
                    <p className="service-price">
                      ₹{(() => {
                        // If package price exists, use it
                        if (selectedBooking.packagePrice) {
                          return selectedBooking.packagePrice.toLocaleString();
                        }
                        // If addOns exist, calculate original price by subtracting addon prices from total
                        if (selectedBooking.addOns && selectedBooking.addOns.length > 0 && selectedBooking.totalPrice) {
                          const addOnsTotal = selectedBooking.addOns.reduce((total, addon) => total + (addon.price || 0), 0);
                          const originalPrice = selectedBooking.totalPrice - addOnsTotal;
                          return originalPrice.toLocaleString();
                        }
                        // Otherwise use the existing price
                        return (selectedBooking.totalPrice || selectedBooking.price || selectedBooking.amount || 0).toLocaleString();
                      })()}
                    </p>
                  </div>
                  
                  {/* Package Details */}
                  {(selectedBooking.packageType || selectedBooking.packageDuration) && (
                    <div className="package-details" style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: '#f0f9ff',
                      borderRadius: '8px',
                      border: '1px solid #bae6fd'
                    }}>
                      <h5 style={{margin: '0 0 8px 0', color: '#0369a1', fontSize: '14px', fontWeight: '600'}}>
                        📦 Package Information
                      </h5>
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px'}}>
                        {selectedBooking.packageType && (
                          <div className="package-info-item">
                            <span style={{fontSize: '12px', color: '#64748b', display: 'block'}}>Package Type</span>
                            <span style={{fontSize: '14px', fontWeight: '600', color: '#0f172a', textTransform: 'capitalize'}}>
                              {selectedBooking.packageType}
                            </span>
                          </div>
                        )}
                        {selectedBooking.packageDuration && (
                          <div className="package-info-item">
                            <span style={{fontSize: '12px', color: '#64748b', display: 'block'}}>Duration</span>
                            <span style={{fontSize: '14px', fontWeight: '600', color: '#0f172a'}}>
                              {selectedBooking.packageDuration} {selectedBooking.packageType === 'monthly' ? 'Month(s)' : selectedBooking.packageType === 'weekly' ? 'Week(s)' : 'Day(s)'}
                            </span>
                          </div>
                        )}
                        {selectedBooking.packagePrice && (
                          <div className="package-info-item">
                            <span style={{fontSize: '12px', color: '#64748b', display: 'block'}}>Package Price</span>
                            <span style={{fontSize: '14px', fontWeight: '600', color: '#059669'}}>
                              ₹{selectedBooking.packagePrice.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Working Days */}
                      {selectedBooking.workingDays && selectedBooking.workingDays.length > 0 && (
                        <div style={{marginTop: '12px'}}>
                          <span style={{fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px'}}>Working Days</span>
                          <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                            {selectedBooking.workingDays.map((day, index) => (
                              <span key={index} style={{
                                background: '#fff',
                                border: '1px solid #0ea5e9',
                                color: '#0369a1',
                                padding: '4px 10px',
                                borderRadius: '16px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                {day}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Service Frequency */}
                      {selectedBooking.serviceFrequency && (
                        <div style={{marginTop: '8px'}}>
                          <span style={{fontSize: '12px', color: '#64748b', display: 'block'}}>Service Frequency</span>
                          <span style={{fontSize: '14px', fontWeight: '500', color: '#0f172a'}}>
                            {selectedBooking.serviceFrequency}
                          </span>
                        </div>
                      )}
                      
                      {/* Start Date & End Date */}
                      {(selectedBooking.packageStartDate || selectedBooking.packageEndDate) && (
                        <div style={{marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                          {selectedBooking.packageStartDate && (
                            <div>
                              <span style={{fontSize: '12px', color: '#64748b', display: 'block'}}>Start Date</span>
                              <span style={{fontSize: '14px', fontWeight: '500', color: '#0f172a'}}>
                                {selectedBooking.packageStartDate}
                              </span>
                            </div>
                          )}
                          {selectedBooking.packageEndDate && (
                            <div>
                              <span style={{fontSize: '12px', color: '#64748b', display: 'block'}}>End Date</span>
                              <span style={{fontSize: '14px', fontWeight: '500', color: '#0f172a'}}>
                                {selectedBooking.packageEndDate}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedBooking.notes && (
                    <p className="service-notes">{selectedBooking.notes}</p>
                  )}
                </div>

                {/* Add-on Services */}
                {selectedBooking.addOns && selectedBooking.addOns.length > 0 && (
                  <div className="addon-services-section">
                    <h5 style={{margin: '16px 0 8px 0', color: '#374151'}}>Add-on Services:</h5>
                    {selectedBooking.addOns.map((addon, index) => (
                      <div key={index} className="service-detail-item addon-item">
                        <div className="service-info">
                          <p className="service-name">{addon.name}</p>
                          <p className="service-price">₹{(addon.price || 0).toLocaleString()}</p>
                        </div>
                        {addon.notes && (
                          <p className="service-notes">{addon.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Total Summary */}
                {selectedBooking.addOns && selectedBooking.addOns.length > 0 && (
                  <div className="total-services-summary">
                    <strong>
                      Total: {selectedBooking.addOns.length + 1} services - ₹
                      {(selectedBooking.totalPrice || selectedBooking.price || selectedBooking.amount || 0).toLocaleString()}
                    </strong>
                  </div>
                )}
              </div>

              {/* Customer Info */}
              <div className="bookings-modal-section">
                <h4>Customer Information</h4>
                <div className="customer-info">
                  <div className="customer-avatar">
                    {selectedBooking.customerName ? selectedBooking.customerName.split(" ").map(n => n[0]).join("").toUpperCase() : "U"}
                  </div>
                  <div className="customer-details">
                    <p className="customer-name">{selectedBooking.customerName}</p>
                    <p className="customer-email">{selectedBooking.email || "No email provided"}</p>
                  </div>
                </div>
                
                <div className="contact-details">
                  <div className="contact-item">
                    <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span>{selectedBooking.customerPhone || "Not provided"}</span>
                  </div>
                  <div className="contact-item">
                    <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{selectedBooking.customerAddress || selectedBooking.address || selectedBooking.location || "No location provided"}</span>
                  </div>
                </div>
              </div>

              <div className="bookings-modal-separator"></div>

              {/* Booking Details */}
              <div className="bookings-modal-details-grid">
                <div className="detail-item">
                  <h4>Date</h4>
                  <p>{selectedBooking.date}</p>
                </div>
                <div className="detail-item">
                  <h4>Time Slot</h4>
                  <p>{selectedBooking.time}</p>
                </div>
                <div className="detail-item">
                  <h4>Amount</h4>
                  <div className="amount-display">
                    <span className="price-display">
                      <span className="rupee-symbol-large">₹</span>
                      <span className="price-amount-large">
                        {/* Use totalPrice directly if it already includes addOns */}
                        {(() => {
                          if (selectedBooking.totalPrice && selectedBooking.addOns && selectedBooking.addOns.length > 0) {
                            return selectedBooking.totalPrice.toLocaleString();
                          }
                          
                          const basePrice = selectedBooking.totalPrice || selectedBooking.price || selectedBooking.amount || 0;
                          const addOnsPrice = selectedBooking.addOns ? selectedBooking.addOns.reduce((total, addon) => total + (addon.price || 0), 0) : 0;
                          return (basePrice + addOnsPrice).toLocaleString();
                        })()}
                      </span>
                    </span>
                  </div>
                </div>
                {selectedBooking.technicianName && (
                  <div className="detail-item">
                    <h4>Assigned Technician</h4>
                    <p>{selectedBooking.technicianName}</p>
                  </div>
                )}
              </div>

              {selectedBooking.notes && (
                <>
                  <div className="bookings-modal-separator"></div>
                  <div className="bookings-modal-section">
                    <h4>Notes</h4>
                    <p>{selectedBooking.notes}</p>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="bookings-modal-actions">
                {selectedBooking.status === "pending" && (
                  <button 
                    className="bookings-modal-btn primary"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setOpenAssign(true);
                    }}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="10" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Assign Technician
                  </button>
                )}
                {selectedBooking.status === "assigned" && (
                  <button 
                    className="bookings-modal-btn primary"
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleStartWork(selectedBooking);
                    }}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                    </svg>
                    Mark as Started
                  </button>
                )}
                {selectedBooking.status === "started" && (
                  <button 
                    className="bookings-modal-btn success"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowOtpModal(true);
                    }}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22,4 12,14.01 9,11.01"/>
                    </svg>
                    Mark as Completed
                  </button>
                )}
                <button 
                  className="bookings-modal-btn secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;