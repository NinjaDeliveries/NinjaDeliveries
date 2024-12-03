import { useState } from "react";
import { firestore } from "../context/Firebase";
import "../style/promocode.css";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";

export default function BusinessRegistration() {
  const [Name, setName] = useState("");
  const [Type, setType] = useState("Choose...");
  const [Number, setNumber] = useState("");
  const [In, setIn] = useState("");
  const [Out, setOut] = useState("");
  const [isAvailable, setisAvailable] = useState(false);
  const [Image, setImage] = useState(null);
  const [menuImage, setmenuImage] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [menuImageUrl, setMenuImageUrl] = useState("");
  const storage = getStorage();
  const navigate = useNavigate();
  const InChange = (e) => {
    setIn(e.target.value);
  };
  const OutChange = (e) => {
    setOut(e.target.value);
  };

  const handleSelect = (e) => {
    setType(e.target.value);
  };
  const handleImageChange = (event) => {
    setImage(event.target.files[0]);
  };

  const handleMenuImageChange = (event) => {
    setmenuImage(event.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // const imageRef = ref(storage, `images/${Image.name}`);
      // const menuImageRef = ref(storage, `menu-images/${menuImage.name}`);
      // await uploadBytes(imageRef, Image);
      // await uploadBytes(menuImageRef, menuImage);
      // const imageUrl = await getDownloadURL(imageRef);
      // const menuImageUrl = await getDownloadURL(menuImageRef);
      // setImageUrl(imageUrl);
      // setMenuImageUrl(menuImageUrl);
      await addDoc(collection(firestore, "businessDetails"), {
        name: Name,
        type: Type,
        phoneNumber: Number,
        inTime: In,
        outTime: Out,
        isAvailable: isAvailable,
        // image: imageUrl,
        // menuImage: menuImageUrl,
      });
      toast("Business Registration is Successful!", {
        type: "success",
        position: "top-center",
      });
      navigate("/home");
    } catch (error) {
      console.error("Error sending data : ", error);
    }
  };

  return (
    <div>
      <h2 className="heading1">Business Registration</h2>
      <div className="form1">
        <form className="row g-3 container">
          <div className="col-md-4">
            <label htmlFor="validationDefault01" className="form-label">
              Business Name
            </label>
            <input
              type="text"
              className="form-control"
              id="validationDefault01"
              value={Name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="col-md-3">
            <label htmlFor="validationDefault04" className="form-label">
              Business Type
            </label>
            <select
              value={Type}
              onChange={handleSelect}
              className="form-select"
              id="validationDefault04"
              required
            >
              <option disabled>Choose...</option>
              <option value="Grocery">Grocery</option>
              <option value="Medicine">Medicine</option>
              <option value="Store">Store</option>
              <option value="Vegetable Store">Vegetable Store</option>
              <option value="Restaurant">Restaurant</option>
            </select>
          </div>

          <div className="col-md-4">
            <label htmlFor="validationDefault02" className="form-label">
              Phone Number
            </label>
            <input
              type="number"
              className="form-control"
              value={Number}
              onChange={(e) => setNumber(e.target.value)}
              id="validationDefault02"
              required
            />
          </div>

          <div className="col-md-4">
            <label htmlFor="validationDefault02" className="form-label">
              In Time
            </label>
            <input
              type="time"
              className="form-control"
              id="validationDefault02"
              value={In}
              onChange={InChange}
              required
            />
          </div>

          <div className="col-md-4">
            <label htmlFor="validationDefault02" className="form-label">
              Out Time
            </label>
            <input
              type="time"
              value={Out}
              onChange={OutChange}
              className="form-control"
              id="validationDefault02"
              required
            />
          </div>
          {/* <div className="">
            <label htmlFor="formFile" className="form-label">
              Upload Business Image
            </label>
            <input
              className="form-control"
              onChange={handleImageChange}
              type="file"
              id="formFile"
            />
          </div>
          <div className="">
            <label htmlFor="formFile" className="form-label">
              Upload Menu Image
            </label>
            <input
              className="form-control"
              onChange={handleMenuImageChange}
              type="file"
              id="formFile"
            />
          </div> */}
          <div className="form-check form-switch mx-2">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="flexSwitchCheckChecked"
              onChange={() => {
                if (isAvailable === false) {
                  setisAvailable(true);
                } else {
                  setisAvailable(false);
                }
              }}
              checked={isAvailable === true}
            />
            <label
              className="form-check-label"
              htmlFor="flexSwitchCheckChecked"
            >
              Available
            </label>
          </div>
          <div className="col-12">
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              type="submit"
              disabled={
                Name.length === 0 ||
                Type === "Choose..." ||
                Number.length === 0 ||
                In.length === 0 ||
                Out.length === 0 ||
                isAvailable === null
              }
            >
              Submit form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
