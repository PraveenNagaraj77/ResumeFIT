import React, { useState, useRef } from "react";
import axios from "axios";
import * as mammoth from "mammoth";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/build/pdf";
import 'bootstrap/dist/css/bootstrap.min.css';
import { Spinner, Modal, Button } from 'react-bootstrap';
import './ResumeCustomizer.css'

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js`;

const ResumeCustomizer = () => {

  const BASE_URL = 'http://localhost:3000';
  const SUB_URL='/api/customize-resume';
  const APIURL = `${BASE_URL}${SUB_URL}` ;

  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [customizedResume, setCustomizedResume] = useState("");
  const [base64PDF, setBase64PDF] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumeContent, setResumeContent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState("");

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    setResumeFile(file);
    console.log("Selected file:", file);

    if (file) {
      const fileExtension = file.name.split(".").pop().toLowerCase();
      console.log("File extension:", fileExtension);

      try {
        let text = "";
        if (fileExtension === "pdf") {
          const pdfData = await file.arrayBuffer();
          const pdf = await getDocument({ data: pdfData }).promise;
          const numPages = pdf.numPages;
          console.log("Number of pages in PDF:", numPages);

          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map((item) => item.str);
            text += textItems.join(" ") + "\n";
          }
        } else if (fileExtension === "docx") {
          const arrayBuffer = await file.arrayBuffer();
          const { value } = await mammoth.convertToPlainText({ arrayBuffer });
          text = value;
        } else {
          alert("Unsupported file format. Please upload a PDF or DOCX file.");
          return;
        }

        console.log("Extracted resume content:", text.trim());
        setResumeContent(text.trim());
      } catch (error) {
        console.error("Error reading the file:", error);
        alert("Error reading the file. Please try again.");
      }
    }
  };

  const handleJobDescriptionChange = (event) => {
    setJobDescription(event.target.value);
    console.log("Updated job description:", event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log("Submit button clicked");

    if (!resumeFile || !jobDescription) {
      alert("Please upload a resume and enter a job description.");
      console.log("Missing resume file or job description.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("jobDescription", jobDescription);

    try {
      setLoading(true);
      console.log("Sending form data to API...");
      const response = await axios.post(APIURL,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      console.log("API Response:", response.data);
      setCustomizedResume(response.data.customizedResume);
      setBase64PDF(response.data.base64PDF);
    } catch (error) {
      console.error("Error customizing resume:", error);
      alert("Failed to customize resume.");
    } finally {
      setLoading(false);
      console.log("Resume customization completed.");
    }
  };

  const handleDownload = () => {
    console.log("Download button clicked");
    const linkSource = `data:application/pdf;base64,${base64PDF}`;
    const downloadLink = document.createElement("a");
    const fileName = "customized_resume.pdf";

    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
    console.log("Customized resume downloaded");
  };

  const formatResumeContent = (content) => {
    console.log("Formatting resume content for better visual presentation");
  
    const lines = content.split("\n");
    const formattedContent = [];
  
    let currentSection = null;
  
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
  
      if (!trimmedLine) return;
  
      // Check for section headers (assumed to be all caps)
      if (trimmedLine.match(/^[A-Z\s]+$/) && trimmedLine.length > 2) {
        if (currentSection) {
          formattedContent.push(<hr key={`${index}-divider`} style={{ borderColor: "#007bff", marginTop: "10px", marginBottom: "10px" }} />);
        }
        formattedContent.push(
          <h3
            key={index}
            style={{
              color: "#343a40",
              borderBottom: "1px solid #007bff",
              paddingBottom: "5px",
              marginBottom: "15px",
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            {trimmedLine}
          </h3>
        );
        currentSection = trimmedLine;
      } 
      // Check for bullet points
      else if (trimmedLine.startsWith("•") || trimmedLine.startsWith("–")) {
        formattedContent.push(
          <li
            key={index}
            style={{
              marginLeft: "20px",
              marginBottom: "5px",
              fontFamily: "'Arial', sans-serif",
              listStyleType: "none", // Removes default list bullet
            }}
          >
            {trimmedLine.replace(/^•\s?|^–\s?/, "").trim()}
          </li>
        );
      } 
      // Check for name or title
      else if (trimmedLine.match(/^[A-Z][a-z]+\s[A-Z][a-z]+$/)) {
        formattedContent.push(
          <h4
            key={index}
            style={{
              color: "#6c757d",
              fontStyle: "italic",
              marginBottom: "5px",
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            {trimmedLine}
          </h4>
        );
      } 
      // Default paragraph for other lines
      else {
        formattedContent.push(
          <p
            key={index}
            style={{
              marginBottom: "10px",
              fontFamily: "'Verdana', sans-serif",
            }}
          >
            {trimmedLine}
          </p>
        );
      }
  
      // Add a break after each line for spacing
      formattedContent.push(<br key={`${index}-br`} />);
    });
  
    console.log("Formatted resume content completed");
    return (
      <div style={{ padding: "10px", fontSize: "14px", lineHeight: "1.6" }}>
        {formattedContent}
      </div>
    );
  };
  

  const handleShowModal = (content) => {
    setModalContent(content);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalContent("");
  };

  return (
    <div className="container mt-4">
      <h1 className="text-center text-success">ResumeFIT</h1>
      <h6 className="text-center my-4">Customize the Resume Based on Job Description</h6>
      <div className="row mt-4">
        <div className="col-md-6 mb-3">
          <h2>Upload Resume</h2>
          <div className="border p-3 rounded position-relative" style={{ height: '300px', backgroundColor: "#f8f9fa" }}>
            <div className="input-group mb-3">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="form-control"
              />
              <button
                type="button"
                onClick={handleSubmit}
                className="btn btn-primary" // Keep the upload button as is
                style={{ marginLeft: '10px' }}
              >
                Upload
              </button>
            </div>
            {resumeContent ? (
              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                <h3>Resume Content:</h3>
                {formatResumeContent(resumeContent)}
              </div>
            ) : (
              <p>Please upload a resume to view its content.</p>
            )}
            {resumeContent && (
              <button
                className="btn btn-dark mt-3" // Change to black button
                onClick={() => handleShowModal(resumeContent)}
              >
                See More
              </button>
            )}
          </div>
        </div>
  
        <div className="col-md-6 mb-3">
          <h2>Job Description</h2>
          <textarea
            value={jobDescription}
            onChange={handleJobDescriptionChange}
            placeholder="Enter job description here..."
            rows="10"
            className="form-control"
            style={{ height: '300px' }}
          ></textarea>
          {jobDescription && (
            <button
              className="btn btn-dark mt-2" // Change to black button
              onClick={() => handleShowModal(jobDescription)}
            >
              See More
            </button>
          )}
        </div>
      </div>
  
      <div className="text-center mt-3">
        {loading && (
          <div>
            <Spinner animation="border" variant="success" />
            <p>Customizing new Resume...</p>
          </div>
        )}
      </div>
  
      {customizedResume && (
  <div className="mt-4 text-center">
    <h3>Customized Resume</h3>
    <div
      className="border p-3 rounded position-relative mx-auto"
      style={{
        maxHeight: "300px",
        overflowY: 'auto',
        backgroundColor: "#f8f9fa",
      }}
    >
      {formatResumeContent(customizedResume)}
    </div>
    <div className="text-start mt-3"> {/* Left-aligned for "See More" button */}
      <button
        className="btn btn-dark mt-2" // Change to black button
        onClick={() => handleShowModal(customizedResume)}
      >
        See More
      </button>
    </div>
    <div className="text-center mt-2"> {/* Center-aligned for "Download" button */}
      <button
        onClick={handleDownload}
        className="btn btn-success mt-2 mb-2" // Keep the download button green
      >
        Download
      </button>
    </div>
  </div>
)}

  
      {/* Modal for displaying full content */}
      <Modal 
  show={showModal} 
  onHide={handleCloseModal} 
  className="custom-modal"
  size="lg" // You can use 'sm', 'md', 'lg', or 'xl' to control the size
>
  <Modal.Header closeButton>
    <Modal.Title>Content</Modal.Title>
  </Modal.Header>
  <Modal.Body className="custom-modal-body">
    <textarea
      style={{
        width: "100%", // Make it take the full width of the modal
        height: "400px", // Reduced height for a more compact look
        resize: "none", // Prevent resizing
        border: "none",
        outline: "none",
      }}
      value={modalContent}
      readOnly // Makes the textarea read-only
    />
  </Modal.Body>
  <Modal.Footer className="justify-content-center">
    <Button variant="primary " onClick={handleCloseModal}>
      Close
    </Button>
  </Modal.Footer>
</Modal>


    </div>
  );
};

export default ResumeCustomizer;
