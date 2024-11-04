# Stage 1: Build the Vite frontend
FROM node:18 AS build-stage

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json for installing dependencies
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Serve the application
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build-stage /app/package.json /app/package-lock.json /app
COPY --from=build-stage /app/dist /app/dist

# Reinstall only production dependencies
RUN npm install --only=production

# Copy the backend source code (assumes your backend code is in the same project)
COPY --from=build-stage /app/socket.js /app

# Expose the port for the application
EXPOSE 3000

# Command to start the application
CMD ["node", "socket.js"]
