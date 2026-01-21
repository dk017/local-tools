FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
# libgl1 and libglib2.0 are for opencv/image processing
# tesseract-ocr for OCR PDF functionality
# poppler-utils for pdf2image (PDF to image conversion)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for temp files
RUN mkdir -p /tmp/offline_tools_api && chmod 777 /tmp/offline_tools_api

# Create non-root user (security best practice)
RUN useradd -m appuser

# Pre-download rembg U2Net model (~170MB) during build
# This avoids slow first-request downloads at runtime
RUN mkdir -p /home/appuser/.u2net && \
    HOME=/home/appuser python -c "from rembg import new_session; new_session('u2net')" && \
    chown -R appuser:appuser /home/appuser/.u2net

USER appuser

EXPOSE 8000

# Start with uvicorn
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
