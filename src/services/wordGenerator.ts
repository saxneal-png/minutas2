import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';
import { MinutaData } from './gemini';

export const generateWordDocument = async (
  templateUri: string | null,
  data: MinutaData,
  outputFileName = 'Minuta_Reunion'
) => {
  let templateBase64 = '';

  if (templateUri) {
    if (Platform.OS === 'web') {
      if (templateUri.startsWith('data:')) {
        templateBase64 = templateUri.split(',')[1];
      } else {
        const response = await fetch(templateUri);
        const blob = await response.blob();
        templateBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } else {
      templateBase64 = await FileSystem.readAsStringAsync(templateUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
  }

  // Si no hay plantilla personalizada, crear una estructura docx básica o usar PizZip
  let doc: Docxtemplater;
  let zip: PizZip;

  if (templateBase64) {
    const binaryString = Buffer.from(templateBase64, 'base64').toString('binary');
    zip = new PizZip(binaryString);
    doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  } else {
    // Plantilla DOCX mínima predeterminada embebida
    const defaultDocxXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>MINUTA DE REUNIÓN</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>ASUNTO: </w:t></w:r><w:r><w:t>{asunto}</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>FECHA: </w:t></w:r><w:r><w:t>{fecha}</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>  |  HORA: </w:t></w:r><w:r><w:t>{hora}</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>LUGAR: </w:t></w:r><w:r><w:t>{lugar}</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>ASISTENTES: </w:t></w:r><w:r><w:t>{asistentes}</w:t></w:r></w:p>
    <w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="003366"/></w:pBdr></w:pPr></w:p>
    <w:p><w:r><w:rPr><w:b/><w:color w:val="003366"/><w:sz w:val="26"/></w:rPr><w:t>1. RESUMEN Y CONTEXTO</w:t></w:r></w:p>
    <w:p><w:r><w:t>{detalles}</w:t></w:r></w:p>
    <w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="003366"/></w:pBdr></w:pPr></w:p>
    <w:p><w:r><w:rPr><w:b/><w:color w:val="003366"/><w:sz w:val="26"/></w:rPr><w:t>2. ACUERDOS Y COMPROMISOS</w:t></w:r></w:p>
    {#filas}
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>• {tema}: </w:t></w:r><w:r><w:t>{compromiso} (Resp: {responsable} | Plazo: {plazo})</w:t></w:r></w:p>
    {/filas}
  </w:body>
</w:document>`;

    zip = new PizZip();
    zip.file('word/document.xml', defaultDocxXml);
    zip.file(
      '_rels/.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    );
    zip.file(
      '[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    );
    doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  }

  const tagData = {
    ...data,
    // Tags en minúsculas y mayúsculas para compatibilidad con cualquier plantilla DOH
    FECHA: data.fecha,
    HORA: data.hora,
    LUGAR: data.lugar,
    ASUNTO: data.asunto,
    COORDINADOR: data.coordinador || '',
    DETALLES: data.detalles,
    ASISTENTES: data.asistentes,
    filas: data.filas?.map((f) => ({
      tema: f.tema,
      compromiso: f.compromiso,
      responsable: f.responsable || 'No especificado',
      plazo: f.plazo,
      TEMA: f.tema,
      COMPROMISO: f.compromiso,
      RESPONSABLE: f.responsable || 'No especificado',
      PLAZO: f.plazo,
    })),
  };

  doc.render(tagData);

  const generatedBase64 = doc.getZip().generate({ type: 'base64' });
  const sanitizedName = outputFileName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);

  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${generatedBase64}`;
    link.download = `${sanitizedName}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const fileUri = `${FileSystem.documentDirectory}${sanitizedName}.docx`;
    await FileSystem.writeAsStringAsync(fileUri, generatedBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Sharing.shareAsync(fileUri);
  }
};
