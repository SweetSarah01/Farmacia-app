FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM node:22-slim

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY server.js ./

RUN npm install --omit=dev --ignore-scripts

EXPOSE 8080

ENV PORT=8080
CMD ["node", "server.js"]
