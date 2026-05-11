import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'minuta_history_v1';

export const saveToHistory = async (minuta: any, originalFileName: string) => {
  const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
  const history = historyJson ? JSON.parse(historyJson) : [];
  const newItem = { ...minuta, id: Math.random().toString(36).substring(7), createdAt: new Date().toISOString(), originalFileName };
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([newItem, ...history].slice(0, 20)));
};

export const getHistory = async () => {
  const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
  return historyJson ? JSON.parse(historyJson) : [];
};
