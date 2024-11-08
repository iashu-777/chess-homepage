# Stage 1: Build the Vite frontend
FROM node:18 AS build-stage

# Set the working directory
WORKDIR /app

# Copy and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy all files and build the frontend
COPY . .
RUN npm run build

# Stage 2: Prepare the production image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files and install only production dependencies
COPY package.json package-lock.json ./
RUN npm install --only=production

# Copy the built frontend assets and backend files
COPY --from=build-stage /app/dist /app/dist
COPY --from=build-stage /app/socket.js /app/
COPY --from=build-stage /app/server.js /app/

# Copy the Stockfish binary for Windows

COPY --from=build-stage /app/stockfish-ubuntu-x86-64-avx2 /app/
RUN chmod +x /app/stockfish-ubuntu-x86-64-avx2  # Ensure it is executable


# Expose the application port
EXPOSE 3000

# Start the server without PM2
CMD ["node", "server.js"]
