import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { fetchAvailableModels } from '../../src/services/gemini';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS } from '../../src/theme/colors';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; models: string[] } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('gemini_api_key').then((val) => val && setApiKey(val));
    AsyncStorage.getItem('template_name').then((val) => val && setTemplateName(val));
  }, []);

  const notify = (msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Configuración', msg);
    }
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      notify('Debes ingresar una clave de API válida.');
      return;
    }
    await AsyncStorage.setItem('gemini_api_key', apiKey.trim());
    notify('API Key guardada correctamente.');
    handleTestConnection();
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      notify('Ingresa una API Key primero.');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const models = await fetchAvailableModels(apiKey.trim());
      if (models.length > 0) {
        setTestResult({
          success: true,
          message: `¡Conexión exitosa! Se detectaron ${models.length} modelos Gemini activos.`,
          models,
        });
      } else {
        setTestResult({
          success: false,
          message: 'No se encontraron modelos disponibles con esta clave.',
          models: [],
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Error de conexión: ${e.message}`,
        models: [],
      });
    } finally {
      setTesting(false);
    }
  };

  const selectTemplate = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await AsyncStorage.setItem('template_uri', asset.uri);
        await AsyncStorage.setItem('template_name', asset.name);
        setTemplateName(asset.name);
        notify(`Plantilla "${asset.name}" configurada.`);
      }
    } catch (e: any) {
      notify(`Error seleccionando plantilla: ${e.message}`);
    }
  };

  const handleClearTemplate = async () => {
    await AsyncStorage.removeItem('template_uri');
    await AsyncStorage.removeItem('template_name');
    setTemplateName(null);
    notify('Plantilla restablecida a la predeterminada.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* API Key Card */}
      <Card>
        <View style={styles.cardHeader}>
          <Ionicons name="key-outline" size={22} color={COLORS.primaryLight} />
          <Text style={styles.cardTitle}>Conexión con Google Gemini</Text>
        </View>
        <Text style={styles.description}>
          Ingresa tu clave de API de Google AI Studio para activar el motor de análisis y compilación.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            placeholder="AIzaSyB..."
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.buttonsRow}>
          <Button
            title="Guardar y Probar"
            onPress={handleSaveKey}
            style={{ flex: 1 }}
            disabled={testing}
          />
        </View>

        {testing && (
          <View style={styles.testingContainer}>
            <ActivityIndicator size="small" color={COLORS.secondaryLight} />
            <Text style={styles.testingText}>Consultando modelos en Google AI Studio...</Text>
          </View>
        )}

        {testResult && (
          <View
            style={[
              styles.resultBox,
              testResult.success ? styles.resultBoxSuccess : styles.resultBoxError,
            ]}
          >
            <Ionicons
              name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={testResult.success ? COLORS.success : COLORS.error}
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text
                style={[
                  styles.resultText,
                  { color: testResult.success ? COLORS.success : COLORS.error },
                ]}
              >
                {testResult.message}
              </Text>
              {testResult.models.length > 0 && (
                <Text style={styles.modelsListText}>
                  Modelos: {testResult.models.slice(0, 4).join(', ')}
                </Text>
              )}
            </View>
          </View>
        )}
      </Card>

      {/* Word Template Card */}
      <Card style={{ marginTop: 20 }}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text-outline" size={22} color={COLORS.secondaryLight} />
          <Text style={styles.cardTitle}>Plantilla Oficial Word (.docx)</Text>
        </View>
        <Text style={styles.description}>
          Sube tu plantilla institucional con encabezado y formato DOH. Se insertarán automáticamente
          los campos: {'{asunto}'}, {'{fecha}'}, {'{hora}'}, {'{lugar}'}, {'{detalles}'}, {'{asistentes}'} y la tabla de {'{#filas}'}.
        </Text>

        {templateName ? (
          <View style={styles.templateStatus}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.templateText} numberOfLines={1}>
              {templateName}
            </Text>
            <TouchableOpacity onPress={handleClearTemplate}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.templateDefaultBox}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.templateDefaultText}>
              Usando plantilla predeterminada del sistema.
            </Text>
          </View>
        )}

        <Button
          title={templateName ? 'Cambiar Plantilla Word' : 'Seleccionar Plantilla Word'}
          onPress={selectTemplate}
          variant={templateName ? 'outline' : 'primary'}
          style={{ marginTop: 14 }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 50 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.white,
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  input: {
    padding: 14,
    fontSize: 14,
    color: COLORS.white,
  },
  buttonsRow: {
    marginTop: 14,
  },
  testingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  testingText: {
    fontSize: 13,
    color: COLORS.secondaryLight,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 1,
  },
  resultBoxSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resultBoxError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resultText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modelsListText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  templateStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 8,
  },
  templateText: {
    flex: 1,
    color: COLORS.success,
    fontWeight: '600',
    fontSize: 13,
  },
  templateDefaultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  templateDefaultText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
