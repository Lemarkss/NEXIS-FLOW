# Estágio de Build
FROM node:20-slim AS builder

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm install

# Copia o código e faz o build
COPY . .
RUN npm run build

# Estágio de Produção
FROM node:20-slim

WORKDIR /app

# Copia apenas o necessário do estágio de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/firebase-applet-config.json ./

# Instala apenas dependências de produção
RUN npm install --omit=dev && npm install -g tsx

# Expõe a porta 3000
EXPOSE 3000

# Define variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar o servidor
CMD ["tsx", "server.ts"]
