FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY server.js ./server.js
COPY data/config.local.example.json ./data/config.local.example.json
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "server.js"]
