import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

class HistoryManager:
    def __init__(self, storage_dir: str = None):
        self.storage_dir = storage_dir or os.path.join(os.path.expanduser("~"), ".minutas_ai_studio")
        os.makedirs(self.storage_dir, exist_ok=True)
        self.history_file = os.path.join(self.storage_dir, "history.json")
        self.history = self.load_history()

    def load_history(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error cargando historial: {e}")
        return []

    def save_history(self):
        try:
            with open(self.history_file, "w", encoding="utf-8") as f:
                json.dump(self.history, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error guardando historial: {e}")

    def add_entry(self, data: Dict[str, Any], source_name: str, profile_used: str) -> Dict[str, Any]:
        entry = {
            "id": str(uuid.uuid4())[:8],
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source_name": source_name,
            "profile_used": profile_used,
            "asunto": data.get("asunto", "Sin Asunto"),
            "fecha": data.get("fecha", "No especificado"),
            "lugar": data.get("lugar", "No especificado"),
            "asistentes": data.get("asistentes", "No especificado"),
            "compromisos_count": len(data.get("filas", [])),
            "data": data
        }
        self.history.insert(0, entry) # Most recent first
        # Keep last 100 entries
        self.history = self.history[:100]
        self.save_history()
        return entry

    def delete_entry(self, entry_id: str):
        self.history = [item for item in self.history if item.get("id") != entry_id]
        self.save_history()

    def search(self, query: str) -> List[Dict[str, Any]]:
        if not query or not query.strip():
            return self.history
        q = query.lower().strip()
        results = []
        for item in self.history:
            asunto = str(item.get("asunto", "")).lower()
            source = str(item.get("source_name", "")).lower()
            asistentes = str(item.get("asistentes", "")).lower()
            fecha = str(item.get("fecha", "")).lower()
            detalles = str(item.get("data", {}).get("detalles", "")).lower()
            if q in asunto or q in source or q in asistentes or q in fecha or q in detalles:
                results.append(item)
        return results

    def get_entry(self, entry_id: str) -> Optional[Dict[str, Any]]:
        for item in self.history:
            if item.get("id") == entry_id:
                return item
        return None
