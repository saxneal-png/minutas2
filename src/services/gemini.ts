import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_NAME = 'gemini-3.1-pro-preview';

export interface MinutaFila {
  tema: string;
  compromiso: string;
  plazo: string;
}

export interface MinutaData {
  fecha: string;
  hora: string;
  lugar: string;
  asunto: string;
  detalles: string;
  asistentes: string;
  filas: MinutaFila[];
}

export const analyzeDocumentWithGemini = async (apiKey: string, fileBase64: string, mimeType: string): Promise<MinutaData | null> => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    });

    const prompt = `Eres el coordinador de una oficina de un servicio de apoyo experto y coordinación de actividades territoriales para el proceso constructivo del embalse zapallar canal matriz y obras anexas.
  
    REGLAS ESTRICTAS DE EXTRACCIÓN:
    1. Formaliza el texto con lenguaje técnico (ingeniería/DOH) e inicia la redacción de cada sesión   considerando textos como "se lleva acabo sesión de trabajo técnico de caracter administrativo y territorial". La profesional que realiza estas minutas no es funcionaria de la DOH sino que es la coordinadora de oficina de actividades territoriales 
    2. "asunto": DEBE ser ÚNICAMENTE un título corto y representativo.
    3. "detalles": CRÍTICO: Aquí debe ir TODO lo que habla el contexto general de la reunión. NO DEBES RESUMIR, debes incorporar todo a modo de texto, parafraseando si es necesario para lograr mayor formalidad y extensión. El texto debe ser detallado y abundante. El texto no debe ser de menor extensión que las notas de origen.
    4. "filas" (Tabla): Desagrega obligatoriamente todos los temas específicos, sus compromisos y plazos.
    5. "asistentes": Lista los nombres encontrados separados por comas.
    6. CRÍTICO: Si no encuentras la fecha, la hora, el lugar o cualquier otro dato en el documento, NO ESCRIBAS "undefined". Escribe siempre "No especificado".
    7. CONTEXTO ACTUAL Y OBJETIVIDAD: Considera que en estos momentos el proyecto está en el levantamiento de información de la red de canales secundarios para las comunas de El Carmen y San Ignacio. Debes ser muy objetivo y neutral en el análisis de los apuntes analizados.
  
    Responde SOLO con este JSON exacto: 
    {
      "fecha": "dd/mm/aaaa", "hora": "hh:mm", "lugar": "...", "asunto": "...", "detalles": "...", "asistentes": "...",
      "filas": [{"tema": "...", "compromiso": "...", "plazo": "..."}]
    }`;

    const part = { inlineData: { data: fileBase64, mimeType: mimeType.includes('officedocument') ? 'text/plain' : mimeType } };
    const result = await model.generateContent([prompt, part]);
    const response = await result.response;
    const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text) as MinutaData;
  } catch (error) {
    console.error('❌ Error en Gemini:', error);
    throw new Error('Fallo al procesar con IA. Verifica tu API Key.');
  }
};
