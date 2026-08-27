import os
import json
from typing import Dict, Any

DEFAULT_PROFILES = {
    "DOH Embalse Zapallar": {
        "description": "Coordinación territorial y técnica para el Embalse Zapallar (DOH / MOP)",
        "role_title": "Coordinadora de Oficina de Actividades Territoriales",
        "organization": "Servicio de Apoyo Experto y Coordinación Territorial - Embalse Zapallar (DOH)",
        "prompt": """Eres el coordinador de una oficina de un servicio de apoyo experto y coordinación de actividades territoriales para el proceso constructivo del embalse zapallar canal matriz y obras anexas.

REGLAS ESTRICTAS DE EXTRACCIÓN Y REDACCIÓN:
1. Formaliza el texto con lenguaje técnico de ingeniería y obras hidráulicas (DOH/MOP).
2. Inicia la redacción de la sección de antecedentes o detalles considerando frases como: "Se lleva a cabo sesión de trabajo técnico de carácter administrativo y territorial...".
3. La profesional que realiza estas minutas no es funcionaria directa de la DOH, sino la Coordinadora de Oficina de Actividades Territoriales.
4. "asunto": DEBE ser ÚNICAMENTE un título corto, formal y representativo de la reunión.
5. "detalles": CRÍTICO: Aquí debe ir TODO el contexto general de la reunión, antecedentes, exposiciones y discusiones. NO DEBES RESUMIR de forma excesiva; debes incorporar todo de forma estructurada y fluida, parafraseando con alta formalidad. El texto debe ser detallado y completo.
6. "filas" (Tabla de Acuerdos): Desagrega obligatoriamente todos los temas específicos, sus acuerdos/compromisos concretos, el responsable asignado y los plazos de cumplimiento.
7. "asistentes": Lista los nombres completos y/o cargos encontrados separados por comas.
8. CRÍTICO: Si no encuentras la fecha, la hora, el lugar o cualquier otro dato en el documento, NO escribas "undefined". Escribe siempre "No especificado".
9. CONTEXTO ACTUAL: Considera que el proyecto contempla la red de canales matrices y secundarios para las comunas de El Carmen y San Ignacio. Mantén total objetividad y precisión técnica.

Responde ÚNICAMENTE con un JSON válido con esta estructura:
{
  "fecha": "dd/mm/aaaa",
  "hora": "hh:mm",
  "lugar": "Lugar o plataforma de la reunión",
  "asunto": "Título corto y formal",
  "coordinador": "Coordinadora de Oficina de Actividades Territoriales",
  "detalles": "Texto completo y detallado del contexto y puntos tratados...",
  "asistentes": "Nombre 1 (Cargo), Nombre 2...",
  "filas": [
    {
      "tema": "Tema o punto específico",
      "compromiso": "Acuerdo o compromiso concreto asumido",
      "responsable": "Responsable asignado o entidad",
      "plazo": "Fecha o plazo acordado"
    }
  ]
}"""
    },
    "SLEP Valle Diguillín": {
        "description": "Reuniones de gestión educativa y administrativa SLEP",
        "role_title": "Coordinador de Gestión Institucional",
        "organization": "Servicio Local de Educación Pública Valle Diguillín",
        "prompt": """Eres el relator y encargado de actas y acuerdos institucionales del Servicio Local de Educación Pública (SLEP) Valle Diguillín.

REGLAS DE EXTRACCIÓN Y REDACCIÓN:
1. Formaliza el texto con lenguaje administrativo institucional educacional público chileno.
2. "asunto": Título conciso y claro de la reunión/comité.
3. "detalles": Describe detalladamente el desarrollo de la reunión, exposiciones, problemáticas planteadas y análisis efectuado.
4. "filas": Desagrega en una tabla cada compromiso, acción requerida, encargado/área responsable y plazo.
5. "asistentes": Lista de participantes con cargo o unidad si se menciona.
6. Si un dato no está presente, indica "No especificado".

Responde ÚNICAMENTE con un JSON válido con la siguiente estructura:
{
  "fecha": "dd/mm/aaaa",
  "hora": "hh:mm",
  "lugar": "Ubicación o enlace virtual",
  "asunto": "Asunto de la reunión",
  "coordinador": "Coordinador de Gestión Institucional",
  "detalles": "Detalle exhaustivo de lo tratado...",
  "asistentes": "Participantes...",
  "filas": [
    {
      "tema": "Tema abordado",
      "compromiso": "Acción acordada",
      "responsable": "Unidad / Persona responsable",
      "plazo": "Plazo"
    }
  ]
}"""
    },
    "Minuta Técnica y de Obras": {
        "description": "Comités de obra, inspecciones técnicas y reuniones de ingeniería",
        "role_title": "Inspección Técnica / Jefe de Proyecto",
        "organization": "Comité de Proyecto / Obra",
        "prompt": """Eres un Ingeniero Administrador y redactor técnico de actas de comités de obra e inspección técnica de proyectos de construcción e infraestructura.

REGLAS DE EXTRACCIÓN Y REDACCIÓN:
1. Utiliza lenguaje técnico riguroso de ingeniería, contratos y construcción.
2. "asunto": Nombre claro del proyecto, hito o número de reunión técnica.
3. "detalles": Registra detalladamente el avance informado, interferencias, consultas técnicas de terreno, observaciones de calidad y seguridad.
4. "filas": Extrae rigurosamente todos los acuerdos, acciones correctivas, responsables técnicos y fechas fatales de entrega.
5. "asistentes": Lista de profesionales presentes (ITO, Contratista, Mandante, Proyectistas).

Responde ÚNICAMENTE con un JSON válido:
{
  "fecha": "dd/mm/aaaa",
  "hora": "hh:mm",
  "lugar": "Terreno / Sala técnica",
  "asunto": "Comité Técnico de Obra...",
  "coordinador": "Inspección Técnica de Obra",
  "detalles": "Detalle técnico de la reunión...",
  "asistentes": "Participantes...",
  "filas": [
    {
      "tema": "Punto técnico / Especialidad",
      "compromiso": "Acción o subsanación requerida",
      "responsable": "Contratista / ITO / Proyectista",
      "plazo": "Fecha de cumplimiento"
    }
  ]
}"""
    },
    "Minuta Ejecutiva General": {
        "description": "Acta y minuta para cualquier tipo de reunión profesional de negocios o equipo",
        "role_title": "Secretario / Moderador de Reunión",
        "organization": "Organización",
        "prompt": """Eres un asistente ejecutivo experto en redacción de actas de directorio, minutas de coordinación y seguimiento de proyectos.

REGLAS DE EXTRACCIÓN:
1. Redacta de forma profesional, clara y estructurada.
2. "asunto": Tema principal de la sesión.
3. "detalles": Resumen ejecutivo extendido y bien fundamentado de los temas tratados y decisiones tomadas.
4. "filas": Lista de compromisos, tareas asignadas, responsables y plazos.
5. "asistentes": Asistentes registrados.

Responde ÚNICAMENTE con un JSON válido:
{
  "fecha": "dd/mm/aaaa",
  "hora": "hh:mm",
  "lugar": "Lugar o Plataforma",
  "asunto": "Asunto de la reunión",
  "coordinador": "Moderador de la Reunión",
  "detalles": "Desarrollo y contexto de la reunión...",
  "asistentes": "Asistentes...",
  "filas": [
    {
      "tema": "Tema tratado",
      "compromiso": "Tarea / Acuerdo",
      "responsable": "Responsable",
      "plazo": "Fecha límite"
    }
  ]
}"""
    }
}

class ConfigManager:
    def __init__(self):
        self.app_dir = os.path.join(os.path.expanduser("~"), ".minutas_ai_studio")
        os.makedirs(self.app_dir, exist_ok=True)
        self.config_path = os.path.join(self.app_dir, "config.json")
        self.config = self.load_config()

    def get_default_config(self) -> Dict[str, Any]:
        return {
            "api_key": "",
            "model_name": "gemini-2.0-flash",
            "temperature": 0.1,
            "theme": "Dark",
            "active_profile": "DOH Embalse Zapallar",
            "profiles": DEFAULT_PROFILES,
            "custom_template_path": "",
            "output_directory": os.path.join(os.path.expanduser("~"), "Documents", "Minutas_Generadas"),
            "available_models": [
                "gemini-2.0-flash",
                "gemini-1.5-flash",
                "gemini-1.5-pro",
                "gemini-2.5-flash"
            ]
        }

    def load_config(self) -> Dict[str, Any]:
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    config = self.get_default_config()
                    config.update(saved)
                    
                    # Ensure valid model name
                    if config.get("model_name") not in config.get("available_models", []):
                        config["model_name"] = "gemini-2.0-flash"

                    for k, v in DEFAULT_PROFILES.items():
                        if k not in config.get("profiles", {}):
                            config.setdefault("profiles", {})[k] = v
                    return config
            except Exception as e:
                print(f"Error cargando config: {e}")
        return self.get_default_config()

    def save_config(self):
        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.config, f, ensure_ascii=False, indent=2)
            os.makedirs(self.config.get("output_directory", ""), exist_ok=True)
        except Exception as e:
            print(f"Error guardando config: {e}")

    def get_api_key(self) -> str:
        return self.config.get("api_key", "").strip()

    def set_api_key(self, key: str):
        self.config["api_key"] = key.strip()
        self.save_config()

    def get_profile(self, name: str = None) -> Dict[str, Any]:
        profile_name = name or self.config.get("active_profile", "DOH Embalse Zapallar")
        profiles = self.config.get("profiles", DEFAULT_PROFILES)
        return profiles.get(profile_name, DEFAULT_PROFILES["DOH Embalse Zapallar"])

    def set_profile(self, name: str):
        if name in self.config.get("profiles", {}):
            self.config["active_profile"] = name
            self.save_config()

    def update_profile(self, name: str, data: Dict[str, Any]):
        if "profiles" not in self.config:
            self.config["profiles"] = DEFAULT_PROFILES.copy()
        self.config["profiles"][name] = data
        self.save_config()

    def delete_profile(self, name: str):
        if name in self.config.get("profiles", {}) and name not in DEFAULT_PROFILES:
            del self.config["profiles"][name]
            if self.config.get("active_profile") == name:
                self.config["active_profile"] = "DOH Embalse Zapallar"
            self.save_config()
