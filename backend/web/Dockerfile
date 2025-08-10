FROM node:24-alpine
WORKDIR /app

# Copy shared package and generate Prisma client
COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm install && npx prisma generate && npm run build

# Update package.json to point to built files for production
RUN sed -i 's/"main": "index.ts"/"main": "dist\/index.js"/' package.json
RUN sed -i 's/"types": "index.ts"/"types": "dist\/index.d.ts"/' package.json

# Set up web service
WORKDIR /app/web
COPY web/package*.json ./
COPY web/tsconfig.json ./

# Install dependencies and link to shared Prisma client
RUN npm install
RUN npm install ../shared

# Copy source and build
COPY web/src/ ./src/
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
