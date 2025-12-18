FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY yarn.lock* ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 80
CMD ["node", "dist/main"]