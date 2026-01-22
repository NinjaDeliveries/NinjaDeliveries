const Overview = ({ serviceData }) => {
  return (
    <>
      <div className="sd-header">
        <h1>Welcome</h1>
        <p>SERVICE ACCOUNT</p>
      </div>

      <div className="sd-cards">
        <div className="sd-card">
          <div className="sd-card-title">Active Bookings</div>
          <div className="sd-card-value blue">0</div>
        </div>

        <div className="sd-card">
          <div className="sd-card-title">Pending Requests</div>
          <div className="sd-card-value yellow">0</div>
        </div>

        <div className="sd-card">
          <div className="sd-card-title">Revenue Today</div>
          <div className="sd-card-value green">₹0</div>
        </div>

        <div className="sd-card">
          <div className="sd-card-title">Account Status</div>
          <div className="sd-card-value purple">ACTIVE</div>
        </div>
      </div>
    </>
  );
};

export default Overview;