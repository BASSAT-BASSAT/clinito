# MedAssist AI - Medical Image Analysis Assistant

AI-powered medical image analysis and conversational assistant for healthcare professionals.

## ⚠️ Medical Disclaimer

This application is for **research and educational purposes only**. It is NOT a substitute for professional medical diagnosis.

## 🚀 Quick Start

### 1. Install Frontend Dependencies
```bash
cd /home/seif-ai/medical-ai-assistant
npm install
```

### 2. Install Python Dependencies
```bash
cd sam3-server
source venv/bin/activate
pip install ultralytics opencv-python
```

### 3. Start Servers

**Terminal 1 - SAM 3:**
```bash
cd /home/seif-ai/medical-ai-assistant/sam3-server
source venv/bin/activate
python main.py
```

**Terminal 2 - Next.js:**
```bash
cd /home/seif-ai/medical-ai-assistant
npm run dev
```

### 4. Open App
Visit **http://localhost:3000**

## 🎯 Features
- ✅ Medical image upload (X-ray, CT, MRI)
- ✅ SAM 3 segmentation with text prompts
- ✅ Mask visualization with opacity controls
- ✅ Conversational AI assistant
- ✅ Voice input (STT) & output (TTS) via ElevenLabs
- ✅ Medical disclaimers

## 🛠 Tech Stack
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Convex
- **Image AI**: SAM 3 (Ultralytics)
- **Voice**: ElevenLabs
