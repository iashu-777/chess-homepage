# Stage 1: Build the Vite frontend
FROM node:18 AS build-stage

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json for installing dependencies
COPY package.json package-lock.json ./ 

# Install frontend dependencies
RUN npm install

# Copy the rest of the application files (frontend code)
COPY . .

# Build the frontend with Vite
RUN npm run build

# Stage 2: Prepare the production image (backend and frontend)
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Install necessary dependencies for the backend
# (Ensure you install both frontend and backend dependencies)
COPY package.json package-lock.json /app/

# Reinstall only production dependencies for both frontend and backend
RUN npm install --only=production

# Copy the build frontend assets from the previous stage to serve them
COPY --from=build-stage /app/dist /app/dist

# Copy backend files (socket.js, stockfish, etc.)
COPY --from=build-stage /app/socket.js /app/
COPY --from=build-stage /app/stockfish/ /app/stockfish/ 
# Copy the Stockfish binary

# Expose the port your app will run on
EXPOSE 3000

# Command to run your application (start backend)
CMD ["node", "socket.js"]
