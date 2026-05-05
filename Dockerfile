FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

ENV PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "npm run build && node server.js"]
