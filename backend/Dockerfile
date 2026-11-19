FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app/backend

COPY backend/package.json ./
RUN npm install --omit=dev

COPY backend/src ./src
COPY backend/migrations ./migrations
COPY glossary ../glossary

EXPOSE 8787
CMD ["npm", "start"]
