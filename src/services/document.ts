import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { SourceFile } from './gemini';

export const pickDocuments = async (allowMultiple = true): Promise<SourceFile[]> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'image/*',
      ],
      multiple: allowMultiple,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    const processedFiles: SourceFile[] = [];

    for (const asset of result.assets) {
      let base64 = '';
      let textContent = '';

      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        if (asset.name.endsWith('.txt')) {
          textContent = await blob.text();
        } else {
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              resolve(res.includes(',') ? res.split(',')[1] : res);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } else {
        if (asset.name.endsWith('.txt')) {
          textContent = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
        } else {
          base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        }
      }

      processedFiles.push({
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: asset.name,
        mimeType: asset.mimeType || (asset.name.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'),
        base64: base64 || undefined,
        text: textContent || undefined,
        size: asset.size,
      });
    }

    return processedFiles;
  } catch (error) {
    console.error('Error seleccionando documentos:', error);
    throw new Error('No se pudo cargar el archivo seleccionado. Por favor reintenta.');
  }
};
