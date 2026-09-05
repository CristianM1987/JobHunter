import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
];

function getRandomHeaders() {
  return {
    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  };
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchJobListings() {
  console.log("Buscando empleos en LinkedIn...");
  const keywords = encodeURIComponent('"QA Engineer" OR "Quality Assurance" OR "QA Analyst" OR "Manual QA"');
  const location = encodeURIComponent('Argentina');
  
  const jobs = [];
  const targetJobs = Math.floor(Math.random() * 11) + 25; // Entre 25 y 35
  let start = 0;
  
  while (jobs.length < targetJobs) {
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keywords}&location=${location}&f_TPR=r259200&f_WT=2%2C3&start=${start}`;
    
    try {
      const response = await axios.get(url, { headers: getRandomHeaders() });
      const $ = cheerio.load(response.data);
      let foundInPage = 0;

      $('li').each((index, element) => {
        const jobCard = $(element).find('.base-card');
        const jobId = jobCard.attr('data-entity-urn')?.split(':').pop();
        const title = $(element).find('.base-search-card__title').text().trim();
        const company = $(element).find('.base-search-card__subtitle').text().trim();
        const loc = $(element).find('.job-search-card__location').text().trim();
        
        if (jobId && !jobs.find(j => j.id === jobId)) {
          jobs.push({ id: jobId, title, company, location: loc, url: `https://www.linkedin.com/jobs/view/${jobId}` });
          foundInPage++;
        }
      });
      
      if (foundInPage === 0) break; // Si no trae más, sale del loop
      start += 25;
      await sleep(2000); // Pausa leve entre páginas de búsqueda
    } catch (error) {
      console.error("Error al obtener la lista de empleos:", error.message);
      break;
    }
  }
  
  const finalJobs = jobs.slice(0, targetJobs);
  console.log(`Se encontraron ${finalJobs.length} empleos en la búsqueda principal.`);
  return finalJobs;
}

export async function fetchJobDetails(jobId) {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
  try {
    // Delay movido a index.js según solicitud del usuario

    const response = await axios.get(url, { headers: getRandomHeaders() });
    const $ = cheerio.load(response.data);
    
    const descriptionText = $('.show-more-less-html__markup').text().trim().replace(/\s+/g, ' ');
    return descriptionText;
  } catch (error) {
    if (error.response && error.response.status === 404) {
        console.warn(`Empleo ${jobId} ya no está disponible (404).`);
        return null;
    }
    console.error(`Error al obtener detalles para ${jobId}:`, error.message);
    return null;
  }
}
