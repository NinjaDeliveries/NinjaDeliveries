import React, { useEffect, useState, useCallback } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
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

  const setupRealtimeFeedbackListener = useCallback(() => {
    const user = auth.currentUser;
    if (!user) {
      console.log("❌ No authenticated user found");
      setLoading(false);
      return;
    }

    console.log("🔄 Setting up real-time feedback listener for user:", user.uid);

    // Try multiple collection names and field combinations
    const collectionNames = ["serviceRatings", "service_ratings", "ratings", "feedback"];
    const fieldNames = ["companyId", "serviceCompanyId", "company", "providerId"];
    
    let unsubscribe = null;
    let listenerActive = false;

    const tryListener = async (collectionName, fieldName) => {
      try {
        console.log(`🔍 Trying listener: ${collectionName}.${fieldName} == ${user.uid}`);
        
        // Simple query without orderBy to avoid index requirement
        const q = query(
          collection(db, collectionName),
          where(fieldName, "==", user.uid)
        );

        return onSnapshot(q, (snapshot) => {
          console.log(`📊 ${collectionName} snapshot received:`, {
            size: snapshot.size,
            empty: snapshot.empty,
            changes: snapshot.docChanges().length
          });

          if (!snapshot.empty || listenerActive) {
            listenerActive = true;
            
            const feedbackList = [];
            snapshot.docs.forEach(doc => {
              const data = doc.data();
              console.log("📝 Feedback document:", doc.id, data);
              
              // Handle different timestamp formats
              let createdAt = new Date();
              if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                createdAt = data.createdAt.toDate();
              } else if (data.timestamp) {
                createdAt = new Date(data.timestamp);
              } else if (data.createdAt) {
                createdAt = new Date(data.createdAt);
              }
              
              feedbackList.push({
                id: doc.id,
                ...data,
                createdAt: createdAt,
              });
            });

            // Sort manually by date (newest first)
            feedbackList.sort((a, b) => b.createdAt - a.createdAt);

            console.log(`✅ Real-time feedback updated: ${feedbackList.length} items`);
            setRatings(feedbackList);
            calculateStats(feedbackList);
            setLoading(false);
          }
        }, (error) => {
          console.error(`❌ Listener error for ${collectionName}.${fieldName}:`, error);
          throw error;
        });

      } catch (error) {
        console.error(`❌ Failed to setup listener for ${collectionName}.${fieldName}:`, error);
        return null;
      }
    };

    // Try different combinations
    const setupListener = async () => {
      for (const collectionName of collectionNames) {
        for (const fieldName of fieldNames) {
          try {
            const listener = await tryListener(collectionName, fieldName);
            if (listener) {
              unsubscribe = listener;
              console.log(`✅ Successfully setup listener: ${collectionName}.${fieldName}`);
              return;
            }
          } catch (error) {
            console.log(`⚠️ Listener failed: ${collectionName}.${fieldName}`);
            continue;
          }
        }
      }

      // If no specific listeners worked, try to get all documents as fallback
      console.log("🔄 Trying fallback: fetch all documents and filter...");
      try {
        const allListener = onSnapshot(collection(db, "serviceRatings"), (snapshot) => {
          console.log(`📊 All documents snapshot: ${snapshot.size} total`);
          
          const allDocs = [];
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            
            // Handle different timestamp formats
            let createdAt = new Date();
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
              createdAt = data.createdAt.toDate();
            } else if (data.timestamp) {
              createdAt = new Date(data.timestamp);
            } else if (data.createdAt) {
              createdAt = new Date(data.createdAt);
            }
            
            allDocs.push({
              id: doc.id,
              ...data,
              createdAt: createdAt,
            });
          });

          // Filter for this company
          const feedbackList = allDocs.filter(doc => 
            doc.companyId === user.uid || 
            doc.serviceCompanyId === user.uid || 
            doc.company === user.uid ||
            doc.providerId === user.uid
          );

          // Sort manually by date (newest first)
          feedbackList.sort((a, b) => b.createdAt - a.createdAt);

          console.log(`✅ Fallback filter result: ${feedbackList.length} items for company`);
          setRatings(feedbackList);
          calculateStats(feedbackList);
          setLoading(false);
        }, (error) => {
          console.error("❌ Fallback listener error:", error);
          // If even fallback fails, just show empty state
          setRatings([]);
          calculateStats([]);
          setLoading(false);
        });

        unsubscribe = allListener;
      } catch (error) {
        console.error("❌ Fallback listener setup failed:", error);
        setRatings([]);
        calculateStats([]);
        setLoading(false);
      }
    };

    setupListener();

    // Return cleanup function
    return () => {
      if (unsubscribe) {
        console.log("🧹 Cleaning up feedback listener");
        unsubscribe();
      }
    };
  }, []);

  // Manual refresh function
  const handleRefresh = () => {
    console.log("🔄 Manual refresh triggered");
    setLoading(true);
    
    // Re-setup the listener
    const cleanup = setupRealtimeFeedbackListener();
    
    // Set a timeout to stop loading if no data comes
    setTimeout(() => {
      if (loading) {
        console.log("⏰ Refresh timeout, stopping loading");
        setLoading(false);
      }
    }, 10000); // 10 second timeout
    
    return cleanup;
  };

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
    console.log("🚀 Feedback component mounted, setting up real-time listener");
    const cleanup = setupRealtimeFeedbackListener();
    
    // Cleanup on unmount
    return cleanup;
  }, [setupRealtimeFeedbackListener]);

  // Filter feedback based on search and rating
  const filteredRatings = ratings.filter((rating) => {
    const matchesSearch = !searchQuery || 
      rating.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rating.feedback?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rating.serviceName?.toLowerCase().includes(searchQuery.toLowerCase());

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
          <div className="feedback-live-indicator">
            <div className="feedback-live-dot"></div>
            Live Data
          </div>
        </div>
        <div className="feedback-header-actions">
          <button 
            className="feedback-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="feedback-btn-spinner"></div>
                Refreshing...
              </>
            ) : (
              <>
                🔄 Refresh
              </>
            )}
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
              <path d="M14 9V5a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H9V5a3 3 0 0 1 6 0v4h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2"/>
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
        <div className="feedback-distribution-bars">
          {[5, 4, 3, 2, 1].map(star => {
            const count = stats[`${['', 'one', 'two', 'three', 'four', 'five'][star]}Star${star === 1 ? '' : 's'}`] || 0;
            const percentage = stats.totalFeedback > 0 ? (count / stats.totalFeedback) * 100 : 0;
            
            return (
              <div key={star} className="feedback-distribution-row">
                <span className="feedback-distribution-label">{star} ⭐</span>
                <div className="feedback-distribution-bar">
                  <div 
                    className="feedback-distribution-fill"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="feedback-distribution-count">{count}</span>
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
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="feedback-filter-select"
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
                ? "Try adjusting your search or filters"
                : "Customer feedback will appear here once services are completed and rated"}
            </p>
          </div>
        ) : (
          filteredRatings.map((rating) => (
            <div key={rating.id} className="feedback-card">
              <div className="feedback-header">
                <div className="feedback-customer">
                  <div className="feedback-avatar">
                    {(rating.customerName || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="feedback-customer-info">
                    <h4>{rating.customerName || 'Anonymous'}</h4>
                    <p>{rating.serviceName || 'Service'}</p>
                  </div>
                </div>
                <div className="feedback-rating">
                  <div className={`feedback-rating-badge ${getRatingColor(rating.rating)}`}>
                    {rating.rating || 0}
                  </div>
                  <div className="feedback-stars">
                    {renderStars(rating.rating)}
                  </div>
                </div>
              </div>

              {rating.feedback && (
                <div className="feedback-comment">
                  <p>"{rating.feedback}"</p>
                </div>
              )}

              <div className="feedback-footer">
                <span className="feedback-date">{formatDate(rating.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Feedback;