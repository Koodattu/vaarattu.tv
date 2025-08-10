FROM node:24-alpine
WORKDIR /app

# Copy shared package and generate Prisma client
COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm install && npx prisma generate && npm run build

# Update package.json to point to built files for production
RUN sed -i 's/"main": "index.ts"/"main": "dist\/index.js"/' package.json
RUN sed -i 's/"types": "index.ts"/"types": "dist\/index.d.ts"/' package.json

# Set up twitch service
WORKDIR /app/twitch
COPY twitch/package*.json ./
COPY twitch/tsconfig.json ./

# Install dependencies and link to shared Prisma client
RUN npm install
RUN npm install ../shared

# Copy source and build
COPY twitch/src/ ./src/
COPY twitch/tokens.*.json ./
RUN npm run build

EXPOSE 4000
CMD ["npm", "start"]
