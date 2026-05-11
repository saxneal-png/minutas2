import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';

export const generateWordDocument = async (templateUri: string, data: any, outputFileName: string) => {
  let templateBase64 = '';

  if (Platform.OS === 'web') {
    // En web, la URI devuelta por DocumentPicker suele ser un Data URL (base64) o un Blob URL
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
    templateBase64 = await FileSystem.readAsStringAsync(templateUri, { encoding: FileSystem.EncodingType.Base64 });
  }

  const binaryString = Buffer.from(templateBase64, 'base64').toString('binary');
  const zip = new PizZip(binaryString);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  doc.render({
    ...data,
    filas: data.filas?.map((f: any) => ({
      TEMA: f.tema,
      COMPROMISO: f.compromiso,
      PLAZO: f.plazo
    }))
  });

  const generatedBase64 = doc.getZip().generate({ type: 'base64' });

  if (Platform.OS === 'web') {
    // Descarga directa en el navegador
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${generatedBase64}`;
    link.download = `${outputFileName}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Guardar y compartir en dispositivos móviles
    const fileUri = `${FileSystem.documentDirectory}${outputFileName}.docx`;
    await FileSystem.writeAsStringAsync(fileUri, generatedBase64, { encoding: FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(fileUri);
  }
};
