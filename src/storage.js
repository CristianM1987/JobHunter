import fs from 'fs/promises';
import path from 'path';
import os from 'os';

function getFilePath() {
  if (process.env.STORAGE_PATH) {
    return process.env.STORAGE_PATH;
  }
  return path.join(os.homedir(), 'Documents', 'job_hunter', 'processed_jobs.json');
}

export async function initStorage() {
  const filePath = getFilePath();
  const dirPath = path.dirname(filePath);
  
  try {
    await fs.mkdir(dirPath, { recursive: true });
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify([]));
    }
  } catch (error) {
    console.error("Error al inicializar el almacenamiento:", error.message);
  }
}

export async function getProcessedJobs() {
  const filePath = getFilePath();
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function addProcessedJob(jobId) {
  const filePath = getFilePath();
  try {
    const jobs = await getProcessedJobs();
    if (!jobs.includes(jobId)) {
      jobs.push(jobId);
      await fs.writeFile(filePath, JSON.stringify(jobs, null, 2));
    }
  } catch (error) {
    console.error(`Error al guardar job ${jobId}:`, error.message);
  }
}
