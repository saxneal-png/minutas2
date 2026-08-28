import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { pickDocuments } from '../../src/services/document';
import {
  analyzeCompiledSources,
  fetchAvailableModels,
  SourceFile,
  MinutaData,
  MinutaFila,
} from '../../src/services/gemini';
import { generateWordDocument } from '../../src/services/wordGenerator';
import { saveToHistory } from '../../src/services/history';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS } from '../../src/theme/colors';

export default function Analyze() {
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<string[]>(['gemini-2.0-flash', 'gemini-1.5-flash']);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [isSelectingModel, setIsSelectingModel] = useState(false);

  const [files, setFiles] = useState<SourceFile[]>([]);
  const [rawNotes, setRawNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const [minuta, setMinuta] = useState<MinutaData | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const key = await AsyncStorage.getItem('gemini_api_key');
      if (key) {
        setApiKey(key);
        const discovered = await fetchAvailableModels(key);
        if (discovered.length > 0) {
          setModels(discovered);
          const savedModel = await AsyncStorage.getItem('selected_gemini_model');
          if (savedModel && discovered.includes(savedModel)) {
            setSelectedModel(savedModel);
          } else {
            setSelectedModel(discovered[0]);
          }
        }
      }
    } catch (e) {
      console.warn('Error loading settings:', e);
    }
  };

  const handleSelectModel = async (model: string) => {
    setSelectedModel(model);
    setIsSelectingModel(false);
    await AsyncStorage.setItem('selected_gemini_model', model);
  };

  const handleAddFiles = async () => {
    try {
      const picked = await pickDocuments(true);
      if (picked && picked.length > 0) {
        setFiles((prev) => [...prev, ...picked]);
      }
    } catch (e: any) {
      notifyError(e.message || 'Error seleccionando archivos.');
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearAll = () => {
    setFiles([]);
    setRawNotes('');
  };

  const notifyError = (msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Aviso', msg);
    }
  };

  const handleProcess = async () => {
    const activeKey = apiKey.trim() || (await AsyncStorage.getItem('gemini_api_key')) || '';
    if (!activeKey) {
      notifyError('Por favor ingresa tu API Key en la pestaña Ajustes primero.');
      return;
    }

    if (files.length === 0 && !rawNotes.trim()) {
      notifyError('Agrega al menos un archivo (Word, PDF, imagen) o escribe apuntes en el cuadro de texto.');
      return;
    }

    try {
      setLoading(true);
      setStatusMessage('Iniciando compilación inteligente...');

      const result = await analyzeCompiledSources(
        activeKey,
        selectedModel,
        files,
        rawNotes,
        undefined,
        (status) => setStatusMessage(status)
      );

      setMinuta(result);
      const summaryName = files.length > 0 ? `${files.length} archivos compilados` : 'Apuntes manuales';
      await saveToHistory(result, summaryName);
    } catch (e: any) {
      notifyError(e.message || 'Ocurrió un error al procesar con IA.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleGenerateDocx = async () => {
    if (!minuta) return;
    try {
      setLoading(true);
      setStatusMessage('Generando documento Word...');
      const templateUri = await AsyncStorage.getItem('template_uri');
      await generateWordDocument(templateUri, minuta, `Minuta_${minuta.asunto || 'Reunion'}`);
      if (Platform.OS === 'web') {
        window.alert('¡Documento Word descargado con éxito!');
      } else {
        Alert.alert('Éxito', 'Documento Word generado.');
      }
    } catch (e: any) {
      notifyError(`Error generando Word: ${e.message}`);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleAddFila = () => {
    if (!minuta) return;
    const newFila: MinutaFila = {
      tema: '',
      compromiso: '',
      responsable: 'No especificado',
      plazo: 'No especificado',
    };
    setMinuta({
      ...minuta,
      filas: [...(minuta.filas || []), newFila],
    });
  };

  const handleUpdateFila = (index: number, field: keyof MinutaFila, value: string) => {
    if (!minuta) return;
    const updated = [...(minuta.filas || [])];
    updated[index] = { ...updated[index], [field]: value };
    setMinuta({ ...minuta, filas: updated });
  };

  const handleRemoveFila = (index: number) => {
    if (!minuta) return;
    const updated = [...(minuta.filas || [])];
    updated.splice(index, 1);
    setMinuta({ ...minuta, filas: updated });
  };

  const reset = () => {
    setMinuta(null);
    setFiles([]);
    setRawNotes('');
    setStatusMessage('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Model Selector Bar (Steve Jobs Philosophy: single clean control) */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Ionicons name="sparkles" size={18} color={COLORS.secondary} />
          <Text style={styles.brandTitle}>Compilador de Minutas AI</Text>
        </View>

        <TouchableOpacity
          style={styles.modelPill}
          onPress={() => setIsSelectingModel(!isSelectingModel)}
        >
          <Ionicons name="hardware-chip-outline" size={16} color={COLORS.secondaryLight} />
          <Text style={styles.modelPillText}>{selectedModel}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Model Selection Dropdown */}
      {isSelectingModel && (
        <Card style={styles.modelDropdown}>
          <Text style={styles.modelDropdownHeader}>Selecciona el modelo Gemini a utilizar:</Text>
          {models.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modelOption, selectedModel === m && styles.modelOptionSelected]}
              onPress={() => handleSelectModel(m)}
            >
              <Ionicons
                name={selectedModel === m ? 'radio-button-on' : 'radio-button-off'}
                size={16}
                color={selectedModel === m ? COLORS.secondary : COLORS.textSecondary}
              />
              <Text style={[styles.modelOptionText, selectedModel === m && styles.modelOptionTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {!minuta ? (
        <>
          {/* Multi-File Upload & Compilation Card */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="layers-outline" size={24} color={COLORS.primaryLight} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.sectionTitle}>Fuentes de la Reunión</Text>
                <Text style={styles.sectionSubtitle}>
                  Combina múltiples archivos (Word, PDF, Fotos, TXT) y notas en una minuta única.
                </Text>
              </View>
            </View>

            {/* Action buttons for files */}
            <View style={styles.fileActionsRow}>
              <TouchableOpacity style={styles.addFileButton} onPress={handleAddFiles} disabled={loading}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
                <Text style={styles.addFileButtonText}>Adjuntar Archivos</Text>
              </TouchableOpacity>

              {files.length > 0 && (
                <TouchableOpacity style={styles.clearFilesButton} onPress={handleClearAll} disabled={loading}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                  <Text style={styles.clearFilesButtonText}>Limpiar ({files.length})</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Added Files List */}
            {files.length > 0 && (
              <View style={styles.filesList}>
                {files.map((file, idx) => (
                  <View key={file.id} style={styles.fileChip}>
                    <Ionicons
                      name={
                        file.name.endsWith('.docx')
                          ? 'document-text'
                          : file.name.endsWith('.pdf')
                          ? 'document'
                          : file.mimeType?.startsWith('image/')
                          ? 'image'
                          : 'document-attach'
                      }
                      size={18}
                      color={COLORS.secondaryLight}
                    />
                    <Text style={styles.fileNameText} numberOfLines={1}>
                      {idx + 1}. {file.name}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveFile(file.id)}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Direct Notes / Apuntes Manuales Text Area */}
            <View style={{ marginTop: 20 }}>
              <Text style={styles.label}>Apuntes Directos / Notas Manuales (Opcional):</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={5}
                placeholder="Pega aquí apuntes rápidos, notas de libreta o transcripciones de la reunión para integrarlas con los archivos..."
                placeholderTextColor={COLORS.textMuted}
                value={rawNotes}
                onChangeText={setRawNotes}
                editable={!loading}
              />
            </View>

            {/* Loading / Progress Indicator */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primaryLight} />
                <Text style={styles.loadingStatusText}>{statusMessage}</Text>
              </View>
            ) : (
              <Button
                title={
                  files.length > 1
                    ? `Compilar y Analizar ${files.length} Fuentes`
                    : files.length === 1
                    ? 'Analizar Archivo'
                    : 'Compilar Apuntes con IA'
                }
                onPress={handleProcess}
                style={{ marginTop: 24, width: '100%' }}
              />
            )}
          </Card>
        </>
      ) : (
        /* Results and Live Editing View */
        <View style={styles.resultContainer}>
          <Card>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.successTitle}>Minuta Consolidada</Text>
                <Text style={styles.successSubtitle}>Puedes editar cualquier campo antes de exportar</Text>
              </View>
            </View>

            {/* Editable Asunto */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Asunto de la Reunión</Text>
              <TextInput
                style={styles.input}
                value={minuta.asunto}
                onChangeText={(t) => setMinuta({ ...minuta, asunto: t })}
                placeholder="Asunto"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {/* Editable Metadata Grid */}
            <View style={styles.metaGrid}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Fecha</Text>
                <TextInput
                  style={styles.input}
                  value={minuta.fecha}
                  onChangeText={(t) => setMinuta({ ...minuta, fecha: t })}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginHorizontal: 8 }]}>
                <Text style={styles.formLabel}>Hora</Text>
                <TextInput
                  style={styles.input}
                  value={minuta.hora}
                  onChangeText={(t) => setMinuta({ ...minuta, hora: t })}
                  placeholder="hh:mm"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1.2 }]}>
                <Text style={styles.formLabel}>Lugar</Text>
                <TextInput
                  style={styles.input}
                  value={minuta.lugar}
                  onChangeText={(t) => setMinuta({ ...minuta, lugar: t })}
                  placeholder="Lugar"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            {/* Editable Asistentes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Asistentes Participantes</Text>
              <TextInput
                style={styles.input}
                value={minuta.asistentes}
                onChangeText={(t) => setMinuta({ ...minuta, asistentes: t })}
                placeholder="Nombres y cargos separados por comas"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {/* Editable Resumen / Detalles */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Contexto General y Temas Tratados (Exhaustivo)</Text>
              <TextInput
                style={[styles.input, { minHeight: 140, textAlignVertical: 'top' }]}
                multiline
                value={minuta.detalles}
                onChangeText={(t) => setMinuta({ ...minuta, detalles: t })}
                placeholder="Detalles exhaustivos de la reunión..."
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {/* Tabla de Acuerdos */}
            <View style={{ marginTop: 16 }}>
              <View style={styles.acuerdosHeaderRow}>
                <Text style={styles.formLabel}>Acuerdos y Compromisos ({minuta.filas?.length || 0})</Text>
                <TouchableOpacity style={styles.addFilaBtn} onPress={handleAddFila}>
                  <Ionicons name="add" size={16} color={COLORS.white} />
                  <Text style={styles.addFilaBtnText}>Agregar Fila</Text>
                </TouchableOpacity>
              </View>

              {minuta.filas?.map((fila, idx) => (
                <View key={idx} style={styles.filaBox}>
                  <View style={styles.filaTopRow}>
                    <Text style={styles.filaBadge}>#{idx + 1}</Text>
                    <TouchableOpacity onPress={() => handleRemoveFila(idx)}>
                      <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[styles.input, { marginBottom: 8 }]}
                    placeholder="Tema o punto específico..."
                    placeholderTextColor={COLORS.textMuted}
                    value={fila.tema}
                    onChangeText={(t) => handleUpdateFila(idx, 'tema', t)}
                  />
                  <TextInput
                    style={[styles.input, { marginBottom: 8 }]}
                    placeholder="Compromiso acordado..."
                    placeholderTextColor={COLORS.textMuted}
                    value={fila.compromiso}
                    onChangeText={(t) => handleUpdateFila(idx, 'compromiso', t)}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Responsable"
                      placeholderTextColor={COLORS.textMuted}
                      value={fila.responsable || ''}
                      onChangeText={(t) => handleUpdateFila(idx, 'responsable', t)}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Plazo"
                      placeholderTextColor={COLORS.textMuted}
                      value={fila.plazo}
                      onChangeText={(t) => handleUpdateFila(idx, 'plazo', t)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </Card>

          {/* Actions */}
          <View style={styles.actionButtons}>
            <Button
              title="Descargar Documento Word (.docx)"
              onPress={handleGenerateDocx}
              loading={loading}
              style={{ width: '100%' }}
            />
            <Button
              title="Nueva Compilación"
              onPress={reset}
              variant="outline"
              style={{ marginTop: 12, width: '100%' }}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 50 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  modelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  modelPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondaryLight,
  },

  modelDropdown: {
    marginBottom: 16,
    padding: 16,
  },
  modelDropdownHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 10,
  },
  modelOptionSelected: {
    backgroundColor: COLORS.surfaceElevated,
  },
  modelOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modelOptionTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },

  card: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },

  fileActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  addFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  addFileButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  clearFilesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  clearFilesButtonText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: 13,
  },

  filesList: {
    gap: 8,
    marginBottom: 16,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  fileNameText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    color: COLORS.white,
    fontSize: 14,
    minHeight: 110,
    textAlignVertical: 'top',
  },

  loadingContainer: {
    marginTop: 28,
    alignItems: 'center',
  },
  loadingStatusText: {
    marginTop: 14,
    color: COLORS.secondaryLight,
    fontWeight: '600',
    fontSize: 14,
  },

  resultContainer: {
    flex: 1,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  successSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.secondaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.white,
    fontSize: 14,
  },
  metaGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  acuerdosHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addFilaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  addFilaBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  filaBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  filaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filaBadge: {
    color: COLORS.secondaryLight,
    fontWeight: '700',
    fontSize: 12,
  },

  actionButtons: {
    marginTop: 10,
  },
});
