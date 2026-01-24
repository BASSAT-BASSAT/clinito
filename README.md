
# CLINITO AI – The Medical Copilot

CLINITO is an AI-powered medical assistant that combines advanced medical image analysis with conversational intelligence to help doctors work faster and smarter.

### 🎥 [Watch Project Demo](https://drive.google.com/file/d/1OkluPaU6PmBa_6JqIvYLzDfuX6kpJgPA/view?usp=sharing)

<img src="Medical%20SAM3%20Idea%20pic.png" width="100%" alt="CLINITO Project Idea"/>
<img src="Medical-SAM3/assests/overview.svg" width="100%" alt="Medical-SAM3 Overview"/>

## 🩺 Project Vision

**CLINITO** empowers clinicians by seamlessly integrating:

- **Medical image segmentation** (X-ray, MRI, CT, etc.) using [SAM 3 (Segment Anything Model)](https://github.com/facebookresearch/segment-anything) and [Medical-SAM3](https://github.com/AIM-Research-Lab/Medical-SAM3)
- **Conversational AI** for natural language and voice queries (powered by [Botpress](https://botpress.com/))
- **RAG (Retrieval-Augmented Generation)** for evidence-based answers from curated medical literature (stored in [Convex](https://www.convex.dev/))
- **Real-time collaboration**: Syncs patient records, session history, segmentations, and chat logs instantly
- **Voice input/output**: Hands-free operation via [ElevenLabs](https://elevenlabs.io/)

### How It Works
1. **Upload** a medical image (X-ray, MRI, CT, etc.)
2. **Segment**: The system uses SAM 3 to detect and highlight abnormalities or anatomical structures using text prompts, clicks, or box selections
3. **Measure**: (In progress) DICOM-standard measurements for clinical accuracy
4. **Ask**: Doctors can ask questions via text or voice; Botpress routes queries to a RAG system that pulls from medical textbooks and literature
5. **Recommend**: The AI analyzes segmented images and offers recommendations (always overseen by the doctor)
6. **Sync**: All data (patient profiles, history, results) is stored and synced in real time


## 🚦 Project Status & Roadmap

> **Current Status:**
> - MVP in development: Core segmentation, chat, and RAG working
> - DICOM measurement tools are under development
> - Not yet deployed (local only)

### ✅ Features (MVP)
- [x] Medical image upload (X-ray, CT, MRI)
- [x] SAM 3 segmentation with text prompts, clicks, and boxes
- [x] Mask visualization with opacity controls
- [x] Conversational AI assistant (Botpress)
- [x] RAG with Bootpress KnowledgeBase
- [x] Voice input (STT) & output (TTS) via ElevenLabs
- [x] Real-time patient/session sync

### 🛠️ In Progress
- [ ] DICOM-compliant measurement tools
- [ ] Citations and confidence scoring in answers
- [ ] End-to-end latency benchmarking


### 🗺️ Planned Improvements
- [ ] Explainability: Show why the AI flagged something
- [ ] Annotation tools for doctors to correct AI
- [ ] Deeper analytics and reporting
- [ ] HIPAA compliance review
- [ ] Deployment (cloud & on-prem)

## 🛠 Tech Stack & Credits

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Convex
- **Image AI:** [SAM 3 (Ultralytics)](https://github.com/ultralytics/ultralytics), [Medical-SAM3](https://github.com/AIM-Research-Lab/Medical-SAM3) (huge kudos to their teams!)
- **Conversational AI:** [Botpress](https://botpress.com/)
- **Voice:** [ElevenLabs](https://elevenlabs.io/)
- **RAG:** Custom pipeline with Convex
- **Special thanks:** Facebook Research, AIM Research Lab, and all open-source contributors

## 🧠 Workflow & Design

we used MIRO for planning, Designing and Visualizing the full workflow


## 📚 Related Projects & Inspiration

- [Medical-SAM3 (AIM Research Lab)](https://github.com/AIM-Research-Lab/Medical-SAM3)
- [Segment Anything Model (Facebook Research)](https://github.com/facebookresearch/segment-anything)
- [Ultralytics](https://github.com/ultralytics/ultralytics)
- [Botpress](https://botpress.com/)
- [Convex](https://www.convex.dev/)
- [ElevenLabs](https://elevenlabs.io/)

## 📝 Citation

If you find Medical-SAM3 or CLINITO useful for your research or work, please consider citing:

```bibtex
@article{jiang2026medicalsam3,
	title={Medical SAM3: A Foundation Model for Universal Prompt-Driven Medical Image Segmentation},
	author={Jiang, Chongcong and Ding, Tianxingjian and Song, Chuhan and Tu, Jiachen and Yan, Ziyang and Shao, Yihua and Wang, Zhenyi and Shang, Yuzhang and Han, Tianyu and Tian, Yu},
	journal={arXiv preprint arXiv:2601.10880},
	year={2026},
	url={https://arxiv.org/abs/2601.10880}
}
```
