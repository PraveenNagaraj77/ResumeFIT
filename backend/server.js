import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ensure uploads directory exists
const uploadsDir = join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Google Generative AI setup
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post("/api/customize-resume", upload.single("resume"), async (req, res) => {
  const { jobDescription } = req.body;
  const resumeFilePath = req.file.path;

  if (!resumeFilePath || !jobDescription) {
    return res.status(400).json({ error: "Both resume and job description are required." });
  }

  try {
    const resumeContent = fs.readFileSync(resumeFilePath, "utf-8");

    const prompt = `Analyze the provided master resume and job description and generate a customized resume that positions the candidate as the ideal fit for the specified role.

**Master Resume:**
${resumeContent}

**Job Description:**
${jobDescription}

**Instructions:**
1. Use the core details from the master resume such as the candidate's **name**, **contact information**, **experience**, and **education** as the foundation.
2. Modify and rephrase the **Summary**, **Skills**, and **Experience** sections based on the job description to emphasize the candidate's relevant strengths.
3. Reorganize bullet points, add new responsibilities, and highlight relevant accomplishments that directly align with the key requirements and qualifications mentioned in the job description.
4. Ensure that the customized resume addresses the primary responsibilities and required skills of the job description, while also demonstrating how the candidate’s past experience and achievements make them a strong candidate for the role.
5. If any relevant skills or projects are missing from the master resume but are crucial for the job, creatively integrate these into the customized resume.
6. Maintain a professional format and language throughout the resume, ensuring it is concise, clear, and impactful.`;
    
    const result = await model.generateContent(prompt);
    const customizedResume = result.response.text();
    console.log("Customized Resume Content:", customizedResume);

    const pdfFilePath = join(uploadsDir, `customized_resume_${Date.now()}.pdf`);
    const doc = new PDFDocument();

    const writeStream = fs.createWriteStream(pdfFilePath);
    doc.pipe(writeStream);

    // Format the PDF content
    const lines = customizedResume.split("\n");
    let section = "";

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return; // Skip empty lines

      // Determine the section of the resume
      if (trimmedLine.match(/^[A-Z\s]+$/) && trimmedLine.length > 2) {
        // If the line is all caps, treat it as a section title
        section = trimmedLine; // Update the current section
        doc.fontSize(14).font('Helvetica-Bold').text(section, { align: 'left' });
        doc.moveDown();
      } else if (trimmedLine.startsWith("•")) {
        // Treat as bullet point
        doc.fontSize(12).font('Helvetica').list([trimmedLine.replace("•", "").trim()]); // Bullet point
      } else {
        // Treat as normal content
        doc.fontSize(12).font('Helvetica').text(trimmedLine, { align: 'left' });
      }
      doc.moveDown(); // Space between lines
    });

    doc.end();

    writeStream.on("finish", () => {
      console.log("PDF created successfully:", pdfFilePath);

      // Read the PDF file as binary data
      const pdfData = fs.readFileSync(pdfFilePath);

      // Encode the binary data as base64
      const base64EncodedPDF = pdfData.toString("base64");

      res.json({ customizedResume, base64PDF: base64EncodedPDF });

      // Optionally, delete the uploaded file after processing to save space
      fs.unlinkSync(resumeFilePath);
    });

    writeStream.on("error", (err) => {
      console.error("Error writing PDF:", err);
      res.status(500).json({ error: "Failed to generate PDF." });
    });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: "Failed to customize resume." });
  }
});

app.use("/uploads", express.static(uploadsDir));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
