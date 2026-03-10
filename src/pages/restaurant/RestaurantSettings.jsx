import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../context/Firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import styled from "styled-components";

const RestaurantSettings = () => {
  const navigate = useNavigate();
  const [restaurantData, setRestaurantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    restaurantName: "",
    ownerName: "",
    phone: "",
    address: "",
    isActive: true,
  });

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
          const data = restaurantSnap.data();
          setRestaurantData(data);
          setFormData({
            restaurantName: data.restaurantName || "",
            ownerName: data.ownerName || "",
            phone: data.phone || "",
            address: data.address || "",
            isActive: data.isActive !== false,
          });
        } else {
          navigate("/restaurant-dashboard");
        }
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      const restaurantRef = doc(db, "registerRestaurant", user.uid);
      await updateDoc(restaurantRef, {
        ...formData,
        updatedAt: new Date(),
      });

      alert("Settings saved successfully!");
      navigate("/restaurant-dashboard");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/restaurant-dashboard");
  };

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
        <p>Loading settings...</p>
      </LoadingContainer>
    );
  }

  return (
    <SettingsContainer>
      <Header>
        <BackButton onClick={() => navigate("/restaurant-dashboard")}>
          ← Back to Dashboard
        </BackButton>
        <h1>⚙️ Restaurant Settings</h1>
        <p>Manage your restaurant information</p>
      </Header>

      <MainContent>
        <SettingsCard>
          <CardTitle>Basic Information</CardTitle>
          
          <FormGroup>
            <Label htmlFor="restaurantName">Restaurant Name *</Label>
            <Input
              id="restaurantName"
              name="restaurantName"
              value={formData.restaurantName}
              onChange={handleInputChange}
              placeholder="Enter restaurant name"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="ownerName">Owner Name *</Label>
            <Input
              id="ownerName"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleInputChange}
              placeholder="Enter owner name"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="address">Address</Label>
            <TextArea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter restaurant address"
              rows="3"
            />
          </FormGroup>

          <FormGroup>
            <CheckboxContainer>
              <Checkbox
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
              />
              <CheckboxLabel htmlFor="isActive">
                Restaurant is open for business
              </CheckboxLabel>
            </CheckboxContainer>
            <HelpText>
              When unchecked, customers won't be able to place orders
            </HelpText>
          </FormGroup>

          <ButtonGroup>
            <CancelButton onClick={handleCancel} disabled={saving}>
              Cancel
            </CancelButton>
            <SaveButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </SaveButton>
          </ButtonGroup>
        </SettingsCard>

        <InfoCard>
          <CardTitle>Account Information</CardTitle>
          <InfoList>
            <InfoItem>
              <InfoLabel>Email:</InfoLabel>
              <InfoValue>{restaurantData?.email}</InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>Account Created:</InfoLabel>
              <InfoValue>
                {restaurantData?.createdAt?.toDate?.().toLocaleDateString() || "N/A"}
              </InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>Last Updated:</InfoLabel>
              <InfoValue>
                {restaurantData?.updatedAt?.toDate?.().toLocaleDateString() || "N/A"}
              </InfoValue>
            </InfoItem>
            <InfoItem>
              <InfoLabel>Account Status:</InfoLabel>
              <StatusBadge isActive={restaurantData?.accountEnabled}>
                {restaurantData?.accountEnabled ? "Enabled" : "Disabled"}
              </StatusBadge>
            </InfoItem>
          </InfoList>
          <HelpText>
            Note: Account status can only be changed by admin. Contact support if needed.
          </HelpText>
        </InfoCard>
      </MainContent>
    </SettingsContainer>
  );
};

// Styled Components
const SettingsContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #fdf6e3 0%, #f8e8c8 100%);
  font-family: 'Segoe UI', system-ui, sans-serif;
`;

const Header = styled.header`
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  color: white;
  padding: 1.5rem 2rem;
  position: relative;
  
  h1 {
    margin: 0.5rem 0 0.25rem 0;
    font-size: 1.8rem;
    font-weight: 700;
  }
  
  p {
    margin: 0;
    opacity: 0.9;
    font-size: 0.9rem;
  }
`;

const BackButton = styled.button`
  position: absolute;
  top: 1.5rem;
  left: 2rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateX(-2px);
  }
`;

const MainContent = styled.main`
  max-width: 800px;
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

const SettingsCard = styled(Card)``;

const InfoCard = styled(Card)`
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

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #fb923c;
    box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.1);
  }
  
  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.3s ease;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #fb923c;
    box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.1);
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  
  &:checked {
    accent-color: #fb923c;
  }
`;

const CheckboxLabel = styled.label`
  font-weight: 600;
  color: #374151;
  cursor: pointer;
`;

const HelpText = styled.p`
  margin: 0.5rem 0 0 0;
  font-size: 0.85rem;
  color: #6b7280;
  font-style: italic;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background: #f3f4f6;
  color: #374151;
  
  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
`;

const SaveButton = styled(Button)`
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  color: white;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(251, 146, 60, 0.4);
  }
`;

const InfoList = styled.div`
  display: grid;
  gap: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(251, 146, 60, 0.2);
  
  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-weight: 600;
  color: #4b5563;
`;

const InfoValue = styled.span`
  color: #1f2937;
  font-weight: 500;
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

export default RestaurantSettings;