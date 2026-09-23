import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Pool ordenado por capacidad diaria
const MODEL_POOL = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash'
];

let currentModelIndex = 0;

const generationConfig = {
  responseMimeType: 'application/json',
  responseSchema: {
    type: SchemaType.OBJECT,
    properties: {
      match_score: { type: SchemaType.NUMBER, description: "Número de 0 a 100 indicando la compatibilidad" },
      seniority_detectado: { type: SchemaType.STRING, description: "Jr / SSr / Sr / Lead" },
      modalidad_detectada: { type: SchemaType.STRING, description: "Remoto / Hibrido / Presencial" },
      tipo_contrato: { type: SchemaType.STRING, description: "Relacion de dependencia / Contractor / Desconocido" },
      puntos_fuertes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Por qué encaja el perfil" },
      alertas_o_gaps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Requisitos no cumplidos o alertas (ej: 100% presencial, monotributo puro, etc)" },
      es_viable: { type: SchemaType.BOOLEAN, description: "Si la oferta es viable basándose en las restricciones duras" }
    },
    required: ["match_score", "seniority_detectado", "modalidad_detectada", "tipo_contrato", "puntos_fuertes", "alertas_o_gaps", "es_viable"]
  }
};

export const PERFIL_CANDIDATA = `
Perfil de la Candidata: Anónimo
Rol objetivo: QA Engineer (Semi Senior / Senior) o QA Automation.

Resumen Profesional:
QA Engineer con base técnica como desarrolladora Full Stack. Especializada en Gray Box Testing, análisis de causa raíz, automatización y comunicación técnica fluida con equipos de desarrollo.

Experiencia Laboral Relevante:
- QA Engineer en Avature (Mayo 2023 - Presente): Plataforma SaaS global de RRHH. Pruebas técnicas y funcionales, Gray Box Testing analizando código PHP. Gestión de versiones con Git.
- Analista QA en White Canvas (Sept 2022 - Mayo 2023): STLC completo en apps web. Diseño, ejecución y reporte de casos de prueba y bugs. Definición de criterios de aceptación.
- Desarrolladora Full Stack en Huerto Market (Dic 2020 - Mayo 2021): Node.js, Express, MySQL.
- Help Desk Support en Accenture (Ago 2021 - Sept 2022): Troubleshooting, soporte Nivel 1 y 2.

Habilidades y Stack Tecnológico:
- Testing: QA Manual y Exploratorio, Gray Box Testing, API Testing (Postman), Smoke & Regression.
- Automatización: Playwright (JavaScript) - TesterTestarudo.
- Tecnologías y Lenguajes: JavaScript, Node.js, PHP (lectura/análisis), SQL/MySQL, HTML5, CSS3, Git/GitHub.
- Idiomas: Inglés (Bilingüe/Traductora Pública), Italiano (Avanzado), Español (Nativo).

Restricciones Contractuales (Filtros Duros - RECHAZO INMEDIATO si no se cumplen):
- ACEPTA: Relación de dependencia o Contractor (nacional/internacional).
- RECHAZA (Inviable): Monotributo puro, Autónomo local, Freelance por hora, proyectos cerrados temporales.
- MODALIDAD (Inviable si es mayor a 1 día de presencialidad): Remoto 100% o Híbrido con máximo 1 día presencial semanal.
`;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export async function evaluateJobWithFallback(jobDetails) {
  let attempts = 0; // Controla cuántos modelos del pool hemos quemado en esta oferta

  const prompt = `
Evalúa la siguiente oferta de trabajo frente al perfil de la candidata especificada.
Devuelve un JSON estrictamente estructurado según el esquema.
Calcula el match_score (0-100) priorizando el stack tecnológico (QA Manual, Playwright, JS, SQL, API Testing), seniority e idiomas.
Si la oferta incluye alguna restricción de "RECHAZO INMEDIATO" (ej. presencialidad > 1 día/semana o Monotributo puro), el campo es_viable debe ser false y el match_score debe bajar drásticamente (menos de 75).

${PERFIL_CANDIDATA}

---
DESCRIPCIÓN DEL EMPLEO:
Título: ${jobDetails.title}
Empresa: ${jobDetails.company}
Descripción completa:
${jobDetails.description}
`;

  while (attempts < MODEL_POOL.length) {
    const modelName = MODEL_POOL[currentModelIndex];
    let retries503 = 0;
    
    while (retries503 <= 2) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig });
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
      } catch (error) {
        const is429 = error.message?.includes('429') || error.status === 429;
        const is503 = error.message?.includes('503') || error.status === 503 || error.message?.includes('500') || error.status === 500;

        if (is429) {
          console.warn(`[WARN] Cuota agotada (429) en ${modelName}. Rotando al siguiente...`);
          currentModelIndex = (currentModelIndex + 1) % MODEL_POOL.length;
          attempts++;
          break; // Rompe el inner loop para rotar de modelo
        } else if (is503) {
          if (retries503 < 2) {
            retries503++;
            console.warn(`[WARN] Google saturado (503/500) en ${modelName}. Reintentando en 5s... (Intento ${retries503}/2)`);
            await sleep(5000);
          } else {
            console.warn(`[WARN] Falló el modelo ${modelName} tras 2 reintentos (503 persistente). Rotando al siguiente...`);
            currentModelIndex = (currentModelIndex + 1) % MODEL_POOL.length;
            attempts++;
            break; // Rompe el inner loop para rotar de modelo
          }
        } else {
          // Si es un error 400 (Bad Request), parseo JSON, u otro
          console.error(`[ERROR] Error inesperado (ej. 400 o JSON inválido) con ${modelName}:`, error.message);
          return null; // Descarta la oferta y no quema los demás modelos
        }
      }
    }
  }

  console.error("[ERROR] Se agotaron las cuotas en todos los modelos del pool para este ciclo.");
  return null;
}
