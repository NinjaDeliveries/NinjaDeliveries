import { useEffect, useState } from "react";
import { db } from "../context/Firebase"; // Ensure Firebase is configured
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { useUser } from "../context/adminContext";

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
  const { user } = useUser();
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [eventEnabled, setEventEnabled] = useState(false);

  useEffect(() => {
    const fetchSubcategories = async () => {
      const q = query(
        collection(db, "subcategories"),
        where("storeId", "==", user.storeId)
      );
      const querySnapshot = await getDocs(q);
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
    <div className="container p-5 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <Typography variant="h6" className="mb-4 text-gray-800 font-semibold">
        Select Subcategory
      </Typography>

      <FormControl fullWidth className="mb-6">
        <InputLabel className="text-gray-600">Subcategory</InputLabel>
        <Select
          value={selectedSubcategory}
          onChange={handleSubcategoryChange}
          className="bg-gray-50 rounded-md"
        >
          {subcategories.map((sub) => (
            <MenuItem key={sub.id} value={sub.id} className="hover:bg-gray-100">
              {sub.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 rounded-lg">
        <Typography className="text-gray-700 font-medium">
          Event Enabled
        </Typography>
        <Switch
          checked={eventEnabled}
          onChange={handleToggleChange}
          color="primary"
        />
      </div>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleSave}
        className="py-3 text-lg font-medium rounded-lg shadow hover:shadow-md transition-all"
      >
        Save Changes
      </Button>
    </div>
  );
};

export default UpdateSubCategory;
