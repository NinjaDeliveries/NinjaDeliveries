import { useEffect, useState } from "react";
import { db } from "../context/Firebase"; // Ensure Firebase is configured
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Button,
  Typography,
} from "@mui/material";

const UpdateSubCategory = () => {
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [eventEnabled, setEventEnabled] = useState(false);

  useEffect(() => {
    const fetchSubcategories = async () => {
      const querySnapshot = await getDocs(collection(db, "subcategories"));
      const items = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSubcategories(items);
      if (items.length > 0) {
        setSelectedSubcategory(items[0].id);
      }
    };

    fetchSubcategories();
  }, []);

  useEffect(() => {
    const fetchEventEnabled = async () => {
      if (!selectedSubcategory) return;
      try {
        const subcategoryRef = doc(db, "subcategories", selectedSubcategory);
        const subcategorySnap = await getDoc(subcategoryRef);
        if (subcategorySnap.exists()) {
          setEventEnabled(subcategorySnap.data().eventEnabled || false);
        }
      } catch (error) {
        console.error("Error fetching eventEnabled:", error);
      }
    };

    fetchEventEnabled();
  }, [selectedSubcategory]); // Re-fetch eventEnabled whenever selectedSubcategory changes

  const handleSubcategoryChange = (event) => {
    setSelectedSubcategory(event.target.value);
  };

  const handleToggleChange = () => {
    setEventEnabled((prev) => !prev);
  };

  const handleSave = async () => {
    if (!selectedSubcategory) return;

    try {
      await updateDoc(doc(db, "subcategories", selectedSubcategory), {
        eventEnabled: eventEnabled,
      });
      alert("Changes saved successfully!");
    } catch (error) {
      console.error("Error updating document:", error);
      alert("Failed to save changes.");
    }
  };

  return (
    <div className="container" style={{ padding: "20px", maxWidth: "400px" }}>
      <Typography variant="h6">Select Subcategory</Typography>
      <FormControl fullWidth>
        <InputLabel>Subcategory</InputLabel>
        <Select value={selectedSubcategory} onChange={handleSubcategoryChange}>
          {subcategories.map((sub) => (
            <MenuItem key={sub.id} value={sub.id}>
              {sub.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <div style={{ display: "flex", alignItems: "center", marginTop: "20px" }}>
        <Typography>Event Enabled</Typography>
        <Switch checked={eventEnabled} onChange={handleToggleChange} />
      </div>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleSave}
        style={{ marginTop: "20px" }}
      >
        Save Changes
      </Button>
    </div>
  );
};

export default UpdateSubCategory;
