# Stage 1: Build the Vite frontend
FROM node:18 AS build-stage

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Prepare the production image
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --only=production

# Copy the built frontend assets and backend files
COPY --from=build-stage /app/dist /app/dist
COPY --from=build-stage /app/socket.js /app/
COPY --from=build-stage /app/stockfish /app/stockfish/stockfish-ubuntu-x86-64-bmi2
RUN chmod +x /app/stockfish/stockfish-ubuntu-x86-64-bmi2
COPY --from=build-stage /app/server.js /app/

# Ensure Stockfish binary is executable

EXPOSE 3000

# Use the start command to start the server without pm2
CMD ["node", "server.js"]
