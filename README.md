# BuscaJob - Automatizador de Ofertas de Empleo con IA

Servicio ligero en Node.js que busca ofertas laborales públicas en LinkedIn (QA Automation/Manual), las evalúa con inteligencia artificial (Gemini) en base a un perfil específico y notifica los mejores resultados vía Telegram.

## Requisitos

- **Telegram Bot Token**: Crea un bot con [@BotFather](https://t.me/botfather).
- **Telegram Chat ID**: Obtén tu ID hablando con [@userinfobot](https://t.me/userinfobot).
- **Google Gemini API Key**: Genera una API Key gratis en [Google AI Studio](https://aistudio.google.com/).

## Configuración y Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Configurar variables:
   ```bash
   cp .env.example .env
   # Editar .env con tus claves
   ```
3. Ejecutar:
   ```bash
   npm start
   ```

## Despliegue con Docker (Recomendado)

Construye y corre el contenedor en segundo plano, montando un volumen para persistir el historial de trabajos evaluados (así evitas recibir alertas repetidas si se reinicia el contenedor):

```bash
docker build -t buscajob-ai .

docker run -d \
  --name buscajob-worker \
  --env-file .env \
  -v ~/Documents/job_hunter:/app/data \
  --restart unless-stopped \
  buscajob-ai
```
