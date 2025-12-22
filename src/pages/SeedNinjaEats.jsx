import React, { useState } from "react";
import { db } from "../context/Firebase";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import "../style/AddCategory.css";

const cities = [
  {
    id: "dharamshala",
    data: {
      name: "Dharamshala",
      state: "Himachal Pradesh",
      country: "India",
      isActive: true,
      displayOrder: 1,
      searchTags: ["dharamshala", "dharamsala", "kangra", "hp"],
    },
  },
];

const cuisines = [
  {
    id: "himachali",
    data: {
      name: "Himachali",
      priority: 1,
      iconUrl: "https://picsum.photos/seed/himachali/200/200",
    },
  },
  {
    id: "north-indian",
    data: {
      name: "North Indian",
      priority: 2,
      iconUrl: "https://picsum.photos/seed/north-indian/200/200",
    },
  },
  {
    id: "chinese",
    data: {
      name: "Chinese",
      priority: 3,
      iconUrl: "https://picsum.photos/seed/chinese/200/200",
    },
  },
  {
    id: "tibetan",
    data: {
      name: "Tibetan",
      priority: 4,
      iconUrl: "https://picsum.photos/seed/tibetan/200/200",
    },
  },
  {
    id: "cafe-bakery",
    data: {
      name: "Café & Bakery",
      priority: 5,
      iconUrl: "https://picsum.photos/seed/cafe-bakery/200/200",
    },
  },
  {
    id: "biryani",
    data: {
      name: "Biryani",
      priority: 6,
      iconUrl: "https://picsum.photos/seed/biryani/200/200",
    },
  },
  {
    id: "desserts",
    data: {
      name: "Desserts",
      priority: 7,
      iconUrl: "https://picsum.photos/seed/desserts/200/200",
    },
  },
  {
    id: "fast-food",
    data: {
      name: "Fast Food",
      priority: 8,
      iconUrl: "https://picsum.photos/seed/fast-food/200/200",
    },
  },
  {
    id: "mughlai",
    data: {
      name: "Mughlai",
      priority: 9,
      iconUrl: "https://picsum.photos/seed/mughlai/200/200",
    },
  },
];

const restaurants = [
  {
    id: "hillside-thali-house",
    data: {
      name: "Hillside Thali House",
      cityId: "dharamshala",
      areaId: "kotwali-bazar",
      isActive: true,

      heroImageUrl: "https://picsum.photos/seed/hillside-thali/800/600",
      cuisines: ["Himachali", "North Indian"],
      rating: 4.6,
      ratingCount: 230,
      deliveryTimeMin: 25,
      deliveryTimeMax: 35,
      costForTwo: 350,
      isPureVeg: true,
      offerText: "FLAT 20% off | Use NINJA20",
      distanceKm: 2.3,
      isPromoted: true,

      tags: ["thali", "pahadi", "home-style"],
      minOrderValue: 150,
      isOpen: true,

      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    id: "momos-and-more",
    data: {
      name: "Momos & More",
      cityId: "dharamshala",
      areaId: "mcleodganj",
      isActive: true,

      heroImageUrl: "https://picsum.photos/seed/momos-more/800/600",
      cuisines: ["Tibetan", "Chinese", "Fast Food"],
      rating: 4.3,
      ratingCount: 140,
      deliveryTimeMin: 20,
      deliveryTimeMax: 30,
      costForTwo: 250,
      isPureVeg: false,
      offerText: "Free momos on orders above ₹399",
      distanceKm: 1.4,
      isPromoted: false,

      tags: ["momos", "noodles", "quick-bites"],
      minOrderValue: 150,
      isOpen: true,

      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    id: "cloud-cafe-bakery",
    data: {
      name: "Cloud Café & Bakery",
      cityId: "dharamshala",
      areaId: "dari",
      isActive: true,

      heroImageUrl: "https://picsum.photos/seed/cloud-cafe/800/600",
      // match cuisine names exactly with cuisines[] above
      cuisines: ["Café & Bakery", "Desserts"],
      rating: 4.8,
      ratingCount: 320,
      deliveryTimeMin: 30,
      deliveryTimeMax: 40,
      costForTwo: 500,
      isPureVeg: true,
      offerText: "₹100 off above ₹599",
      distanceKm: 3.1,
      isPromoted: true,

      tags: ["coffee", "cake", "work-friendly"],
      minOrderValue: 200,
      isOpen: true,

      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    id: "pahadi-biryani-corner",
    data: {
      name: "Pahadi Biryani Corner",
      cityId: "dharamshala",
      areaId: "sheela-chowk",
      isActive: true,

      heroImageUrl: "https://picsum.photos/seed/pahadi-biryani/800/600",
      cuisines: ["Biryani", "Mughlai"],
      rating: 4.1,
      ratingCount: 95,
      deliveryTimeMin: 35,
      deliveryTimeMax: 45,
      costForTwo: 400,
      isPureVeg: false,
      offerText: "Buy 1 Get 1 on Wednesdays",
      distanceKm: 4.0,
      isPromoted: false,

      tags: ["biryani", "non-veg", "family-meals"],
      minOrderValue: 250,
      isOpen: true,

      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
];

/**
 * Menu items for each restaurant.
 * These will be written to:
 *   restaurants/{restaurantId}/menuItems/{menuItemId}
 */
const restaurantMenus: {
  [restaurantId: string]: {
    id: string;
    data: {
      name: string;
      description?: string;
      price: number;
      isVeg?: boolean;
      inStock?: boolean;
      isBestSeller?: boolean;
      category?: string;
      imageUrl?: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
  }[];
} = {
  "hillside-thali-house": [
    {
      id: "pahadi-veg-thali",
      data: {
        name: "Pahadi Veg Thali",
        description:
          "Home-style Himachali veg thali with dal, seasonal sabzi, siddu, rice, salad & achar.",
        price: 220,
        isVeg: true,
        inStock: true,
        isBestSeller: true,
        category: "Recommended",
        imageUrl: "https://picsum.photos/seed/pahadi-thali/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "rajma-chawal-plate",
      data: {
        name: "Rajma Chawal Plate",
        description: "Comfort classic with rajma, rice, salad & papad.",
        price: 180,
        isVeg: true,
        inStock: true,
        isBestSeller: false,
        category: "Mains",
        imageUrl: "https://picsum.photos/seed/rajma-chawal/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "siddu-with-ghee",
      data: {
        name: "Siddu with Ghee",
        description: "Steamed Himachali buns served with desi ghee & chutney.",
        price: 120,
        isVeg: true,
        inStock: true,
        isBestSeller: true,
        category: "Snacks",
        imageUrl: "https://picsum.photos/seed/siddu/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],

  "momos-and-more": [
    {
      id: "veg-steam-momos-8pc",
      data: {
        name: "Veg Steam Momos (8 pc)",
        description: "Soft momos stuffed with veggies, served with spicy chutney.",
        price: 110,
        isVeg: true,
        inStock: true,
        isBestSeller: true,
        category: "Momos",
        imageUrl: "https://picsum.photos/seed/veg-momos/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "chicken-steam-momos-8pc",
      data: {
        name: "Chicken Steam Momos (8 pc)",
        description: "Juicy chicken momos, perfectly steamed.",
        price: 140,
        isVeg: false,
        inStock: true,
        isBestSeller: true,
        category: "Momos",
        imageUrl: "https://picsum.photos/seed/chicken-momos/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "veg-thukpa",
      data: {
        name: "Veg Thukpa",
        description: "Warm noodle soup with vegetables in Tibetan style.",
        price: 150,
        isVeg: true,
        inStock: true,
        isBestSeller: false,
        category: "Bowls",
        imageUrl: "https://picsum.photos/seed/veg-thukpa/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "chowmein-veg",
      data: {
        name: "Veg Chowmein",
        description: "Street-style stir fried noodles with veggies.",
        price: 130,
        isVeg: true,
        inStock: true,
        isBestSeller: false,
        category: "Fast Food",
        imageUrl: "https://picsum.photos/seed/veg-chowmein/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],

  "cloud-cafe-bakery": [
    {
      id: "cappuccino-regular",
      data: {
        name: "Cappuccino (Regular)",
        description: "Freshly brewed coffee with steamed milk & foam.",
        price: 160,
        isVeg: true,
        inStock: true,
        isBestSeller: false,
        category: "Hot Beverages",
        imageUrl: "https://picsum.photos/seed/cappuccino/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "cold-coffee-classic",
      data: {
        name: "Classic Cold Coffee",
        description: "Chilled coffee with ice cream, thick & creamy.",
        price: 190,
        isVeg: true,
        inStock: true,
        isBestSeller: true,
        category: "Cold Beverages",
        imageUrl: "https://picsum.photos/seed/cold-coffee/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "choco-truffle-pastry",
      data: {
        name: "Chocolate Truffle Pastry",
        description: "Rich chocolate pastry with ganache.",
        price: 130,
        isVeg: true,
        inStock: true,
        isBestSeller: true,
        category: "Desserts",
        imageUrl: "https://picsum.photos/seed/choco-truffle/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "garlic-bread-cheese",
      data: {
        name: "Cheesy Garlic Bread",
        description: "Toasted bread with garlic butter & cheese.",
        price: 150,
        isVeg: true,
        inStock: true,
        isBestSeller: false,
        category: "Snacks",
        imageUrl: "https://picsum.photos/seed/garlic-bread/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],

  "pahadi-biryani-corner": [
    {
      id: "chicken-biryani-half",
      data: {
        name: "Chicken Biryani (Half)",
        description: "Aromatic basmati rice cooked with chicken & spices.",
        price: 220,
        isVeg: false,
        inStock: true,
        isBestSeller: true,
        category: "Biryani",
        imageUrl: "https://picsum.photos/seed/chicken-biryani/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "chicken-biryani-full",
      data: {
        name: "Chicken Biryani (Full)",
        description: "Serves 2 – loaded with chicken & masala.",
        price: 340,
        isVeg: false,
        inStock: true,
        isBestSeller: true,
        category: "Biryani",
        imageUrl: "https://picsum.photos/seed/chicken-biryani-full/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "veg-biryani",
      data: {
        name: "Veg Biryani",
        description: "Layered rice with veggies & mild spices.",
        price: 200,
        isVeg: true,
        inStock: true,
        isBestSeller: false,
        category: "Biryani",
        imageUrl: "https://picsum.photos/seed/veg-biryani/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "raita-bowl",
      data: {
        name: "Boondi Raita",
        description: "Curd with boondi & mild spices.",
        price: 70,
        isVeg: true,
        inStock: true,
        isBestSeller: false,
        category: "Sides",
        imageUrl: "https://picsum.photos/seed/raita/400/300",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
};

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

const SeedNinjaEats = () => {
  const [loading, setLoading] = useState(false);

  const seedCollection = async (collectionName: string, docs: any[]) => {
    for (const docDef of docs) {
      const ref = doc(db, collectionName, docDef.id);
      await setDoc(ref, docDef.data, { merge: true }); // idempotent
      console.log(`✓ ${collectionName}/${docDef.id}`);
    }
  };

  const seedRestaurantMenus = async () => {
    for (const [restaurantId, items] of Object.entries(restaurantMenus)) {
      for (const item of items) {
        const ref = doc(
          db,
          "restaurants",
          restaurantId,
          "menuItems",
          item.id
        );
        await setDoc(ref, item.data, { merge: true });
        console.log(
          `✓ restaurants/${restaurantId}/menuItems/${item.id}`
        );
      }
    }
  };

  const handleSeed = async () => {
    if (!window.confirm("Seed demo NinjaEats data for Dharamshala?")) return;

    setLoading(true);
    try {
      await seedCollection("cities", cities);
      await seedCollection("cuisines", cuisines);
      await seedCollection("restaurants", restaurants);
      await seedRestaurantMenus();

      toast.success("NinjaEats demo data (cities, cuisines, restaurants + menus) seeded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to seed NinjaEats data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="categories-management-container">
      {loading && <div className="loading-overlay">Seeding...</div>}

      <h2 className="management-header">NinjaEats – Seed Demo Data</h2>

      <div className="management-section">
        <p style={{ marginBottom: 12 }}>
          This will create / update <b>cities</b>, <b>cuisines</b>,{" "}
          <b>restaurants</b> and <b>menuItems</b> for{" "}
          <b>Dharamshala</b> in Firestore.
        </p>

        <ul style={{ marginBottom: 16, paddingLeft: 18 }}>
          <li>cities/dharamshala</li>
          <li>9 cuisines (Himachali, North Indian, Tibetan, etc.)</li>
          <li>4 demo restaurants mapped to cityId = "dharamshala"</li>
          <li>
            menuItems sub-collections under each restaurant with 3–4 dishes
            each
          </li>
        </ul>

        <button
          className="primary-button"
          onClick={handleSeed}
          disabled={loading}
        >
          {loading ? "Seeding..." : "Seed NinjaEats Demo Data"}
        </button>
      </div>
    </div>
  );
};

export default SeedNinjaEats;
