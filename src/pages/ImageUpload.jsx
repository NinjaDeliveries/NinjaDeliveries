// src/components/ImageUploader.js
import React, { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../context/Firebase";

const ImageUpload = () => {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState("");

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
    }
  };

  // Handle upload to Firebase Storage
  const handleUpload = () => {
    if (!image) return;

    // Get the actual file name
    const fileName = image.name;

    // Create a reference to Firebase Storage with the correct file name
    const storageRef = ref(storage, `images/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, image);

    // Monitor the upload progress
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progressPercentage = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(progressPercentage);
      },
      (error) => {
        console.error("Upload failed:", error);
      },
      () => {
        // Get the download URL after successful upload
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setImageUrl(downloadURL);
          setUploading(false);
        });
      }
    );

    setUploading(true);
  };

  return (
    <div className="image-uploader">
      <h1>Upload Image to Firebase</h1>

      {/* Image file input */}
      <input type="file" onChange={handleFileChange} />

      {/* Upload button */}
      <button onClick={handleUpload} disabled={uploading || !image}>
        {uploading ? "Uploading..." : "Upload Image"}
      </button>

      {/* Display progress bar */}
      {uploading && (
        <div>
          <p>Uploading: {progress}%</p>
          <progress value={progress} max="100" />
        </div>
      )}

      {/* Display uploaded image */}
      {imageUrl && (
        <div>
          <p>Image uploaded successfully!</p>
          <img src={imageUrl} alt="Uploaded" width="200" />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
