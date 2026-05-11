import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export const pickAndProcessDocument = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets) return null;
    const file = result.assets[0];

    let base64 = '';
    
    // En la Web, expo-file-system no funciona igual, usamos FileReader nativo
    if (Platform.OS === 'web') {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Para Android/iOS
      base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
    }

    return { name: file.name, mimeType: file.mimeType || 'application/pdf', base64, uri: file.uri };
  } catch (error) {
    console.error(error);
    throw new Error('No se pudo leer el documento. Intenta de nuevo.');
  }
};
