FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-slim

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

RUN npm pkg set scripts.start="node server.js"

COPY server.js ./

RUN npm install --omit=dev

EXPOSE 8080

ENV PORT=8080
CMD ["node", "server.js"]
