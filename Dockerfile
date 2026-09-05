FROM node:24-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias omitiendo las de desarrollo para mantener ligereza
RUN npm install --omit=dev

# Copiar el código fuente
COPY src/ ./src/

# Configurar ruta predeterminada de persistencia dentro de Docker
ENV STORAGE_PATH=/app/data/processed_jobs.json

# Crear directorio para data
RUN mkdir -p /app/data && chown -R node:node /app/data

# Usar usuario no-root por seguridad
USER node

# Comando por defecto
CMD ["npm", "start"]
