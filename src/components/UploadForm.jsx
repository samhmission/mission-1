import { useState, useRef } from "react";
import styles from "./UploadForm.module.css";
import axios from "axios";

const UploadForm = () => {
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null); // Preview for uploaded file
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState("");

  // Reference to the file input
  const fileInputRef = useRef();

  // Access environment variables
  const PREDICTION_KEY = import.meta.env.VITE_AZURE_PREDICTION_KEY;
  const ENDPOINT_URL = import.meta.env.VITE_AZURE_ENDPOINT_URL;
  const ENDPOINT_FILE = import.meta.env.VITE_AZURE_ENDPOINT_FILE;

  const baseCostOptions = {
    Truck: {
      insuranceCost: "$1200/year",
      financeOption: "52-month installment at $100/month",
    },
    Van: {
      insuranceCost: "$900/year",
      financeOption: "36-month installment at $90/month",
    },
    SUV: {
      insuranceCost: "$1100/year",
      financeOption: "36-month installment at $92/month",
    },
    Hatchback: {
      insuranceCost: "$800/year",
      financeOption: "28-month installment at $80/month",
    },
    Sedan: {
      insuranceCost: "$1000/year",
      financeOption: "28-month installment at $85/month",
    },
  };

  // Filter and process predictions
  const processPredictions = (sortedPredictions) => {
    if (sortedPredictions.length === 0) return [];

    const [topPrediction, secondPrediction] = sortedPredictions;
    const topProbability = topPrediction.probability;
    const secondProbability = secondPrediction?.probability || 0;

    // Calculate the percentage difference
    const percentageDifference =
      Math.abs(topProbability - secondProbability) * 100;

    if (
      percentageDifference <= 15 &&
      secondPrediction &&
      topPrediction.tagName !== secondPrediction.tagName
    ) {
      // Include both top and second predictions if conditions match
      return [topPrediction, secondPrediction];
    }

    // Otherwise, return only the top prediction
    return [topPrediction];
  };

  // Handle submission results
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setPredictions([]);

    try {
      let response;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        response = await axios.post(ENDPOINT_FILE, formData, {
          headers: {
            "Prediction-Key": PREDICTION_KEY,
            "Content-Type": "application/octet-stream",
          },
        });
      } else if (imageUrl) {
        response = await axios.post(
          ENDPOINT_URL,
          { Url: imageUrl },
          {
            headers: {
              "Prediction-Key": PREDICTION_KEY,
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        setError("Please provide an image URL or upload a file.");
        return;
      }

      // Sort predictions by probability
      const sortedPredictions = response.data.predictions.sort(
        (a, b) => b.probability - a.probability
      );

      // Filter predictions using the new logic
      const filteredPredictions = processPredictions(sortedPredictions);

      // Remove duplicates by vehicle type
      const uniquePredictions = [];
      const seenTypes = new Set();

      for (const prediction of filteredPredictions) {
        if (!seenTypes.has(prediction.tagName)) {
          uniquePredictions.push(prediction);
          seenTypes.add(prediction.tagName);
        }
      }

      setPredictions(uniquePredictions);
    } catch (err) {
      setError("Error making prediction. Please try again.");
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    // Generate a preview URL for the file
    if (selectedFile) {
      setFilePreview(URL.createObjectURL(selectedFile));
    } else {
      setFilePreview(null);
    }
  };

  const handleUrlChange = (e) => {
    setImageUrl(e.target.value);

    // Use the URL as the preview if it is valid
    setFilePreview(e.target.value);
  };

  const handleClear = () => {
    setFile(null);
    setImageUrl("");
    setFilePreview(null);
    setPredictions([]);
    setError("");

    // Reset the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  return (
    <div className={styles.uploadSection}>
      <h1>Tuners Vehicle Cost Predictior</h1>

      <form onSubmit={handleSubmit}>
        <h2>Upload Image or Enter URL</h2>

        {/* File Upload */}
        <input
          ref={fileInputRef} // Attach reference to the file input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />

        {/* URL Input */}
        <input
          type="text"
          placeholder="Enter image URL"
          value={imageUrl}
          onChange={handleUrlChange}
        />

        <button type="submit">Submit</button>
        <button type="button" onClick={handleClear}>
          Clear
        </button>
      </form>

      {/* Preview */}
      {filePreview && (
        <div>
          <h2>Image Preview</h2>
          <img
            src={filePreview}
            alt="Preview"
            style={{ maxWidth: "100%", maxHeight: "300px", marginTop: "10px" }}
          />
        </div>
      )}

      {/* Error Display */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Predictions Display */}
      {predictions.length > 0 && (
        <div>
          <h2>Prediction Results</h2>
          <ul>
            {predictions.map((prediction, index) => {
              const vehicleType = prediction.tagName;
              const vehicleData = baseCostOptions[vehicleType];

              return (
                <li key={index}>
                  <strong>{vehicleType}</strong>:{" "}
                  {(prediction.probability * 100).toFixed(2)}%
                  <div>
                    <p>
                      Insurance Cost:{" "}
                      {vehicleData?.insuranceCost || "Not available"}
                    </p>
                    <p>
                      Finance Option:{" "}
                      {vehicleData?.financeOption || "Not available"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
