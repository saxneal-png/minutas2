import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS } from '../../src/theme/colors';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [templateName, setTemplateName] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('gemini_api_key').then(val => val && setApiKey(val));
    AsyncStorage.getItem('template_uri').then(val => val && setTemplateName('Plantilla configurada'));
  }, []);

  const saveKey = (key: string) => {
    setApiKey(key);
    AsyncStorage.setItem('gemini_api_key', key);
  };

  const selectTemplate = async () => {
    const result = await DocumentPicker.getDocumentAsync({ 
      type: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
      copyToCacheDirectory: true 
    });
    if (!result.canceled && result.assets) {
      await AsyncStorage.setItem('template_uri', result.assets[0].uri);
      setTemplateName(result.assets[0].name);
      Alert.alert('Éxito', 'Plantilla guardada correctamente.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.cardHeader}>
          <Ionicons name="key-outline" size={24} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Configuración de IA</Text>
        </View>
        <Text style={styles.description}>
          Ingresa tu clave de API de Gemini para habilitar el análisis de documentos.
        </Text>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input} 
            value={apiKey} 
            onChangeText={saveKey} 
            secureTextEntry 
            placeholder="AIzaSyB..."
            placeholderTextColor={COLORS.textLight}
          />
        </View>
      </Card>
      
      <Card>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text-outline" size={24} color={COLORS.secondary} />
          <Text style={styles.cardTitle}>Plantilla Word</Text>
        </View>
        <Text style={styles.description}>
          Selecciona un documento de Word (.docx) base que se usará para generar las minutas.
        </Text>
        
        {templateName && (
          <View style={styles.templateStatus}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.templateText}>{templateName}</Text>
          </View>
        )}

        <Button 
          title="Seleccionar Plantilla" 
          onPress={selectTemplate} 
          variant={templateName ? "outline" : "primary"}
          style={{marginTop: 16}}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingBottom: 40 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: COLORS.text, 
    marginLeft: 8 
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  input: { 
    padding: 16, 
    fontSize: 16,
    color: COLORS.text,
  },
  templateStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  templateText: {
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  }
});
