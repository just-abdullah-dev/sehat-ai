FROM python:3.10-slim

WORKDIR /docs

# Install MkDocs
RUN pip install mkdocs mkdocs-material

# Copy docs
COPY . .

EXPOSE 8080
CMD ["mkdocs", "serve", "-a", "0.0.0.0:8080"]
