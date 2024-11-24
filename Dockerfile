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

# Install PM2 globally for production use
RUN npm install -g pm2

# Copy the built frontend assets and backend files
COPY ./routes /app/routes
COPY ./models /app/models
COPY --from=build-stage /app/dist /app/dist
COPY --from=build-stage /app/socket.js /app/
COPY --from=build-stage /app/server.js /app/

# Copy the Stockfish binary and set executable permissions



# Set environment variables if needed
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3000

CMD ["pm2-runtime", "start", "server.js", "--name", "server", "&&", "pm2-runtime", "start", "socket.js", "--name", "socket"]

