FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
# --host é obrigatório para funcionar no Docker
CMD ["npm", "run", "dev", "--", "--host"]
