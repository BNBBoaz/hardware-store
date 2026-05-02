# ─────────────────────────────────────────────
#  Backend Dockerfile (development)
# ─────────────────────────────────────────────

FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (Docker layer caching trick —
# npm install only re-runs if package.json changes)
COPY package*.json ./

# Install dependencies including nodemon for live reload
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the port Express runs on
EXPOSE 5000

# Start with nodemon so the server restarts on file changes
CMD ["npm", "run", "dev"]
