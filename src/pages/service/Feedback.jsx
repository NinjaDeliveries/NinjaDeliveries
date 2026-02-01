import React, { useEffect, useState, useCallback } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import "../../style/ServiceDashboard.css";

const Feedback = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [stats, setStats] = useState({
    totalFeedback: 0,
    averageRating: 0,
    fiveStars: 0,
    fourStars: 0,
    threeStars: 0,
    twoStars: 0,
    oneStar: 0,
    withComments: 0,
  });

  const fetchRatings = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No authenticated user found");
        setLoading(false);
        return;
      }

      console.log("Fetching feedback for user:", user.uid);

      // Try multiple approaches to find the correct company ID
      let companyId = user.uid; // Default to user ID

      // Get service company document to check if it exists
      const companyRef = doc(db, "service_company", user.uid);
      const companySnap = await getDoc(companyRef);

      if (companySnap.exists()) {
        const companyData = companySnap.data();
        console.log("Company data found:", companyData);
        // Use the document ID as company ID
        companyId = companySnap.id;
      } else {
        console.log("No service_company document found, using user.uid as companyId");
      }

      console.log("Using companyId for feedback query:", companyId);

      // Try different query approaches
      const queries = [
        // Query 1: Using companyId field
        query(
          collection(db, "serviceRatings"),
          where("companyId", "==", companyId)
        ),
        // Query 2: Using serviceCompanyId field (alternative field name)
        query(
          collection(db, "serviceRatings"),
          where("serviceCompanyId", "==", companyId)
        ),
        // Query 3: Using company field (another alternative)
        query(
          collection(db, "serviceRatings"),
          where("company", "==", companyId)
        )
      ];

      let feedbackList = [];
      let queryWorked = false;

      // Try each query until one works
      for (let i = 0; i < queries.length; i++) {
        try {
          console.log(`Trying query ${i + 1}...`);
          const snap = await getDocs(queries[i]);
          console.log(`Query ${i + 1} returned ${snap.docs.length} documents`);
          
          if (snap.docs.length > 0) {
            feedbackList = snap.docs.map((d) => {
              const data = d.data();
              console.log("Feedback document data:", data);
              return {
                id: d.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(data.createdAt) || new Date(),
              };
            });
            queryWorked = true;
            console.log("Successfully fetched feedback:", feedbackList);
            break;
          }
        } catch (queryError) {
          console.error(`Query ${i + 1} failed:`, queryError);
        }
      }

      if (!queryWorked) {
        // If no queries worked, try to get all documents and filter manually
        console.log("All queries failed, trying to fetch all serviceRatings documents...");
        try {
          const allDocsSnap = await getDocs(collection(db, "serviceRatings"));
          console.log(`Found ${allDocsSnap.docs.length} total serviceRatings documents`);
          
          if (allDocsSnap.docs.length === 0) {
            console.log("⚠️ No documents found in serviceRatings collection at all!");
            console.log("This could mean:");
            console.log("1. The collection name is different (check Firebase console)");
            console.log("2. No ratings have been created yet");
            console.log("3. Security rules are blocking access");
          }
          
          const allDocs = allDocsSnap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }));
          
          console.log("All serviceRatings documents:", allDocs);
          
          // Filter manually for this company
          feedbackList = allDocs.filter(doc => 
            doc.companyId === companyId || 
            doc.serviceCompanyId === companyId || 
            doc.company === companyId
          );
          
          console.log("Filtered feedback for this company:", feedbackList);
        } catch (allDocsError) {
          console.error("Failed to fetch all documents:", allDocsError);
          console.log("This might be a security rules issue or the collection doesn't exist");
        }
      }

      setRatings(feedbackList);
      calculateStats(feedbackList);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateStats = (feedbackList) => {
    const stats = feedbackList.reduce((acc, feedback) => {
      const rating = parseInt(feedback.rating || 0);
      
      acc.totalFeedback++;
      acc.averageRating += rating;

      // Rating distribution
      switch (rating) {
        case 5: acc.fiveStars++; break;
        case 4: acc.fourStars++; break;
        case 3: acc.threeStars++; break;
        case 2: acc.twoStars++; break;
        case 1: acc.oneStar++; break;
        default: break;
      }

      // Comments count
      if (feedback.feedback && feedback.feedback.trim()) {
        acc.withComments++;
      }

      return acc;
    }, {
      totalFeedback: 0,
      averageRating: 0,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStar: 0,
      withComments: 0,
    });

    // Calculate average
    if (stats.totalFeedback > 0) {
      stats.averageRating = (stats.averageRating / stats.totalFeedback).toFixed(1);
    }

    setStats(stats);
  };

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  // Filter feedback based on search and rating
  const filteredRatings = ratings.filter((rating) => {
    const matchesSearch = !searchQuery || 
      rating.serviceTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rating.feedback?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rating.customerName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRating = ratingFilter === "all" || 
      parseInt(rating.rating) === parseInt(ratingFilter);

    return matchesSearch && matchesRating;
  });

  const renderStars = (rating) => {
    const stars = [];
    const numRating = parseInt(rating || 0);
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`feedback-star ${i <= numRating ? 'filled' : 'empty'}`}
          viewBox="0 0 24 24"
          fill={i <= numRating ? "currentColor" : "none"}
          stroke="currentColor"
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      );
    }
    return stars;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRatingColor = (rating) => {
    const numRating = parseInt(rating || 0);
    if (numRating >= 4) return 'feedback-rating-good';
    if (numRating >= 3) return 'feedback-rating-average';
    return 'feedback-rating-poor';
  };

  if (loading) {
    return (
      <div className="sd-main">
        <div className="feedback-loading">
          <div className="feedback-loading-spinner"></div>
          <p>Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-main">
      {/* Page Header */}
      <div className="sd-header">
        <div>
          <h1>Customer Feedback</h1>
          <p>View and analyze customer reviews and ratings for your services</p>
        </div>
        <div className="feedback-header-actions">
          <button 
            className="feedback-refresh-btn"
            onClick={() => {
              setLoading(true);
              fetchRatings();
            }}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="feedback-stats-grid">
        <div className="feedback-stat-card average">
          <div className="feedback-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          </div>
          <div className="feedback-stat-content">
            <p className="feedback-stat-label">Average Rating</p>
            <p className="feedback-stat-value">{stats.averageRating} / 5</p>
          </div>
        </div>

        <div className="feedback-stat-card total">
          <div className="feedback-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div className="feedback-stat-content">
            <p className="feedback-stat-label">Total Reviews</p>
            <p className="feedback-stat-value">{stats.totalFeedback}</p>
          </div>
        </div>

        <div className="feedback-stat-card positive">
          <div className="feedback-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M7 10v12"/>
              <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
            </svg>
          </div>
          <div className="feedback-stat-content">
            <p className="feedback-stat-label">Positive (4-5★)</p>
            <p className="feedback-stat-value">{stats.fiveStars + stats.fourStars}</p>
          </div>
        </div>

        <div className="feedback-stat-card comments">
          <div className="feedback-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/>
              <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>
            </svg>
          </div>
          <div className="feedback-stat-content">
            <p className="feedback-stat-label">With Comments</p>
            <p className="feedback-stat-value">{stats.withComments}</p>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="feedback-distribution-card">
        <h3>Rating Distribution</h3>
        <div className="feedback-distribution">
          {[5, 4, 3, 2, 1].map(star => {
            const count = stats[`${star === 1 ? 'one' : star === 2 ? 'two' : star === 3 ? 'three' : star === 4 ? 'four' : 'five'}Star${star === 1 ? '' : 's'}`];
            const percentage = stats.totalFeedback > 0 ? (count / stats.totalFeedback) * 100 : 0;
            
            return (
              <div key={star} className="feedback-distribution-row">
                <div className="feedback-distribution-label">
                  <span>{star}</span>
                  <svg className="feedback-star filled" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                  </svg>
                </div>
                <div className="feedback-distribution-bar">
                  <div 
                    className="feedback-distribution-fill"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="feedback-distribution-count">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="feedback-filters">
        <div className="feedback-search">
          <svg className="feedback-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="feedback-search-input"
          />
        </div>

        <select 
          className="feedback-filter-select"
          value={ratingFilter} 
          onChange={(e) => setRatingFilter(e.target.value)}
        >
          <option value="all">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
      </div>

      {/* Feedback List */}
      <div className="feedback-list">
        {filteredRatings.length === 0 ? (
          <div className="feedback-empty-state">
            <div className="feedback-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3>No feedback found</h3>
            <p>
              {searchQuery || ratingFilter !== "all"
                ? "Try adjusting your filters"
                : "Customer feedback will appear here when they rate your services"}
            </p>
            {/* Debug info */}
            <div className="feedback-debug-info" style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: '#f8f9fa', 
              borderRadius: '8px', 
              fontSize: '12px', 
              color: '#666',
              textAlign: 'left'
            }}>
              <strong>Debug Info:</strong><br/>
              Total ratings fetched: {ratings.length}<br/>
              Current user ID: {auth.currentUser?.uid}<br/>
              Check browser console for detailed logs
            </div>
          </div>
        ) : (
          filteredRatings.map((rating) => (
            <div key={rating.id} className="feedback-card">
              <div className="feedback-card-content">
                <div className="feedback-main-section">
                  <div className="feedback-avatar">
                    {rating.customerName ? rating.customerName.split(" ").map(n => n[0]).join("").toUpperCase() : "U"}
                  </div>
                  
                  <div className="feedback-info">
                    <div className="feedback-header">
                      <div className="feedback-customer-info">
                        <h3 className="feedback-customer-name">{rating.customerName || 'Anonymous Customer'}</h3>
                        <p className="feedback-service-name">{rating.serviceTitle || 'Service'}</p>
                      </div>
                      <div className="feedback-date">
                        {formatDate(rating.createdAt)}
                      </div>
                    </div>

                    <div className="feedback-rating-section">
                      <div className="feedback-stars">
                        {renderStars(rating.rating)}
                      </div>
                      <span className={`feedback-rating-badge ${getRatingColor(rating.rating)}`}>
                        {rating.rating}/5
                      </span>
                    </div>

                    {rating.feedback && rating.feedback.trim() && (
                      <div className="feedback-comment">
                        <svg className="feedback-comment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <p>"{rating.feedback}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Feedback;