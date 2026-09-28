import PizZip from 'pizzip';
import { Buffer } from 'buffer';

export interface MinutaFila {
  tema: string;
  compromiso: string;
  responsable?: string;
  plazo: string;
}

export interface MinutaData {
  fecha: string;
  hora: string;
  lugar: string;
  asunto: string;
  coordinador?: string;
  detalles: string;
  asistentes: string;
  filas: MinutaFila[];
}

export interface SourceFile {
  id: string;
  name: string;
  mimeType: string;
  base64?: string;
  text?: string;
  size?: number;
}

export interface GeminiModelInfo {
  id: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  version?: string;
  category: 'flash' | 'pro' | 'exp' | 'latest' | 'standard';
  isRecommended?: boolean;
}

export interface ModelHealthStatus {
  modelId: string;
  status: 'online' | 'quota_exceeded' | 'error' | 'testing';
  latencyMs?: number;
  errorMessage?: string;
  lastChecked: number;
}

export const DEFAULT_SYSTEM_PROMPT = `Eres el coordinador de una oficina de un servicio de apoyo experto y coordinación de actividades territoriales para el proceso constructivo del embalse zapallar canal matriz y obras anexas.

REGLAS ESTRICTAS DE EXTRACCIÓN Y REDACCIÓN:
1. Formaliza el texto con lenguaje técnico institucional (ingeniería / DOH / MOP). Inicia la redacción de la sesión formalmente considerando expresiones como "Se lleva a cabo sesión de trabajo técnico de carácter administrativo y territorial...".
2. "asunto": DEBE ser ÚNICAMENTE un título corto, formal y representativo de la reunión.
3. "detalles": CRÍTICO: Aquí debe ir TODO el desarrollo detallado y contexto general de los temas tratados. NO DEBES RESUMIR de forma escueta; debes incorporar todo de manera exhaustiva, formal y con la máxima extensión y riqueza técnica posible.
4. "filas" (Tabla de Acuerdos): Desagrega obligatoriamente todos los temas específicos, sus compromisos, responsables y plazos.
5. "asistentes": Lista completa de nombres y cargos/instituciones encontrados, separados por comas.
6. CRÍTICO: Si no encuentras fecha, hora, lugar o cualquier dato, NO escribas "undefined" ni campos vacíos. Escribe siempre "No especificado".
7. CONTEXTO TERRITORIAL: El proyecto se encuentra en el levantamiento y coordinación territorial de la red de canales secundarios para las comunas de El Carmen y San Ignacio. Mantén total neutralidad, rigor y precisión técnica.

Responde ÚNICAMENTE con este formato JSON exacto:
{
  "fecha": "dd/mm/aaaa",
  "hora": "hh:mm",
  "lugar": "...",
  "asunto": "...",
  "coordinador": "...",
  "detalles": "...",
  "asistentes": "...",
  "filas": [
    {
      "tema": "...",
      "compromiso": "...",
      "responsable": "...",
      "plazo": "..."
    }
  ]
}`;

const FALLBACK_MODELS_DETAILED: GeminiModelInfo[] = [
  {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    description: 'Modelo ultrarrápido de última generación con alto rendimiento multimodal.',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    category: 'latest',
    isRecommended: true,
  },
  {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Nueva generación optimizada para velocidad, eficiencia y síntesis profunda.',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    category: 'latest',
    isRecommended: true,
  },
  {
    id: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    description: 'Modelo veloz y altamente eficiente con ventana de 1M tokens.',
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    category: 'flash',
  },
  {
    id: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    description: 'Máxima capacidad de razonamiento técnico y análisis documental exhaustivo.',
    inputTokenLimit: 2097152,
    outputTokenLimit: 8192,
    category: 'pro',
  },
];

/**
 * Consulta en tiempo real los modelos Gemini y sus metadatos detallados para la API Key dada.
 */
export const fetchDetailedModels = async (apiKey: string): Promise<GeminiModelInfo[]> => {
  if (!apiKey || !apiKey.trim()) return FALLBACK_MODELS_DETAILED;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return FALLBACK_MODELS_DETAILED;
    }

    const data = await resp.json();
    const modelsRaw: any[] = data.models || [];
    const detailed: GeminiModelInfo[] = [];

    for (const m of modelsRaw) {
      const methods: string[] = m.supportedGenerationMethods || [];
      if (methods.includes('generateContent')) {
        const rawName: string = m.name || '';
        const id: string = rawName.replace('models/', '');
        const idLower = id.toLowerCase();

        // Filtrar modelos no aptos para minutas/texto (embeddings, imagen generation, etc.)
        if (
          !idLower.includes('embedding') &&
          !idLower.includes('imagen') &&
          !idLower.includes('aqa') &&
          !idLower.includes('learnlm')
        ) {
          let category: GeminiModelInfo['category'] = 'standard';
          if (idLower.includes('2.5') || idLower.includes('2.0')) {
            category = 'latest';
          } else if (idLower.includes('exp') || idLower.includes('thinking')) {
            category = 'exp';
          } else if (idLower.includes('pro')) {
            category = 'pro';
          } else if (idLower.includes('flash')) {
            category = 'flash';
          }

          const isRecommended =
            id === 'gemini-2.0-flash' ||
            id === 'gemini-2.5-flash' ||
            id === 'gemini-1.5-flash';

          detailed.push({
            id,
            displayName: m.displayName || id,
            description: m.description || 'Modelo de Google Gemini para procesamiento inteligente.',
            inputTokenLimit: m.inputTokenLimit || 1048576,
            outputTokenLimit: m.outputTokenLimit || 8192,
            version: m.version,
            category,
            isRecommended,
          });
        }
      }
    }

    // Ordenar con prioridad: Recomendados primero, luego 2.5/2.0, luego 1.5, luego experimentales
    const rankModel = (item: GeminiModelInfo): number => {
      const id = item.id.toLowerCase();
      if (id === 'gemini-2.5-flash') return 1;
      if (id === 'gemini-2.0-flash') return 2;
      if (id === 'gemini-2.5-pro') return 3;
      if (id === 'gemini-2.0-flash-exp') return 4;
      if (id === 'gemini-1.5-flash') return 5;
      if (id === 'gemini-1.5-pro') return 6;
      if (id.includes('2.5')) return 10;
      if (id.includes('2.0')) return 15;
      if (id.includes('1.5')) return 20;
      if (id.includes('exp')) return 30;
      return 40;
    };

    detailed.sort((a, b) => rankModel(a) - rankModel(b));

    return detailed.length > 0 ? detailed : FALLBACK_MODELS_DETAILED;
  } catch (error) {
    console.warn('Error descubriendo modelos detallados Gemini:', error);
    return FALLBACK_MODELS_DETAILED;
  }
};

/**
 * Consulta en tiempo real los nombres de modelos Gemini disponibles (compatibilidad hacia atrás).
 */
export const fetchAvailableModels = async (apiKey: string): Promise<string[]> => {
  const list = await fetchDetailedModels(apiKey);
  return list.map((m) => m.id);
};

/**
 * Ejecuta un Health Check / Test de Latencia en un modelo específico.
 */
export const testModelHealth = async (
  apiKey: string,
  modelId: string
): Promise<ModelHealthStatus> => {
  const start = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey.trim()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'ping' }] }],
        generationConfig: {
          maxOutputTokens: 2,
          temperature: 0.1,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;

    if (response.status === 429) {
      return {
        modelId,
        status: 'quota_exceeded',
        latencyMs,
        errorMessage: 'Límite de cuota excedido (HTTP 429 Rate Limit)',
        lastChecked: Date.now(),
      };
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson.error?.message || response.statusText;
      return {
        modelId,
        status: 'error',
        latencyMs,
        errorMessage: `[${response.status}] ${msg}`,
        lastChecked: Date.now(),
      };
    }

    return {
      modelId,
      status: 'online',
      latencyMs,
      lastChecked: Date.now(),
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;
    const isTimeout = error.name === 'AbortError';
    return {
      modelId,
      status: 'error',
      latencyMs,
      errorMessage: isTimeout ? 'Tiempo de espera agotado (>12s)' : (error.message || 'Error de conexión'),
      lastChecked: Date.now(),
    };
  }
};

/**
 * Ejecuta un Health Check concurrente a toda una lista de modelos.
 */
export const testAllModelsHealth = async (
  apiKey: string,
  modelIds: string[]
): Promise<Record<string, ModelHealthStatus>> => {
  const results: Record<string, ModelHealthStatus> = {};
  const promises = modelIds.map(async (id) => {
    const status = await testModelHealth(apiKey, id);
    results[id] = status;
  });
  await Promise.all(promises);
  return results;
};

/**
 * Extrae texto plano de un archivo Word (.docx) codificado en Base64.
 */
export const extractTextFromDocx = (base64: string): string => {
  try {
    const zip = new PizZip(Buffer.from(base64, 'base64'));
    const docXml = zip.file('word/document.xml')?.asText();
    if (!docXml) return '';
    let text = docXml.replace(/<w:p[^>]*>/g, '\n');
    text = text.replace(/<[^>]+>/g, '');
    return text.trim();
  } catch (error) {
    console.error('Error extrayendo texto de DOCX:', error);
    return '';
  }
};

/**
 * Realiza una llamada directa HTTP REST a la API de Gemini con timeout.
 */
const callGeminiRest = async (
  apiKey: string,
  modelName: string,
  parts: any[],
  systemInstruction?: string,
  timeoutMs = 60000
): Promise<string> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

  const payload: any = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson.error?.message || response.statusText;
      throw new Error(`[${response.status}] ${msg}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) {
      const reason = data.promptFeedback?.blockReason || 'Respuesta bloqueada por filtros de seguridad';
      throw new Error(reason);
    }

    const text = candidate.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini devolvió una respuesta sin contenido.');
    return text;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('La consulta a Gemini superó el tiempo límite de espera (Timeout).');
    }
    throw error;
  }
};

/**
 * Compila y sintetiza MÚLTIPLES fuentes (Archivos PDF, Word, Imágenes, Texto) en una minuta única consolidada.
 */
export const analyzeCompiledSources = async (
  apiKey: string,
  modelName: string,
  files: SourceFile[],
  rawNotes: string,
  systemPrompt = DEFAULT_SYSTEM_PROMPT,
  onProgress?: (status: string) => void,
  discoveredFleet?: string[]
): Promise<MinutaData> => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Por favor ingresa tu API Key de Gemini en Ajustes.');
  }

  if (files.length === 0 && (!rawNotes || !rawNotes.trim())) {
    throw new Error('Debes adjuntar al menos un archivo o ingresar apuntes de texto para compilar.');
  }

  onProgress?.('Preparando y leyendo fuentes...');

  const parts: any[] = [];
  const textCorpus: string[] = [];

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    onProgress?.(`Procesando archivo [${idx + 1}/${files.length}]: ${file.name}...`);

    const isDocx = file.mimeType?.includes('word') || file.mimeType?.includes('officedocument') || file.name.endsWith('.docx');
    const isPdf = file.mimeType?.includes('pdf') || file.name.endsWith('.pdf');
    const isImage = file.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

    if (isDocx && file.base64) {
      const extracted = extractTextFromDocx(file.base64);
      if (extracted) {
        textCorpus.push(`=== FUENTE ${idx + 1} (Documento Word: ${file.name}) ===\n${extracted}\n`);
      }
    } else if (file.text) {
      textCorpus.push(`=== FUENTE ${idx + 1} (Texto: ${file.name}) ===\n${file.text}\n`);
    } else if (isPdf && file.base64) {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: file.base64,
        },
      });
      parts.push({
        text: `--- ADJUNTO DOCUMENTAL ${idx + 1}: ${file.name} ---`,
      });
    } else if (isImage && file.base64) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType || 'image/jpeg',
          data: file.base64,
        },
      });
      parts.push({
        text: `--- ADJUNTO FOTOGRÁFICO / IMAGEN ${idx + 1}: ${file.name} ---`,
      });
    }
  }

  if (rawNotes && rawNotes.trim()) {
    textCorpus.push(`=== APUNTES Y NOTAS DIRECTAS ===\n${rawNotes.trim()}\n`);
  }

  if (textCorpus.length > 0) {
    const consolidated = textCorpus.join('\n');
    parts.unshift({
      text: `A CONTINUACIÓN SE PRESENTAN LOS APUNTES Y DOCUMENTOS RECOPILADOS DE LA REUNIÓN (COMPILACIÓN DE ${files.length} FUENTES + NOTAS). Analízalos conjuntamente para consolidar una única minuta formal exhaustiva:\n\n${consolidated}`,
    });
  } else {
    parts.unshift({
      text: 'Analiza los archivos adjuntos compilados de la reunión y genera la minuta estructurada según las reglas del sistema.',
    });
  }

  // Flota dinámica de fallback
  const baseCandidates = [
    modelName,
    ...(discoveredFleet || []),
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ].filter(Boolean);

  const uniqueModels = Array.from(new Set(baseCandidates));
  let lastError: any = null;
  let rawJson = '';

  for (let i = 0; i < uniqueModels.length; i++) {
    const mod = uniqueModels[i];
    try {
      if (i > 0) {
        onProgress?.(`Reintentando con modelo de respaldo: ${mod}...`);
      } else {
        onProgress?.(`Compilando minuta con ${mod}...`);
      }
      rawJson = await callGeminiRest(apiKey, mod, parts, systemPrompt);
      if (rawJson) break;
    } catch (err: any) {
      lastError = err;
      console.warn(`Fallo con modelo ${mod}:`, err.message);
      // Continuar al siguiente si es error 429, 404, 400, o timeout
      if (
        err.message?.includes('429') ||
        err.message?.includes('404') ||
        err.message?.includes('not found') ||
        err.message?.includes('400') ||
        err.message?.includes('Timeout')
      ) {
        continue;
      }
    }
  }

  if (!rawJson) {
    throw new Error(lastError?.message || 'No fue posible obtener respuesta de los modelos Gemini disponibles.');
  }

  onProgress?.('Estructurando información extraída...');

  let clean = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim();
  let parsed: any;
  try {
    parsed = JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('La respuesta de la IA no contiene una estructura JSON válida.');
    }
  }

  const result: MinutaData = {
    fecha: parsed.fecha || 'No especificado',
    hora: parsed.hora || 'No especificado',
    lugar: parsed.lugar || 'No especificado',
    asunto: parsed.asunto || 'Minuta de Reunión',
    coordinador: parsed.coordinador || 'Coordinador(a) de Reunión',
    detalles: parsed.detalles || 'Sin detalles registrados.',
    asistentes: parsed.asistentes || 'No especificado',
    filas: [],
  };

  if (Array.isArray(parsed.filas)) {
    result.filas = parsed.filas.map((f: any) => ({
      tema: f.tema || f.TEMA || 'Punto tratado',
      compromiso: f.compromiso || f.COMPROMISO || 'Acuerdo',
      responsable: f.responsable || f.RESPONSABLE || 'No especificado',
      plazo: f.plazo || f.PLAZO || 'No especificado',
    }));
  }

  return result;
};
