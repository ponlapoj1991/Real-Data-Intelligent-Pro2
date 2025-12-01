<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# RealData Intelligence Pro2

A powerful Social Listening Data Intelligence Platform built with React, TypeScript, and AI.

## Features

- 📊 **Data Ingestion**: Upload Excel/CSV or connect to Google Sheets
- 🧹 **Data Cleaning**: Transform and prepare your data with smart tools
- 📈 **Analytics Dashboard**: Create interactive charts with AI assistance
- 🤖 **AI Agent**: Chat with your data and perform intelligent transformations
- 📄 **Report Builder**: Drag-and-drop presentation builder with PPTX export
- ⚙️ **Multi-AI Support**: Works with Google Gemini, OpenAI, and Claude

## Branch alignment

- Active working branch: `verify-chart-creation-logic-in-analytics` (tracks the Analytics chart verification updates).

---

## 🚀 Quick Start

### Run Locally

**Prerequisites:** Node.js 16+

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Real-Data-Intelligent-Pro2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```

   Add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

   Get your API key from: https://aistudio.google.com/app/apikey

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to: http://localhost:3000

---

## 🌐 Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ponlapoj1991/Real-Data-Intelligent-Pro2)

### Manual Deployment

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**

   In the Vercel project settings, add:

   | Name | Value |
   |------|-------|
   | `GEMINI_API_KEY` | Your Google Gemini API Key |

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at: `https://your-app.vercel.app`

### Auto Deployment

Once connected, Vercel will automatically deploy:
- ✅ Every push to `main` branch
- ✅ Pull request previews
- ✅ Branch previews

---

## 📚 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **AI**: Google Gemini, OpenAI, Claude
- **Storage**: IndexedDB (Local)
- **Build**: Vite
- **Deploy**: Vercel

---

## 📝 License

MIT License - feel free to use this project for your own purposes.

---

## 🔗 Links

- AI Studio: https://ai.studio/apps/drive/1DFazQRHJ6djybSJFOxtbES3btM5-A7gQ
- Documentation: Coming soon
