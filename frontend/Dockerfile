# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

# Build Next.js app
RUN npm run build

# Start the app
EXPOSE 3000
CMD ["npm", "start"]
