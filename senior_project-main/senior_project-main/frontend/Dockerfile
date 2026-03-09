# Dockerfile.dev
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

RUN npm install -g serve

EXPOSE 8010
CMD ["serve", "-s", "out", "-l", "8010"]
