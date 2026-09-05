import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

export async function sendTelegramNotification(job, evaluation) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Faltan credenciales de Telegram. No se enviará la notificación.");
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const puntosFuertes = (evaluation.puntos_fuertes || []).map(p => `- ${p}`).join('\n  ');
  const alertas = (evaluation.alertas_o_gaps || []).map(a => `- ${a}`).join('\n  ');

  const text = `🎯 *Match: ${evaluation.match_score}%* | *${evaluation.seniority_detectado}*
📌 *Puesto:* ${job.title}
🏢 *Empresa:* ${job.company}
📍 *Modalidad/Ubicación:* ${evaluation.modalidad_detectada} - ${job.location}
💼 *Contrato:* ${evaluation.tipo_contrato}

💡 *Por qué encaja:*
  ${puntosFuertes}

⚠️ *A tener en cuenta:*
  ${alertas}

🔗 [Ver oferta en LinkedIn](${job.url})`;

  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
    console.log(`Notificación enviada para: ${job.title}`);
    return true;
  } catch (error) {
    console.error("Error al enviar notificación de Telegram:", error.response?.data || error.message);
    return false;
  }
}
