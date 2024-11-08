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

COPY --from=build-stage /app/stockfish-windows-x86-64.exe /app/

# Set executable permissions to the Stockfish binary (for Windows)
RUN chmod 755 /app/stockfish/stockfish-windows-x86-64.exe

# Expose the application port
EXPOSE 3000

# Start the server without PM2
CMD ["node", "server.js"]
