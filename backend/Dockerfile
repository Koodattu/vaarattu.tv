FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4000
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
