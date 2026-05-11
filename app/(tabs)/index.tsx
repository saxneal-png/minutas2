import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS, GRADIENTS } from '../../src/theme/colors';

export default function Home() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="document-text" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Minutas DOH</Text>
        <Text style={styles.subtitle}>Embalse Zapallar</Text>
      </View>
      
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="sparkles" size={24} color={COLORS.secondary} />
          <Text style={styles.cardTitle}>Automatización con IA</Text>
        </View>
        <Text style={styles.cardText}>
          Genera actas y minutas estructuradas al instante. Sube tu documento y deja que la Inteligencia Artificial extraiga los acuerdos, fechas y participantes.
        </Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>10x</Text>
            <Text style={styles.statLabel}>Más Rápido</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Precisión</Text>
          </View>
        </View>

        <Button 
          title="Comenzar Análisis" 
          onPress={() => router.push('/analyze')} 
          style={{marginTop: 24}} 
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  title: { fontSize: 36, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 18, color: COLORS.textLight, marginTop: 4, fontWeight: '500' },
  card: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginLeft: 8 },
  cardText: { fontSize: 16, color: COLORS.textLight, lineHeight: 24 },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
    fontWeight: '500',
  }
});
