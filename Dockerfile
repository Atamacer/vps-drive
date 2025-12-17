FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
COPY yarn.lock* ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 80
CMD ["node", "dist/main"]