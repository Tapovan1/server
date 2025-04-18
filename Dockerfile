# Define the builder stage
FROM node:23-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps


# Copy all the files
COPY . .

RUN npx prisma generate


# Build the Next.js app
RUN npm run build

# Use the official Node.js 18 image for the production stage
FROM node:23-alpine AS production

# Set the working directory
WORKDIR /app

# Copy the built files from the builder stage
COPY --from=builder /app ./

# Install only production dependencies
RUN npm ci --legacy-peer-deps --only=production

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js app
CMD ["npm", "start"]