# Build stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
