import cron from 'node-cron';
import { fetchJobListings, fetchJobDetails } from './scraper.js';
import { evaluateJobWithFallback } from './evaluator.js';
import { sendTelegramNotification } from './notifier.js';
import { initStorage, getProcessedJobs, addProcessedJob } from './storage.js';
import dotenv from 'dotenv';
dotenv.config();

const INTERVAL_HOURS = process.env.CHECK_INTERVAL_HOURS || 4;
const randomDelay = (min, max) => new Promise(res => setTimeout(res, Math.floor(Math.random() * (max - min + 1) + min)));

async function runJobHunter() {
  console.log(`\n--- Iniciando Job Hunter: ${new Date().toISOString()} ---`);
  await initStorage();
  
  const jobs = await fetchJobListings();
  const processedJobs = await getProcessedJobs();
  
  let newJobsCount = 0;
  
  for (const job of jobs) {
    if (processedJobs.includes(job.id)) {
      console.log(`[SKIP] Oferta ${job.id} ya fue procesada anteriormente.`);
      continue;
    }
    
    newJobsCount++;
    console.log(`\n[NUEVA] Analizando: ${job.title} - ${job.company}...`);
    
    const description = await fetchJobDetails(job.id);
    if (!description) {
      console.log(`No se pudo extraer la descripción de ${job.id}. Saltando.`);
      continue;
    }
    
    const evaluation = await evaluateJobWithFallback({
      title: job.title,
      company: job.company,
      description: description
    });
    
    if (evaluation) {
      console.log(`Evaluación: Score ${evaluation.match_score}% | Viable: ${evaluation.es_viable}`);
      
      if (evaluation.es_viable && evaluation.match_score >= 75) {
        await sendTelegramNotification(job, evaluation);
      } else {
        console.log(`Descartada por score o criterios de inviabilidad.`);
      }
    } else {
      console.log("Fallo en la evaluación por IA.");
    }
    
    // Guardar para no procesar de nuevo, independientemente del resultado
    await addProcessedJob(job.id);
    await randomDelay(4000, 6500); // Entre 4 y 6.5 segundos
  }
  
  console.log(`\n--- Ciclo finalizado. Ofertas nuevas analizadas: ${newJobsCount} ---`);
}

console.log(`Iniciando servicio de Job Hunter. Configurado para correr cada ${INTERVAL_HOURS} horas.`);

// Ejecución inicial al arrancar
runJobHunter().catch(console.error);

// Programar futuras ejecuciones
cron.schedule(`0 */${INTERVAL_HOURS} * * *`, () => {
  runJobHunter().catch(console.error);
});
