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
import {
  fetchDetailedModels,
  testModelHealth,
  testAllModelsHealth,
  sanitizeModelId,
  GeminiModelInfo,
  ModelHealthStatus,
} from '../../src/services/gemini';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS } from '../../src/theme/colors';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<GeminiModelInfo[]>([]);
  const [selectedDefaultModel, setSelectedDefaultModel] = useState('gemini-3.8-flash');
  const [healthMap, setHealthMap] = useState<Record<string, ModelHealthStatus>>({});
  
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testingAll, setTestingAll] = useState(false);
  const [testingSingle, setTestingSingle] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const notify = (msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Configuración', msg);
    }
  };

  const loadSettings = async () => {
    try {
      const key = await AsyncStorage.getItem('gemini_api_key');
      const savedModel = await AsyncStorage.getItem('selected_gemini_model');
      const cachedModelsJson = await AsyncStorage.getItem('cached_gemini_models');
      const lastScan = await AsyncStorage.getItem('last_models_scan_time');
      const tpl = await AsyncStorage.getItem('template_name');

      if (key) setApiKey(key);
      if (savedModel) {
        const sanitized = sanitizeModelId(savedModel);
        setSelectedDefaultModel(sanitized);
        if (sanitized !== savedModel) {
          await AsyncStorage.setItem('selected_gemini_model', sanitized);
        }
      }
      if (tpl) setTemplateName(tpl);
      if (lastScan) setLastScanTime(lastScan);

      if (cachedModelsJson) {
        try {
          const parsed = JSON.parse(cachedModelsJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setModels(parsed);
          }
        } catch {
          // ignore error
        }
      }

      if (key) {
        syncModels(key);
      }
    } catch (e) {
      console.warn('Error loading settings:', e);
    }
  };

  const syncModels = async (keyToUse?: string) => {
    const activeKey = (keyToUse || apiKey).trim();
    if (!activeKey) {
      notify('Debes ingresar una clave de API primero.');
      return;
    }

    setLoadingModels(true);
    try {
      const detailed = await fetchDetailedModels(activeKey);
      setModels(detailed);
      await AsyncStorage.setItem('cached_gemini_models', JSON.stringify(detailed));
      
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastScanTime(nowStr);
      await AsyncStorage.setItem('last_models_scan_time', nowStr);

      // Si el modelo por defecto no está en la lista descubierta, asignar el recomendado
      const exists = detailed.some((m) => m.id === selectedDefaultModel);
      if (!exists && detailed.length > 0) {
        const topModel = detailed.find((m) => m.isRecommended)?.id || detailed[0].id;
        setSelectedDefaultModel(topModel);
        await AsyncStorage.setItem('selected_gemini_model', topModel);
      }
    } catch (e: any) {
      notify(`Error sincronizando modelos: ${e.message}`);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      notify('Debes ingresar una clave de API válida.');
      return;
    }
    await AsyncStorage.setItem('gemini_api_key', apiKey.trim());
    notify('API Key guardada correctamente.');
    syncModels(apiKey.trim());
  };

  const handleSelectDefaultModel = async (modelId: string) => {
    setSelectedDefaultModel(modelId);
    await AsyncStorage.setItem('selected_gemini_model', modelId);
    notify(`Modelo predeterminado actualizado a: ${modelId}`);
  };

  const handleTestSingleModel = async (modelId: string) => {
    if (!apiKey.trim()) {
      notify('Ingresa y guarda tu API Key primero.');
      return;
    }

    setTestingSingle(modelId);
    try {
      const status = await testModelHealth(apiKey.trim(), modelId);
      setHealthMap((prev) => ({ ...prev, [modelId]: status }));
    } catch (e: any) {
      setHealthMap((prev) => ({
        ...prev,
        [modelId]: {
          modelId,
          status: 'error',
          errorMessage: e.message,
          lastChecked: Date.now(),
        },
      }));
    } finally {
      setTestingSingle(null);
    }
  };

  const handleTestAllModels = async () => {
    if (!apiKey.trim()) {
      notify('Ingresa tu API Key primero.');
      return;
    }
    if (models.length === 0) {
      await syncModels();
    }

    setTestingAll(true);
    try {
      const ids = models.map((m) => m.id);
      const results = await testAllModelsHealth(apiKey.trim(), ids);
      setHealthMap(results);
    } catch (e: any) {
      notify(`Error diagnosticando flota: ${e.message}`);
    } finally {
      setTestingAll(false);
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

  const formatTokens = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.0', '')}M tokens`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k tokens`;
    return `${num} tokens`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* API Key Card */}
      <Card>
        <View style={styles.cardHeader}>
          <Ionicons name="key-outline" size={22} color={COLORS.primaryLight} />
          <Text style={styles.cardTitle}>Conexión con Google AI Studio</Text>
        </View>
        <Text style={styles.description}>
          Ingresa tu clave de API de Google Gemini para habilitar el motor de análisis, la detección de modelos actualizados y el monitoreo de salud en tiempo real.
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
            title="Guardar y Sincronizar"
            onPress={handleSaveKey}
            style={{ flex: 1 }}
            disabled={loadingModels}
          />
        </View>
      </Card>

      {/* Model Fleet & Live Health Monitor Card */}
      <Card style={{ marginTop: 20 }}>
        <View style={styles.cardHeaderBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="pulse" size={22} color={COLORS.secondary} />
            <Text style={styles.cardTitle}>Monitor de Modelos IA y Cuotas</Text>
          </View>
          {lastScanTime && (
            <Text style={styles.scanTimeText}>
              Último escaneo: {lastScanTime}
            </Text>
          )}
        </View>

        <Text style={styles.description}>
          Inspecciona los modelos disponibles para tu API Key, verifica su latencia y comprueba si disponen de cuota activa.
        </Text>

        {/* Action Controls for Fleet */}
        <View style={styles.fleetActionsRow}>
          <TouchableOpacity
            style={[styles.smallActionBtn, styles.syncBtn]}
            onPress={() => syncModels()}
            disabled={loadingModels || testingAll}
          >
            {loadingModels ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="sync" size={15} color={COLORS.white} />
                <Text style={styles.smallActionBtnText}>Actualizar Modelos</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallActionBtn, styles.healthBtn]}
            onPress={handleTestAllModels}
            disabled={testingAll || loadingModels || models.length === 0}
          >
            {testingAll ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="speedometer-outline" size={15} color={COLORS.white} />
                <Text style={styles.smallActionBtnText}>Diagnosticar Todos (Ping)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Models List */}
        <View style={styles.modelsContainer}>
          {models.length === 0 && !loadingModels && (
            <View style={styles.emptyBox}>
              <Ionicons name="cloud-offline-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                No hay modelos cargados. Ingresa tu API Key y presiona "Guardar y Sincronizar".
              </Text>
            </View>
          )}

          {models.map((m) => {
            const health = healthMap[m.id];
            const isSelected = selectedDefaultModel === m.id;
            const isTestingThis = testingSingle === m.id;

            return (
              <View
                key={m.id}
                style={[
                  styles.modelItemCard,
                  isSelected && styles.modelItemCardActive,
                ]}
              >
                {/* Header Row */}
                <View style={styles.modelHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.modelTitleRow}>
                      <Text style={styles.modelName}>{m.displayName}</Text>
                      {m.isRecommended && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedBadgeText}>Recomendado</Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.categoryBadge,
                          m.category === 'latest'
                            ? styles.catLatest
                            : m.category === 'pro'
                            ? styles.catPro
                            : m.category === 'exp'
                            ? styles.catExp
                            : styles.catFlash,
                        ]}
                      >
                        <Text style={styles.categoryBadgeText}>
                          {m.category.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.modelIdSubtext}>{m.id}</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.setDefaultBtn,
                      isSelected && styles.setDefaultBtnActive,
                    ]}
                    onPress={() => handleSelectDefaultModel(m.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'radio-button-off'}
                      size={16}
                      color={isSelected ? COLORS.white : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.setDefaultText,
                        isSelected && styles.setDefaultTextActive,
                      ]}
                    >
                      {isSelected ? 'Predeterminado' : 'Elegir'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <Text style={styles.modelDescText} numberOfLines={2}>
                  {m.description}
                </Text>

                {/* Meta & Health Footer */}
                <View style={styles.modelFooterRow}>
                  <View style={styles.tokenPill}>
                    <Ionicons name="document-text-outline" size={13} color={COLORS.secondaryLight} />
                    <Text style={styles.tokenPillText}>
                      Contexto: {formatTokens(m.inputTokenLimit)}
                    </Text>
                  </View>

                  {/* Health status badge */}
                  <View style={styles.healthStatusArea}>
                    {health ? (
                      <View
                        style={[
                          styles.healthBadge,
                          health.status === 'online'
                            ? styles.healthOnline
                            : health.status === 'quota_exceeded'
                            ? styles.healthQuota
                            : styles.healthError,
                        ]}
                      >
                        <View
                          style={[
                            styles.healthDot,
                            health.status === 'online'
                              ? styles.dotOnline
                              : health.status === 'quota_exceeded'
                              ? styles.dotQuota
                              : styles.dotError,
                          ]}
                        />
                        <Text style={styles.healthBadgeText}>
                          {health.status === 'online'
                            ? `Online (${health.latencyMs}ms)`
                            : health.status === 'quota_exceeded'
                            ? 'Cuota Excedida'
                            : 'Error'}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.pingBtn}
                        onPress={() => handleTestSingleModel(m.id)}
                        disabled={isTestingThis || testingAll}
                      >
                        {isTestingThis ? (
                          <ActivityIndicator size="small" color={COLORS.secondaryLight} />
                        ) : (
                          <>
                            <Ionicons name="play-outline" size={12} color={COLORS.secondaryLight} />
                            <Text style={styles.pingBtnText}>Test Ping</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Error message if test failed */}
                {health?.errorMessage && (
                  <Text style={styles.healthErrorMsg} numberOfLines={1}>
                    {health.errorMessage}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
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
  cardHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.white,
    marginLeft: 8,
  },
  scanTimeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
  fleetActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  syncBtn: {
    backgroundColor: COLORS.primary,
    flex: 1,
  },
  healthBtn: {
    backgroundColor: COLORS.surfaceHover,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1.2,
  },
  smallActionBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  modelsContainer: {
    gap: 12,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  modelItemCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modelItemCardActive: {
    borderColor: COLORS.primaryLight,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  modelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  modelName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  modelIdSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  recommendedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  recommendedBadgeText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  catLatest: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  catPro: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  catExp: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  catFlash: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  categoryBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  setDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  setDefaultBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  setDefaultText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  setDefaultTextActive: {
    color: COLORS.white,
  },
  modelDescText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 8,
    lineHeight: 18,
  },
  modelFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tokenPillText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  healthStatusArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    gap: 4,
  },
  pingBtnText: {
    fontSize: 11,
    color: COLORS.secondaryLight,
    fontWeight: '600',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
    borderWidth: 1,
  },
  healthOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  healthQuota: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  healthError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  healthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOnline: {
    backgroundColor: COLORS.success,
  },
  dotQuota: {
    backgroundColor: COLORS.warning,
  },
  dotError: {
    backgroundColor: COLORS.error,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  healthErrorMsg: {
    fontSize: 10,
    color: COLORS.error,
    marginTop: 6,
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
