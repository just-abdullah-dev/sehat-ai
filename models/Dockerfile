FROM pytorch/pytorch:2.0.1-cpu

WORKDIR /models

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model scripts & weights
COPY . .

EXPOSE 8500
CMD ["python", "serve_models.py"]
