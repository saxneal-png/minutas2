import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { pickAndProcessDocument } from '../../src/services/document';
import { analyzeDocumentWithGemini } from '../../src/services/gemini';
import { generateWordDocument } from '../../src/services/wordGenerator';
import { saveToHistory } from '../../src/services/history';
import { notifyBotMinuta } from '../../src/services/notification';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS } from '../../src/theme/colors';

export default function Analyze() {
  const [loading, setLoading] = useState(false);
  const [minuta, setMinuta] = useState<any>(null);
  const [step, setStep] = useState(0);

  const handleProcess = async () => {
    const apiKey = await AsyncStorage.getItem('gemini_api_key');
    if (!apiKey) {
      if (Platform.OS === 'web') {
        window.alert('Error: Configura tu API Key en la pestaña Ajustes primero.');
      } else {
        Alert.alert('Error', 'Configura tu API Key en Ajustes.');
      }
      return;
    }

    try {
      setLoading(true);
      setStep(1);
      const doc = await pickAndProcessDocument();
      if (!doc) {
        setStep(0);
        return;
      }

      setStep(2);
      const result = await analyzeDocumentWithGemini(apiKey, doc.base64, doc.mimeType);
      setMinuta(result);
      if (result) {
        setStep(3);
        await saveToHistory(result, doc.name);
      }
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert(e.message);
      } else {
        Alert.alert('Error', e.message);
      }
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    const templateUri = await AsyncStorage.getItem('template_uri');
    if (!templateUri) return Alert.alert('Error', 'Selecciona una plantilla en Ajustes.');
    
    try {
      setLoading(true);
      await generateWordDocument(templateUri, minuta, `Minuta_${minuta.asunto}`);
      Alert.alert('Éxito', 'Documento Word generado y listo para compartir.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMinuta(null);
    setStep(0);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!minuta ? (
        <Card style={styles.uploadCard}>
          <View style={styles.uploadIconContainer}>
            <Ionicons name="cloud-upload-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.uploadTitle}>Sube un Documento</Text>
          <Text style={styles.uploadText}>Soporta PDF, PNG o JPEG. Analizaremos el contenido automáticamente.</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>
                {step === 1 ? 'Cargando documento...' : 'Analizando con IA...'}
              </Text>
            </View>
          ) : (
            <Button 
              title="Seleccionar y Analizar" 
              onPress={handleProcess} 
              style={{marginTop: 24, width: '100%'}} 
            />
          )}
        </Card>
      ) : (
        <View style={styles.resultContainer}>
          <Card>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
              <Text style={styles.successTitle}>Análisis Completado</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Asunto Detectado</Text>
              <Text style={styles.fieldValue}>{minuta.asunto}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Resumen General</Text>
              <Text style={styles.fieldValue}>{minuta.detalles}</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Acuerdos Extraídos</Text>
              <Text style={styles.fieldValue}>{minuta.filas?.length || 0} acuerdos encontrados.</Text>
            </View>
          </Card>
          
          <View style={styles.actionButtons}>
            <Button 
              title="Generar Documento Word" 
              onPress={handleGenerate} 
              loading={loading}
            />
            <Button 
              title="Analizar Otro" 
              onPress={reset} 
              variant="outline"
              style={{marginTop: 16}}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24 },
  uploadCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  uploadIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryLight + '20', // 20% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  uploadText: { fontSize: 16, color: COLORS.textLight, textAlign: 'center', paddingHorizontal: 20 },
  loadingContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  resultContainer: {
    flex: 1,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginLeft: 12,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  actionButtons: {
    marginTop: 8,
  }
});
