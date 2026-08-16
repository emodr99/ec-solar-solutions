# Claude AI Prompt: EC Solar Solutions Website

Copy and paste the prompt below into Claude AI to generate your website code.

***

**Role:** You are an expert React Web Developer, 3D Animator (using Remotion and Three.js), and a localized Copywriter specializing in the Philippine market.

**Task:** Generate the complete code and structure for a modern, responsive, and free website for my business, **EC Solar Solutions**. The website should be built using React (Vite or Next.js) so that it can natively support **Remotion** for a 3D animation feature.

**Business Overview:**
*   **Name:** EC Solar Solutions
*   **Niche:** Solar Energy Company catering to Filipino Homeowners.
*   **Goal:** Educate homeowners on the benefits of solar energy, convince them to switch, and generate leads.

**Language & Tone:** 
*   **Taglish (Tagalog-English):** The copy must be highly relatable, encouraging, and trustworthy for the average Filipino homeowner. Use conversational but professional Taglish (e.g., *"Pagod ka na ba sa mataas na bill sa kuryente? It's time to switch to solar!"*).

**Key Features & Technical Requirements:**
1.  **3D Animation (Remotion):** Include a React component using Remotion that renders a 3D-style animation titled "The Journey of Solar Energy." It should visually tell the story of sunlight hitting a solar panel, converting into electricity, and powering a typical Filipino home. Generate the necessary Remotion composition code.
2.  **Asset Integration:** I have JSON files containing data for my images, logo, and banner (`Image Basis`, `Logo`, and `Banner`). Please set up the code so it fetches or maps data from these JSON files (use placeholder JSON structures in your code so I can easily swap them with my actual files).
3.  **Modern UI/UX:** Use Tailwind CSS for clean, responsive styling.

**Website Sections Needed:**
*   **Hero Section:** Catchy Taglish headline, the Banner from the JSON file, and a clear Call-to-Action (CTA) like "Mag-inquire Ngayon".
*   **The Solar Journey:** The Remotion 3D animation component showcasing how solar works for a home.
*   **Why Choose EC Solar Solutions?:** Bullet points of benefits (e.g., lower Meralco/electric bills, eco-friendly, reliable).
*   **Contact Section / Footer:** Must display the following details prominently:
    *   Phone: +63 994 025 7286
    *   Email: ecsolarsolutions01@gmail.com

**Deliverables:**
1.  The project file structure.
2.  The JSON placeholder structure for the Logo, Banner, and Image Basis.
3.  The main Landing Page component code (React + Tailwind).
4.  The Remotion composition code for the 3D Solar Journey animation.
5.  The Taglish copywriting embedded directly into the components.

Please write clean, modular, and well-commented code so I can easily deploy it on platforms like Vercel or Netlify.

***

### Tips for Using This Prompt

*   **Provide the JSON files:** When you send this prompt to Claude, you can actually attach or paste the contents of your `Image Basis`, `Logo`, and `Banner` JSON files in the same message so Claude can write the exact parsing logic for them.
*   **Running Remotion:** Because Remotion renders video via React, Claude will likely give you a React repository setup. You will need Node.js installed on your computer to run the code (`npm install` and `npm start`) before deploying it.
