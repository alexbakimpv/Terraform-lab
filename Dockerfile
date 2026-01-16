# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application (adjust build command based on your framework)
RUN npm run build

# Stage 2: Serve the application
FROM node:18-alpine

WORKDIR /app

# Install 'serve' - a lightweight static file server
RUN npm install -g serve

# Copy only the built artifacts from the previous stage
COPY --from=builder /app/dist ./dist

# Cloud Run/GKE injects the PORT environment variable (defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# The '-s' flag ensures index.html is served for SPA routing
CMD ["sh", "-c", "serve -s dist -l $PORT"]
