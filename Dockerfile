FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server/migrations ./dist/server/migrations
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/api/v1/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","dist/server/main.js"]
