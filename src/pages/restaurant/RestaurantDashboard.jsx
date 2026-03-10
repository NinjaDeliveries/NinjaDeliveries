import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../context/Firebase";
import { doc, getDoc } from "firebase/firestore";
import styled from "styled-components";

const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const [restaurantData, setRestaurantData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        const restaurantRef = doc(db, "registerRestaurant", user.uid);
        const restaurantSnap = await getDoc(restaurantRef);

        if (restaurantSnap.exists()) {
          setRestaurantData(restaurantSnap.data());
        } else {
          // If no restaurant data found, redirect to login
          navigate("/login");
        }
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
        <p>Loading restaurant dashboard...</p>
      </LoadingContainer>
    );
  }

  if (!restaurantData) {
    return (
      <ErrorContainer>
        <h2>Restaurant not found</h2>
        <button onClick={() => navigate("/login")}>Go to Login</button>
      </ErrorContainer>
    );
  }

  return (
    <DashboardContainer>
      <Header>
        <HeaderContent>
          <h1>🍽️ {restaurantData.restaurantName}</h1>
          <p>Restaurant Dashboard</p>
        </HeaderContent>
        <HeaderButtons>
          <SettingsButton onClick={() => navigate("/restaurant-settings")}>
            ⚙️ Settings
          </SettingsButton>
          <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
        </HeaderButtons>
      </Header>

      <MainContent>
        <InfoCard>
          <CardTitle>Restaurant Information</CardTitle>
          <InfoGrid>
            <InfoItem>
              <Label>Owner Name:</Label>
              <Value>{restaurantData.ownerName}</Value>
            </InfoItem>
            <InfoItem>
              <Label>Email:</Label>
              <Value>{restaurantData.email}</Value>
            </InfoItem>
            <InfoItem>
              <Label>Phone:</Label>
              <Value>{restaurantData.phone}</Value>
            </InfoItem>
            <InfoItem>
              <Label>Address:</Label>
              <Value>{restaurantData.address || "Not provided"}</Value>
            </InfoItem>
            <InfoItem>
              <Label>Status:</Label>
              <StatusBadge isActive={restaurantData.isActive}>
                {restaurantData.isActive ? "Open" : "Closed"}
              </StatusBadge>
            </InfoItem>
            <InfoItem>
              <Label>Account Status:</Label>
              <StatusBadge isActive={restaurantData.accountEnabled}>
                {restaurantData.accountEnabled ? "Enabled" : "Disabled"}
              </StatusBadge>
            </InfoItem>
          </InfoGrid>
        </InfoCard>

        <ActionsCard>
          <CardTitle>Quick Actions</CardTitle>
          <ActionGrid>
            <ActionButton onClick={() => alert("Menu management coming soon!")}>
              📋 Manage Menu
            </ActionButton>
            <ActionButton onClick={() => alert("Orders coming soon!")}>
              📦 View Orders
            </ActionButton>
            <ActionButton onClick={() => navigate("/restaurant-settings")}>
              ⚙️ Restaurant Settings
            </ActionButton>
            <ActionButton onClick={() => alert("Analytics coming soon!")}>
              📊 View Analytics
            </ActionButton>
          </ActionGrid>
        </ActionsCard>

        <ComingSoonCard>
          <CardTitle>Coming Soon Features</CardTitle>
          <ComingSoonList>
            <li>📱 Online Order Management</li>
            <li>💰 Payment Processing</li>
            <li>👥 Staff Management</li>
            <li>📈 Sales Reports</li>
            <li>⭐ Customer Reviews</li>
          </ComingSoonList>
        </ComingSoonCard>
      </MainContent>

      <Footer>
        <p>© {new Date().getFullYear()} {restaurantData.restaurantName} - Restaurant Dashboard</p>
        <p>Powered by Ninja Deliveries</p>
      </Footer>
    </DashboardContainer>
  );
};

// Styled Components
const DashboardContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #fdf6e3 0%, #f8e8c8 100%);
  font-family: 'Segoe UI', system-ui, sans-serif;
`;

const Header = styled.header`
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(251, 146, 60, 0.3);
`;

const HeaderContent = styled.div`
  h1 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
  }
  
  p {
    margin: 0.25rem 0 0 0;
    opacity: 0.9;
    font-size: 0.9rem;
  }
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const SettingsButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }
`;

const LogoutButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }
`;

const MainContent = styled.main`
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
  display: grid;
  gap: 2rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(251, 146, 60, 0.1);
`;

const InfoCard = styled(Card)``;

const ActionsCard = styled(Card)``;

const ComingSoonCard = styled(Card)`
  background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
`;

const CardTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
  border-bottom: 2px solid #fb923c;
  padding-bottom: 0.5rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.span`
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
`;

const Value = styled.span`
  font-size: 1.1rem;
  color: #1f2937;
  font-weight: 600;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${props => props.isActive ? '#10b981' : '#ef4444'};
  color: white;
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(251, 146, 60, 0.4);
  }
  
  &:active {
    transform: translateY(-1px);
  }
`;

const ComingSoonList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  
  li {
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(251, 146, 60, 0.2);
    font-size: 1.1rem;
    color: #4b5563;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:before {
      content: "→";
      margin-right: 0.75rem;
      color: #fb923c;
      font-weight: bold;
    }
  }
`;

const Footer = styled.footer`
  text-align: center;
  padding: 2rem;
  color: #6b7280;
  font-size: 0.9rem;
  border-top: 1px solid #e5e7eb;
  background: white;
  
  p {
    margin: 0.25rem 0;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #fdf6e3 0%, #f8e8c8 100%);
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid #fb923c;
  border-top: 4px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #fdf6e3 0%, #f8e8c8 100%);
  
  h2 {
    color: #ef4444;
    margin-bottom: 1rem;
  }
  
  button {
    background: #fb923c;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    
    &:hover {
      background: #f97316;
    }
  }
`;

export default RestaurantDashboard;