import '../../style/UserGuide.css';

const UserGuide = () => {
  return (
    <div className="user-guide-container">
      <div className="guide-header">
        <h1>🚀 Ninja Deliveries Service Management Guide</h1>
        <p className="guide-subtitle">Complete step-by-step tutorial for company users</p>
      </div>

      <div className="guide-content">
        
        {/* Login Section */}
        <section className="guide-section">
          <h2>🔐 1. Login to Dashboard</h2>
          <div className="guide-steps">
            <p><strong>Getting Started:</strong></p>
            <ul>
              <li>Visit the Ninja Deliveries service portal</li>
              <li>Enter your registered <strong>email address</strong> and <strong>password</strong></li>
              <li>Click "Login" to access your company dashboard</li>
              <li>If you forgot your password, use the "Reset Password" option</li>
            </ul>
            <div className="demo-screen">
              <div className="demo-login-card">
                <div className="demo-logo">🥷 Ninja Deliveries</div>
                <h3>Service Provider Login</h3>
                <div className="demo-input-group">
                  <label>📧 Email Address</label>
                  <input type="text" value="your-company@example.com" readOnly />
                </div>
                <div className="demo-input-group">
                  <label>🔑 Password</label>
                  <input type="password" value="••••••••" readOnly />
                </div>
                <button className="demo-btn-primary">LOGIN</button>
                <a href="#" className="demo-link">Forgot Password?</a>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Overview */}
        <section className="guide-section">
          <h2>📊 2. Dashboard Overview</h2>
          <div className="guide-steps">
            <p><strong>Main Dashboard Screen:</strong></p>
            <ul>
              <li>View your company name and email in the sidebar</li>
              <li>See all menu options on the left navigation</li>
              <li>Monitor key statistics in the main area</li>
            </ul>
            <div className="demo-screen">
              <div className="demo-overview-grid">
                <div className="demo-stat-card stat-blue">
                  <div className="stat-icon">📋</div>
                  <div className="stat-content">
                    <h4>Total Bookings</h4>
                    <p className="stat-number">45</p>
                    <span className="stat-change">+12% from last month</span>
                  </div>
                </div>
                <div className="demo-stat-card stat-green">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <h4>Monthly Revenue</h4>
                    <p className="stat-number">₹12,500</p>
                    <span className="stat-change">+8% increase</span>
                  </div>
                </div>
                <div className="demo-stat-card stat-purple">
                  <div className="stat-icon">👷</div>
                  <div className="stat-content">
                    <h4>Active Workers</h4>
                    <p className="stat-number">8</p>
                    <span className="stat-change">All available</span>
                  </div>
                </div>
                <div className="demo-stat-card stat-orange">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-content">
                    <h4>Average Rating</h4>
                    <p className="stat-number">4.5/5</p>
                    <span className="stat-change">Based on 32 reviews</span>
                  </div>
                </div>
              </div>
              <div className="demo-quick-actions">
                <h4>Quick Actions</h4>
                <div className="action-buttons">
                  <button className="action-btn">🎨 Banner Management</button>
                  <button className="action-btn">👷 Add Technicians</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="guide-section">
          <h2>📂 3. Categories Section</h2>
          <div className="guide-steps">
            <p><strong>Setting Up Service Categories:</strong></p>
            <ul>
              <li>Navigate to "Categories" from the sidebar</li>
              <li>Browse <strong>pre-created categories</strong> provided by Ninja</li>
              <li>Select categories relevant to your business:</li>
              <ul>
                <li>🔌 <strong>Electrical</strong> (wiring, repairs, installations)</li>
                <li>🚿 <strong>Plumbing</strong> (pipes, fixtures, drainage)</li>
                <li>🔧 <strong>Appliance Repair</strong> (AC, washing machine, etc.)</li>
                <li>🏠 <strong>Home Maintenance</strong> (painting, cleaning)</li>
              </ul>
              <li>Click "Add to My Services" for each relevant category</li>
              <li>Save your selections</li>
            </ul>
            <div className="demo-screen">
              <div className="demo-categories-list">
                <h4>Available Categories (Select from Ninja's pre-created list)</h4>
                <div className="category-item selected">
                  <input type="checkbox" checked readOnly />
                  <div className="category-info">
                    <span className="category-icon">🔌</span>
                    <div>
                      <strong>Electrical</strong>
                      <p>Wiring, repairs, installations</p>
                    </div>
                  </div>
                  <span className="badge-selected">Selected</span>
                </div>
                <div className="category-item selected">
                  <input type="checkbox" checked readOnly />
                  <div className="category-info">
                    <span className="category-icon">🚿</span>
                    <div>
                      <strong>Plumbing</strong>
                      <p>Pipes, fixtures, drainage</p>
                    </div>
                  </div>
                  <span className="badge-selected">Selected</span>
                </div>
                <div className="category-item">
                  <input type="checkbox" readOnly />
                  <div className="category-info">
                    <span className="category-icon">❄️</span>
                    <div>
                      <strong>Appliance Repair</strong>
                      <p>AC, washing machine, refrigerator</p>
                    </div>
                  </div>
                  <span className="badge-available">Available</span>
                </div>
                <div className="category-item">
                  <input type="checkbox" readOnly />
                  <div className="category-info">
                    <span className="category-icon">🏠</span>
                    <div>
                      <strong>Home Maintenance</strong>
                      <p>Painting, cleaning, repairs</p>
                    </div>
                  </div>
                  <span className="badge-available">Available</span>
                </div>
              </div>
              <button className="demo-btn-primary">Save Categories</button>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="guide-section">
          <h2>🛠️ 4. Services Section (Most Important)</h2>
          <div className="guide-steps">
            <p><strong>Creating Your Service Offerings:</strong></p>
            <ul>
              <li><strong>Step 1:</strong> Select a category (e.g., Electrical)</li>
              <li><strong>Step 2:</strong> Add specific services under that category</li>
              <li><strong>Step 3:</strong> Create service packages with pricing</li>
            </ul>
            
            <h4>Example Service Setup:</h4>
            <div className="demo-screen">
              <div className="demo-service-setup">
                <div className="service-header">
                  <h4>Create New Service</h4>
                  <select className="demo-select">
                    <option>Category: Electrical</option>
                  </select>
                </div>
                <div className="service-form">
                  <div className="form-group">
                    <label>Service Name</label>
                    <input type="text" value="Fan Repair" readOnly />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea readOnly>Complete fan repair and maintenance service including cleaning, oiling, and fixing electrical issues.</textarea>
                  </div>
                  <h4>Create Packages</h4>
                  <div className="package-list">
                    <div className="package-card">
                      <div className="package-header">
                        <span className="package-badge">📦 Basic</span>
                        <span className="package-price">₹200</span>
                      </div>
                      <p>Basic Repair - 1 hour service</p>
                      <ul>
                        <li>✓ Fan cleaning</li>
                        <li>✓ Basic repair</li>
                      </ul>
                    </div>
                    <div className="package-card">
                      <div className="package-header">
                        <span className="package-badge">📦 Standard</span>
                        <span className="package-price">₹500</span>
                      </div>
                      <p>Complete Service - 2 hours</p>
                      <ul>
                        <li>✓ Deep cleaning</li>
                        <li>✓ Complete repair</li>
                        <li>✓ Parts replacement</li>
                      </ul>
                    </div>
                    <div className="package-card">
                      <div className="package-header">
                        <span className="package-badge">📦 Premium</span>
                        <span className="package-price">₹1,200</span>
                      </div>
                      <p>Weekly Maintenance - Monthly</p>
                      <ul>
                        <li>✓ 4 visits per month</li>
                        <li>✓ Priority support</li>
                        <li>✓ Free parts</li>
                      </ul>
                    </div>
                  </div>
                  <button className="demo-btn-primary">Save Service & Packages</button>
                </div>
              </div>
            </div>

            <h4>Package-Based Pricing (Recommended):</h4>
            <ul>
              <li><strong>Hourly Packages:</strong> ₹150/hour, ₹280/2 hours</li>
              <li><strong>Service Packages:</strong> Basic, Standard, Premium</li>
              <li><strong>Subscription Packages:</strong> Weekly, Monthly maintenance</li>
            </ul>
          </div>
        </section>

        {/* Bookings Section */}
        <section className="guide-section">
          <h2>📋 5. Bookings Section (Key Operations)</h2>
          <div className="guide-steps">
            <p><strong>Managing Customer Bookings - Complete Flow:</strong></p>
            
            <div className="flow-explanation">
              <h4>📌 Booking Flow Steps:</h4>
              <ol className="booking-flow-list">
                <li><strong>Step 1:</strong> New booking arrives (Status: PENDING)</li>
                <li><strong>Step 2:</strong> Assign worker to the booking</li>
                <li><strong>Step 3:</strong> Worker completes service and gets OTP from customer</li>
                <li><strong>Step 4:</strong> Worker enters OTP to mark complete</li>
              </ol>
            </div>

            <h4>📥 Step 1: New Booking Arrives (PENDING Status)</h4>
            <p>When a customer books a service, you'll see it with <strong>PENDING</strong> status. You need to assign a worker first.</p>

            <div className="demo-screen">
              <div className="demo-booking-notification">
                <div className="notification-header">
                  <span className="notification-badge">🔔 New Booking Request</span>
                  <span className="notification-time">2 minutes ago</span>
                </div>
                <div className="booking-details-card">
                  <div className="booking-row">
                    <span className="label">👤 Customer:</span>
                    <span className="value">Abhay</span>
                  </div>
                  <div className="booking-row">
                    <span className="label">📱 Phone:</span>
                    <span className="value">+91 88894 28648</span>
                  </div>
                  <div className="booking-row">
                    <span className="label">🛠️ Service:</span>
                    <span className="value">GYM (Home GYM)</span>
                  </div>
                  <div className="booking-row">
                    <span className="label">📅 Date:</span>
                    <span className="value">Tomorrow, Feb 7</span>
                  </div>
                  <div className="booking-row">
                    <span className="label">⏰ Time Slot:</span>
                    <span className="value">1:00 PM - 3:00 AM</span>
                  </div>
                  <div className="booking-row">
                    <span className="label">📍 Address:</span>
                    <span className="value">Dharamshala</span>
                  </div>
                  <div className="booking-row highlight">
                    <span className="label">💰 Amount:</span>
                    <span className="value">₹30 (Already Paid ✓)</span>
                  </div>
                  <div className="booking-row">
                    <span className="label">📊 Status:</span>
                    <span className="value status-pending">⏳ PENDING</span>
                  </div>
                </div>
                <div className="booking-actions">
                  <button className="btn-view">View</button>
                  <button className="btn-assign">👷 Assign</button>
                  <button className="btn-reject">✗ Reject</button>
                </div>
              </div>
            </div>

            <h4>👷 Step 2: Assign Worker to Booking</h4>
            <p>Click the <strong>"Assign"</strong> button and select an available worker from the list.</p>

            <div className="demo-screen">
              <div className="assign-worker-modal">
                <h4>Assign Worker</h4>
                <div className="modal-content">
                  <div className="booking-info">
                    <p><strong>Customer:</strong> Abhay</p>
                    <p><strong>Service:</strong> GYM</p>
                    <p><strong>Category:</strong> Home GYM</p>
                    <p><strong>Date:</strong> 2026-02-07 • 1:00 PM - 3:00 PM</p>
                  </div>
                  <div className="worker-selection">
                    <p className="info-text">Showing workers for: Home GYM - GYM (1 total, 1 available)</p>
                    <div className="worker-option">
                      <input type="radio" name="worker" checked readOnly />
                      <label>LAKSHAY SAINI (Academic & project Assistance, Home GYM 🏋️)</label>
                      <span className="availability-badge">✅ Available for this time slot</span>
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-cancel">Cancel</button>
                    <button className="btn-assign-primary">Assign Worker</button>
                  </div>
                </div>
              </div>
            </div>

            <h4>✅ Step 3: Booking Status Changes to STARTED</h4>
            <p>After assigning worker, booking status changes to <strong>STARTED</strong>. Worker will complete the service.</p>

            <h4>🔢 Step 4: Complete Service with OTP</h4>
            <p>When worker completes the service, customer provides OTP. Worker enters it to mark complete.</p>

            <div className="demo-screen">
              <div className="demo-completion-card">
                <div className="completion-header">
                  <h4>Verify OTP</h4>
                  <p>Enter OTP to complete work:</p>
                </div>
                <div className="otp-section">
                  <label>🔢 Enter 6-digit OTP</label>
                  <div className="otp-input-group">
                    <input type="text" maxLength="6" placeholder="Enter 6-digit OTP" className="otp-input-field" />
                  </div>
                  <p className="otp-note">Customer will provide this OTP after service completion</p>
                </div>
                <div className="modal-actions">
                  <button className="btn-cancel">Cancel</button>
                  <button className="btn-verify">Verify & Complete</button>
                </div>
              </div>
            </div>

            <div className="important-note">
              <p><strong>⚠️ IMPORTANT FLOW:</strong></p>
              <ul>
                <li>✅ Booking arrives with <strong>PENDING</strong> status</li>
                <li>✅ You must <strong>ASSIGN WORKER</strong> first</li>
                <li>✅ Status changes to <strong>STARTED</strong></li>
                <li>✅ Worker completes service and gets <strong>OTP</strong> from customer</li>
                <li>✅ Worker enters OTP to mark <strong>COMPLETED</strong></li>
                <li>✅ Payment is <strong>already received</strong> when booking arrives</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Slots/Calendar Section */}
        <section className="guide-section">
          <h2>📅 6. Calendar / Slots Section</h2>
          <div className="guide-steps">
            <p><strong>Managing Availability & Schedule:</strong></p>
            
            <h4>🟢 Company Status Control:</h4>
            <ul>
              <li><strong>Toggle Online/Offline:</strong> Control when customers can book</li>
              <li>Set your company as "Available" during working hours</li>
              <li>Go "Offline" during breaks or after hours</li>
            </ul>

            <h4>📆 View Bookings by Date:</h4>
            <ul>
              <li>Select any date to see scheduled bookings</li>
              <li>View customer information and contact details</li>
              <li>See complete booking details and service address</li>
              <li>Track worker assignments for each time slot</li>
            </ul>

            <div className="interactive-demo">
              <div className="demo-screen calendar-demo">
                <div className="calendar-header">
                  <h4>📅 Today - March 15, 2024</h4>
                  <div className="status-toggle">
                    <span>Company Status:</span>
                    <button className="toggle-btn online">🟢 ONLINE</button>
                  </div>
                </div>
                <div className="slots-timeline">
                  <div className="slot-item booked">
                    <div className="slot-time">⏰ 10:00 AM - 11:00 AM</div>
                    <div className="slot-details">
                      <strong>Electrical Repair</strong>
                      <p>👤 Priya Mehta | 👷 Worker: Amit</p>
                      <span className="badge info">In Progress</span>
                    </div>
                  </div>
                  <div className="slot-item booked">
                    <div className="slot-time">⏰ 2:00 PM - 3:00 PM</div>
                    <div className="slot-details">
                      <strong>Fan Service</strong>
                      <p>👤 Rahul Sharma | 👷 Worker: Vijay</p>
                      <span className="badge warning">Upcoming</span>
                    </div>
                  </div>
                  <div className="slot-item available">
                    <div className="slot-time">⏰ 4:00 PM - 5:00 PM</div>
                    <div className="slot-details">
                      <strong>Available Slot</strong>
                      <p>No bookings yet</p>
                      <span className="badge">Open</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technicians Section */}
        <section className="guide-section">
          <h2>👷 7. Technicians Section (Critical Setup)</h2>
          <div className="guide-steps">
            <p><strong>Managing Your Workforce:</strong></p>
            
            <h4>➕ Adding Workers:</h4>
            <ul>
              <li>Click "Add New Technician"</li>
              <li>Enter worker details: name, phone, skills</li>
              <li><strong>Assign categories/services</strong> to each worker</li>
              <li>Set their availability schedule</li>
            </ul>

            <div className="interactive-demo">
              <div className="demo-screen technicians-demo">
                <div className="technician-header">
                  <h4>Add New Technician</h4>
                  <button className="demo-btn small">+ Add Worker</button>
                </div>
                <div className="technician-card">
                  <div className="tech-avatar">👷</div>
                  <div className="tech-details">
                    <div className="form-group">
                      <label>👤 Name</label>
                      <input type="text" value="Amit Kumar" readOnly />
                    </div>
                    <div className="form-group">
                      <label>📱 Phone</label>
                      <input type="text" value="+91 98765 43210" readOnly />
                    </div>
                    <div className="form-group">
                      <label>🛠️ Assigned Skills</label>
                      <div className="skills-tags">
                        <span className="skill-tag">Electrical</span>
                        <span className="skill-tag">Fan Repair</span>
                        <span className="skill-tag">Wiring</span>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>⏰ Working Hours</label>
                      <input type="text" value="9:00 AM - 6:00 PM" readOnly />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <span className="badge success">✅ Active</span>
                    </div>
                  </div>
                </div>
                <button className="demo-btn primary">SAVE TECHNICIAN</button>
              </div>
            </div>

            <div className="important-note">
              <p><strong>⚠️ IMPORTANT:</strong> Services won't appear to customers until you have:</p>
              <ul>
                <li>✅ Selected Categories</li>
                <li>✅ Added Services with Packages</li>
                <li>✅ Assigned Workers to those services</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Feedback Section */}
        <section className="guide-section">
          <h2>⭐ 8. Feedback Section</h2>
          <div className="guide-steps">
            <p><strong>Customer Reviews & Ratings:</strong></p>
            <ul>
              <li>View all customer feedback and ratings</li>
              <li>Read detailed comments about your services</li>
              <li>Monitor service quality and worker performance</li>
              <li>Respond to customer concerns if needed</li>
            </ul>
            <div className="interactive-demo">
              <div className="demo-screen feedback-demo">
                <h4>Customer Feedback</h4>
                <div className="feedback-card">
                  <div className="feedback-header">
                    <div className="rating">
                      <span className="stars">⭐⭐⭐⭐⭐</span>
                      <strong>5.0/5</strong>
                    </div>
                    <span className="feedback-date">2 days ago</span>
                  </div>
                  <div className="feedback-content">
                    <div className="customer-info">
                      <div className="customer-avatar">👤</div>
                      <div>
                        <strong>Priya Mehta</strong>
                        <p>Service: Fan Repair (Basic)</p>
                      </div>
                    </div>
                    <div className="feedback-text">
                      <p>"Excellent fan repair service! Amit was very professional and fixed the issue quickly. Highly recommended!"</p>
                    </div>
                    <div className="feedback-meta">
                      <span>👷 Worker: Amit Kumar</span>
                      <span>💰 Amount: ₹200</span>
                    </div>
                  </div>
                </div>
                <div className="feedback-card">
                  <div className="feedback-header">
                    <div className="rating">
                      <span className="stars">⭐⭐⭐⭐</span>
                      <strong>4.0/5</strong>
                    </div>
                    <span className="feedback-date">5 days ago</span>
                  </div>
                  <div className="feedback-content">
                    <div className="customer-info">
                      <div className="customer-avatar">👤</div>
                      <div>
                        <strong>Rahul Sharma</strong>
                        <p>Service: Electrical Wiring</p>
                      </div>
                    </div>
                    <div className="feedback-text">
                      <p>"Good service, arrived on time. Could improve communication."</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Payments Section */}
        <section className="guide-section">
          <h2>💰 9. Payments Section</h2>
          <div className="guide-steps">
            <p><strong>Revenue & Payment Tracking:</strong></p>
            <ul>
              <li>View all payment transactions</li>
              <li>See customer payment details</li>
              <li>Track total revenue (daily/monthly/yearly)</li>
              <li>Download payment reports for accounting</li>
            </ul>
            <div className="interactive-demo">
              <div className="demo-screen payments-demo">
                <h4>Payment Dashboard</h4>
                <div className="payment-stats">
                  <div className="payment-card">
                    <span className="payment-icon">💳</span>
                    <div>
                      <p>Today's Revenue</p>
                      <strong>₹1,200</strong>
                    </div>
                  </div>
                  <div className="payment-card">
                    <span className="payment-icon">📊</span>
                    <div>
                      <p>This Month</p>
                      <strong>₹25,400</strong>
                    </div>
                  </div>
                  <div className="payment-card">
                    <span className="payment-icon">📈</span>
                    <div>
                      <p>Total Transactions</p>
                      <strong>127</strong>
                    </div>
                  </div>
                  <div className="payment-card">
                    <span className="payment-icon">💰</span>
                    <div>
                      <p>Average Order</p>
                      <strong>₹200</strong>
                    </div>
                  </div>
                </div>
                <div className="transactions-list">
                  <h5>Recent Transactions</h5>
                  <div className="transaction-item">
                    <div>
                      <strong>Fan Repair</strong>
                      <p>Rahul Sharma</p>
                    </div>
                    <div className="transaction-amount">
                      <strong>₹200</strong>
                      <span className="badge success">Paid</span>
                    </div>
                  </div>
                  <div className="transaction-item">
                    <div>
                      <strong>Electrical Wiring</strong>
                      <p>Priya Mehta</p>
                    </div>
                    <div className="transaction-amount">
                      <strong>₹500</strong>
                      <span className="badge success">Paid</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Settings Section */}
        <section className="guide-section">
          <h2>⚙️ 10. Settings Section</h2>
          <div className="guide-steps">
            <p><strong>Company Profile Management:</strong></p>
            <ul>
              <li><strong>Update Company Details:</strong> Name, address, contact info</li>
              <li><strong>Notification Settings:</strong> Email/SMS preferences</li>
              <li><strong>Change Password:</strong> Update login credentials</li>
              <li><strong>Business Hours:</strong> Set operating schedule</li>
            </ul>
          </div>
        </section>

        {/* Quick Start Flow */}
        <section className="guide-section quick-start">
          <h2>🚀 Complete Setup Flow</h2>
          <div className="flow-steps">
            <div className="flow-step">
              <h4>1️⃣ SETUP</h4>
              <p>Categories → Services → Packages</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step">
              <h4>2️⃣ ADD WORKERS</h4>
              <p>Technicians → Assign Services</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step">
              <h4>3️⃣ GO ONLINE</h4>
              <p>Slots → Toggle Online</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-step">
              <h4>4️⃣ MANAGE</h4>
              <p>Bookings → Complete → Monitor</p>
            </div>
          </div>
        </section>

        {/* Tips Section */}
        <section className="guide-section tips">
          <h2>💡 Pro Tips</h2>
          <div className="tips-grid">
            <div className="tip-card">
              <h4>🎯 Best Practices</h4>
              <ul>
                <li>Keep your company status "Online" during business hours</li>
                <li>Respond to bookings within 15 minutes</li>
                <li>Assign skilled workers to appropriate services</li>
              </ul>
            </div>
            <div className="tip-card">
              <h4>📈 Increase Bookings</h4>
              <ul>
                <li>Offer competitive package pricing</li>
                <li>Maintain high service quality</li>
                <li>Respond quickly to customer requests</li>
              </ul>
            </div>
            <div className="tip-card">
              <h4>⚠️ Common Issues</h4>
              <ul>
                <li>Services not visible? Check worker assignments</li>
                <li>No bookings? Verify you're online</li>
                <li>Payment issues? Contact Ninja support</li>
              </ul>
            </div>
          </div>
        </section>

      </div>

      <div className="guide-footer">
        <p>Need help? Contact Ninja Deliveries Support</p>
        <p>📧 admin@ninjadeliveries.com | 📱 (+91)-82191-05753</p>
        <p>📍 Dharamshala, Himachal Pradesh, India</p>
      </div>
    </div>
  );
};

export default UserGuide;