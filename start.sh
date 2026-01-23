#!/bin/bash
echo "🏥 MedAssist AI - Starting..."

cd /home/seif-ai/medical-ai-assistant/sam3-server
source venv/bin/activate 2>/dev/null
python main.py &
SAM3_PID=$!
cd ..
sleep 2

npm run dev &
NEXT_PID=$!

echo ""
echo "✅ Servers started!"
echo "   Frontend: http://localhost:3000"
echo "   SAM 3 API: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $SAM3_PID $NEXT_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
