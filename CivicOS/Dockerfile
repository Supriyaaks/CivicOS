# CivicOS AI Engine Production Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY ai_engine/requirements.txt ./ai_engine/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ai_engine/requirements.txt

# Copy application source and models
COPY ai_engine/ ./ai_engine/
COPY labels/ ./labels/
COPY runs/ ./runs/
COPY data/ ./data/

# Environment settings
ENV PYTHONUNBUFFERED=1
ENV YOLO_VERBOSE=False
ENV FASTAPI_PORT=8000

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start Uvicorn
CMD ["uvicorn", "ai_engine.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
