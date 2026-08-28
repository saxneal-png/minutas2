import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS } from '../../src/theme/colors';

export default function Home() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="document-text" size={38} color={COLORS.primaryLight} />
        </View>
        <Text style={styles.title}>Minutas AI Studio</Text>
        <Text style={styles.subtitle}>Compilador Inteligente de Apuntes y Actas Oficiales</Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="sparkles" size={22} color={COLORS.secondary} />
          <Text style={styles.cardTitle}>Automatización de Minutas DOH</Text>
        </View>
        <Text style={styles.cardText}>
          Consolida múltiples archivos (Word, PDF, Fotos, TXT) y notas rápidas en una única minuta
          formal exhaustiva con lenguaje técnico institucional.
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Ionicons name="layers-outline" size={24} color={COLORS.primaryLight} />
            <Text style={styles.statNumber}>Multi-Fuente</Text>
            <Text style={styles.statLabel}>Combina Word, PDF y Fotos</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="flash-outline" size={24} color={COLORS.secondaryLight} />
            <Text style={styles.statNumber}>IA Gemini</Text>
            <Text style={styles.statLabel}>Modelos en tiempo real</Text>
          </View>
        </View>

        <Button
          title="Iniciar Compilación"
          onPress={() => router.push('/analyze')}
          style={{ marginTop: 24 }}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardSectionTitle}>Flujo de Trabajo Simplificado</Text>
        <View style={styles.stepRow}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Configura tu API Key</Text>
            <Text style={styles.stepDesc}>En Ajustes, ingresa tu clave de Gemini para activar los modelos.</Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Adjunta tus fuentes</Text>
            <Text style={styles.stepDesc}>Sube uno o varios archivos y agrega apuntes manuales si lo deseas.</Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Exporta a Word (.docx)</Text>
            <Text style={styles.stepDesc}>Edita en pantalla los acuerdos y descarga tu minuta formateada.</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
    marginLeft: 8,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
