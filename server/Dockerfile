FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# Cria pasta de uploads
RUN mkdir -p uploads

EXPOSE 4000

CMD ["node", "src/server.js"]