# CivicOS AI Engine
This module handles the artificial intelligence and computer vision tasks for the CivicOS smart city management system.

## Modules
- `detection`: Object detection for civic incidents (YOLO).
- `verification`: Verifies reported categories against AI detection.
- `duplicate_detection`: Clusters reports referring to the same incident.
- `resolution`: Verifies if a problem has been resolved.

## Setup
1. Create virtual environment: `py -3.11 -m venv venv`
2. Activate venv: `.\venv\Scripts\activate`
3. Install dependencies: `pip install -r requirements.txt`
