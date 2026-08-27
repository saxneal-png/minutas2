import os
import sys
import threading
import subprocess
from datetime import datetime
from tkinter import filedialog, messagebox
import tkinter as tk
import customtkinter as ctk

from config_manager import ConfigManager
from gemini_engine import GeminiEngine
from docx_engine import DocxEngine
from history_manager import HistoryManager

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

# Paleta de Alto Contraste y Claridad Visual
C_BG = "#0B0F19"             # Fondo principal oscuro profundo
C_SIDEBAR = "#111827"        # Barra lateral elegante
C_CARD = "#1F2937"           # Tarjetas con excelente contraste
C_CARD_INNER = "#111827"     # Cajas internas e inputs
C_BORDER = "#374151"         # Bordes sutiles y definidos

C_TEXT_WHITE = "#FFFFFF"     # Texto principal 100% nítido y legible
C_TEXT_MUTED = "#9CA3AF"     # Texto secundario claro
C_TEXT_LIGHT = "#E5E7EB"     # Etiquetas y descripciones

C_BLUE = "#2563EB"           # Azul primario vibrante
C_BLUE_HOVER = "#1D4ED8"
C_GREEN = "#10B981"          # Verde esmeralda de confirmación
C_GREEN_HOVER = "#059669"
C_RED = "#EF4444"            # Rojo de alerta / eliminar
C_RED_HOVER = "#DC2626"

class MinutasApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Compilador de Apuntes y Minutas AI Studio")
        self.geometry("1220x820")
        self.minsize(1020, 720)

        # Configuración y motores
        self.config_mgr = ConfigManager()
        self.history_mgr = HistoryManager()
        self.docx_engine = DocxEngine()
        self.gemini_engine = GeminiEngine(
            api_key=self.config_mgr.get_api_key(),
            model_name=self.config_mgr.config.get("model_name", "gemini-2.0-flash"),
            temperature=self.config_mgr.config.get("temperature", 0.1)
        )

        saved_theme = self.config_mgr.config.get("theme", "Dark")
        ctk.set_appearance_mode(saved_theme)

        # Estado multi-archivo
        self.selected_files = [] # Lista de rutas de archivos cargados para compilar
        self.current_minuta_data = None
        self.compromiso_entries = []

        self.setup_ui()

        if self.config_mgr.get_api_key():
            threading.Thread(target=self.silently_fetch_models, daemon=True).start()

    def setup_ui(self):
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.create_sidebar()
        self.create_content_area()
        self.select_tab("analyze")

    def create_sidebar(self):
        self.sidebar_frame = ctk.CTkFrame(
            self, 
            width=230, 
            corner_radius=0,
            fg_color=C_SIDEBAR
        )
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(6, weight=1)

        # Encabezado Marca
        brand_frame = ctk.CTkFrame(self.sidebar_frame, fg_color="transparent")
        brand_frame.grid(row=0, column=0, padx=20, pady=(26, 6), sticky="w")

        self.logo_label = ctk.CTkLabel(
            brand_frame, 
            text="⚡ Minutas AI", 
            font=ctk.CTkFont(family="Segoe UI", size=22, weight="bold"),
            text_color=C_TEXT_WHITE
        )
        self.logo_label.pack(anchor="w")

        self.sub_logo_label = ctk.CTkLabel(
            brand_frame, 
            text="Compilador de Apuntes", 
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color=C_TEXT_MUTED
        )
        self.sub_logo_label.pack(anchor="w")

        # Botones de navegación
        self.nav_btns = {}
        tabs = [
            ("analyze", "✦  Compilar & Analizar", self.show_analyze_tab),
            ("editor", "✎  Editor de Minuta", self.show_editor_tab),
            ("templates", "▤  Plantillas Word", self.show_templates_tab),
            ("history", "🕒  Historial", self.show_history_tab),
            ("settings", "⚙  Ajustes Globales", self.show_settings_tab),
        ]

        for idx, (tab_id, text, cmd) in enumerate(tabs, start=1):
            btn = ctk.CTkButton(
                self.sidebar_frame,
                text=text,
                height=42,
                corner_radius=10,
                fg_color="transparent",
                text_color=C_TEXT_WHITE,
                hover_color=C_CARD,
                anchor="w",
                font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
                command=cmd
            )
            btn.grid(row=idx, column=0, padx=12, pady=3, sticky="ew")
            self.nav_btns[tab_id] = btn

        # Estado en pie de barra
        self.status_box = ctk.CTkFrame(self.sidebar_frame, fg_color=C_CARD, corner_radius=12)
        self.status_box.grid(row=7, column=0, padx=12, pady=20, sticky="ew")

        api_status = "● API Activa" if self.config_mgr.get_api_key() else "○ Sin API Key"
        self.api_status_label = ctk.CTkLabel(
            self.status_box, 
            text=api_status, 
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            text_color=C_GREEN if self.config_mgr.get_api_key() else C_RED
        )
        self.api_status_label.pack(padx=10, pady=(8, 2))

        curr_model = self.config_mgr.config.get("model_name", "gemini-2.0-flash")
        self.lbl_active_model_badge = ctk.CTkLabel(
            self.status_box, 
            text=curr_model, 
            font=ctk.CTkFont(family="Segoe UI", size=11), 
            text_color=C_TEXT_LIGHT
        )
        self.lbl_active_model_badge.pack(padx=10, pady=(0, 8))

    def create_content_area(self):
        self.content_container = ctk.CTkFrame(self, corner_radius=0, fg_color=C_BG)
        self.content_container.grid(row=0, column=1, sticky="nsew", padx=24, pady=24)
        self.content_container.grid_rowconfigure(0, weight=1)
        self.content_container.grid_columnconfigure(0, weight=1)

        self.tab_analyze = ctk.CTkFrame(self.content_container, fg_color="transparent")
        self.tab_editor = ctk.CTkFrame(self.content_container, fg_color="transparent")
        self.tab_templates = ctk.CTkFrame(self.content_container, fg_color="transparent")
        self.tab_history = ctk.CTkFrame(self.content_container, fg_color="transparent")
        self.tab_settings = ctk.CTkFrame(self.content_container, fg_color="transparent")

        self.build_analyze_tab()
        self.build_editor_tab()
        self.build_templates_tab()
        self.build_history_tab()
        self.build_settings_tab()

    def select_tab(self, tab_id: str):
        for tid, btn in self.nav_btns.items():
            if tid == tab_id:
                btn.configure(fg_color=C_BLUE, text_color=C_TEXT_WHITE)
            else:
                btn.configure(fg_color="transparent", text_color=C_TEXT_WHITE)

        for frame in [self.tab_analyze, self.tab_editor, self.tab_templates, self.tab_history, self.tab_settings]:
            frame.grid_forget()

        if tab_id == "analyze":
            self.tab_analyze.grid(row=0, column=0, sticky="nsew")
        elif tab_id == "editor":
            self.tab_editor.grid(row=0, column=0, sticky="nsew")
        elif tab_id == "templates":
            self.tab_templates.grid(row=0, column=0, sticky="nsew")
        elif tab_id == "history":
            self.refresh_history_list()
            self.tab_history.grid(row=0, column=0, sticky="nsew")
        elif tab_id == "settings":
            self.tab_settings.grid(row=0, column=0, sticky="nsew")

    def show_analyze_tab(self): self.select_tab("analyze")
    def show_editor_tab(self): self.select_tab("editor")
    def show_templates_tab(self): self.select_tab("templates")
    def show_history_tab(self): self.select_tab("history")
    def show_settings_tab(self): self.select_tab("settings")

    def silently_fetch_models(self):
        try:
            ok, models, _ = self.gemini_engine.get_available_models()
            if ok and models:
                self.config_mgr.config["available_models"] = models
                self.config_mgr.save_config()
                self.after(0, self.update_model_dropdown)
        except Exception:
            pass

    def update_model_dropdown(self):
        models = self.config_mgr.config.get("available_models", ["gemini-2.0-flash", "gemini-1.5-flash"])
        current = self.config_mgr.config.get("model_name", "gemini-2.0-flash")
        if hasattr(self, "model_combo"):
            self.model_combo.configure(values=models)
            if current in models:
                self.model_combo.set(current)
            elif models:
                self.model_combo.set(models[0])
        if hasattr(self, "lbl_active_model_badge"):
            self.lbl_active_model_badge.configure(text=current)

    # ----------------------------------------------------
    # TAB 1: COMPILADOR & ANÁLISIS MULTI-ARCHIVO
    # ----------------------------------------------------
    def build_analyze_tab(self):
        self.tab_analyze.grid_columnconfigure(0, weight=1)
        self.tab_analyze.grid_rowconfigure(3, weight=1)

        # Encabezado
        h_frame = ctk.CTkFrame(self.tab_analyze, fg_color="transparent")
        h_frame.grid(row=0, column=0, sticky="ew", pady=(0, 12))
        
        ctk.CTkLabel(
            h_frame, 
            text="Compilador de Apuntes y Generador de Minutas", 
            font=ctk.CTkFont(family="Segoe UI", size=24, weight="bold"),
            text_color=C_TEXT_WHITE
        ).pack(anchor="w")

        ctk.CTkLabel(
            h_frame, 
            text="Combina múltiples documentos, notas, audios y fotos de pizarras en una sola minuta oficial consolidada.", 
            font=ctk.CTkFont(family="Segoe UI", size=13), 
            text_color=C_TEXT_LIGHT
        ).pack(anchor="w", pady=(2, 0))

        # Barra Superior de Control: Perfil y Selector ÚNICO de Modelo
        top_bar = ctk.CTkFrame(self.tab_analyze, fg_color=C_CARD, corner_radius=12)
        top_bar.grid(row=1, column=0, sticky="ew", pady=(0, 12))
        top_bar.grid_columnconfigure(1, weight=3)
        top_bar.grid_columnconfigure(3, weight=3)

        ctk.CTkLabel(
            top_bar, 
            text="Perfil:", 
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"), 
            text_color=C_TEXT_WHITE
        ).grid(row=0, column=0, padx=(16, 8), pady=12)

        profiles_list = list(self.config_mgr.config.get("profiles", {}).keys())
        self.profile_combo = ctk.CTkComboBox(
            top_bar, 
            values=profiles_list,
            command=self.on_profile_change,
            height=34,
            corner_radius=8,
            fg_color=C_CARD_INNER,
            text_color=C_TEXT_WHITE,
            dropdown_text_color=C_TEXT_WHITE,
            dropdown_fg_color=C_CARD,
            font=ctk.CTkFont(family="Segoe UI", size=12)
        )
        self.profile_combo.set(self.config_mgr.config.get("active_profile", "DOH Embalse Zapallar"))
        self.profile_combo.grid(row=0, column=1, padx=(0, 16), pady=12, sticky="ew")

        ctk.CTkLabel(
            top_bar, 
            text="Modelo IA:", 
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"), 
            text_color=C_TEXT_WHITE
        ).grid(row=0, column=2, padx=(8, 8), pady=12)

        models_list = self.config_mgr.config.get("available_models", ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"])
        self.model_combo = ctk.CTkComboBox(
            top_bar, 
            values=models_list,
            command=self.on_model_change,
            height=34,
            corner_radius=8,
            fg_color=C_CARD_INNER,
            text_color=C_TEXT_WHITE,
            dropdown_text_color=C_TEXT_WHITE,
            dropdown_fg_color=C_CARD,
            font=ctk.CTkFont(family="Segoe UI", size=12)
        )
        self.model_combo.set(self.config_mgr.config.get("model_name", "gemini-2.0-flash"))
        self.model_combo.grid(row=0, column=3, padx=(0, 8), pady=12, sticky="ew")

        self.btn_refresh_models = ctk.CTkButton(
            top_bar, 
            text="🔄 Mapear", 
            width=80, 
            height=34,
            corner_radius=8,
            fg_color=C_CARD_INNER,
            hover_color=C_BORDER,
            text_color=C_TEXT_WHITE,
            font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
            command=self.sync_models_action
        )
        self.btn_refresh_models.grid(row=0, column=4, padx=(0, 16), pady=12)

        # Selector de Modo: Archivos Múltiples vs Texto Directo
        self.ingest_segmented = ctk.CTkSegmentedButton(
            self.tab_analyze, 
            values=["📁 Compilar Múltiples Archivos (Word / PDF / Audio / Imagen)", "✍ Texto Directo / Notas Rápidas"],
            command=self.on_ingest_mode_change,
            height=36,
            corner_radius=10,
            selected_color=C_BLUE,
            selected_hover_color=C_BLUE_HOVER,
            unselected_color=C_CARD,
            text_color=C_TEXT_WHITE,
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold")
        )
        self.ingest_segmented.set("📁 Compilar Múltiples Archivos (Word / PDF / Audio / Imagen)")
        self.ingest_segmented.grid(row=2, column=0, sticky="ew", pady=(0, 10))

        # Tarjeta Principal de Ingesta
        self.input_card = ctk.CTkFrame(self.tab_analyze, corner_radius=14, fg_color=C_CARD)
        self.input_card.grid(row=3, column=0, sticky="nsew")
        self.input_card.grid_columnconfigure(0, weight=1)
        self.input_card.grid_rowconfigure(0, weight=1)

        # 1. Vista de Múltiples Archivos
        self.file_view_frame = ctk.CTkFrame(self.input_card, fg_color="transparent")
        self.file_view_frame.grid(row=0, column=0, sticky="nsew", padx=16, pady=14)
        self.file_view_frame.grid_columnconfigure(0, weight=1)
        self.file_view_frame.grid_rowconfigure(1, weight=1)

        # Barra superior de archivos
        files_header = ctk.CTkFrame(self.file_view_frame, fg_color="transparent")
        files_header.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        
        self.lbl_files_count = ctk.CTkLabel(
            files_header, 
            text="Fuentes seleccionadas: 0 archivos", 
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color=C_TEXT_WHITE
        )
        self.lbl_files_count.pack(side="left")

        btn_add_files = ctk.CTkButton(
            files_header, 
            text="➕ Agregar Archivo(s)...", 
            height=32,
            corner_radius=8,
            fg_color=C_BLUE,
            hover_color=C_BLUE_HOVER,
            text_color=C_TEXT_WHITE,
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            command=self.browse_multiple_files
        )
        btn_add_files.pack(side="right", padx=(8, 0))

        btn_clear_files = ctk.CTkButton(
            files_header, 
            text="Limpiar Todo", 
            height=32,
            width=90,
            corner_radius=8,
            fg_color=C_CARD_INNER,
            hover_color=C_BORDER,
            text_color=C_TEXT_LIGHT,
            font=ctk.CTkFont(family="Segoe UI", size=11),
            command=self.clear_all_files
        )
        btn_clear_files.pack(side="right")

        # Lista desplazable de archivos cargados
        self.files_scroll_container = ctk.CTkScrollableFrame(
            self.file_view_frame, 
            corner_radius=10, 
            fg_color=C_CARD_INNER
        )
        self.files_scroll_container.grid(row=1, column=0, sticky="nsew", pady=(0, 4))
        self.files_scroll_container.grid_columnconfigure(0, weight=1)

        self.update_files_list_ui()

        # 2. Vista de Texto Directo
        self.text_view_frame = ctk.CTkFrame(self.input_card, fg_color="transparent")
        self.text_view_frame.grid_columnconfigure(0, weight=1)
        self.text_view_frame.grid_rowconfigure(1, weight=1)

        ctk.CTkLabel(
            self.text_view_frame, 
            text="Pega o escribe los apuntes de la reunión:", 
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color=C_TEXT_WHITE
        ).grid(row=0, column=0, sticky="w", padx=16, pady=(10, 4))
        
        self.raw_text_box = ctk.CTkTextbox(
            self.text_view_frame, 
            font=ctk.CTkFont(family="Segoe UI", size=13),
            corner_radius=10,
            fg_color=C_CARD_INNER,
            text_color=C_TEXT_WHITE
        )
        self.raw_text_box.grid(row=1, column=0, sticky="nsew", padx=16, pady=8)

        # 3. Consola de Actividad
        self.log_frame = ctk.CTkFrame(self.tab_analyze, fg_color=C_CARD, corner_radius=10)
        self.log_frame.grid(row=4, column=0, sticky="ew", pady=(8, 6))
        self.log_frame.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            self.log_frame, 
            text="ESTADO DEL PROCESO", 
            font=ctk.CTkFont(family="Segoe UI", size=10, weight="bold"), 
            text_color=C_TEXT_MUTED
        ).grid(row=0, column=0, sticky="w", padx=12, pady=(4, 0))
        
        self.log_textbox = ctk.CTkTextbox(
            self.log_frame, 
            height=60, 
            font=ctk.CTkFont(family="Consolas", size=11),
            fg_color=C_CARD_INNER,
            text_color=C_TEXT_WHITE
        )
        self.log_textbox.grid(row=1, column=0, sticky="ew", padx=10, pady=(2, 6))
        self.log_textbox.insert("1.0", "[Listo] Sistema inicializado. Agrega archivos para compilar la minuta.\n")
        self.log_textbox.configure(state="disabled")

        # Botón de Acción Principal
        self.action_frame = ctk.CTkFrame(self.tab_analyze, fg_color="transparent")
        self.action_frame.grid(row=5, column=0, sticky="ew", pady=(4, 0))
        self.action_frame.grid_columnconfigure(0, weight=1)

        self.progress_bar = ctk.CTkProgressBar(self.action_frame, mode="indeterminate", height=6)

        self.btn_analyze = ctk.CTkButton(
            self.action_frame, 
            text="⚡  Compilar Fuentes y Generar Minuta", 
            height=46,
            corner_radius=12,
            font=ctk.CTkFont(family="Segoe UI", size=15, weight="bold"),
            fg_color=C_BLUE,
            hover_color=C_BLUE_HOVER,
            text_color=C_TEXT_WHITE,
            command=self.start_analysis_thread
        )
        self.btn_analyze.grid(row=1, column=0, sticky="ew")

    def append_log(self, text: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_textbox.configure(state="normal")
        self.log_textbox.insert(tk.END, f"[{timestamp}] {text}\n")
        self.log_textbox.see(tk.END)
        self.log_textbox.configure(state="disabled")

    def on_profile_change(self, choice):
        self.config_mgr.set_profile(choice)
        self.append_log(f"Perfil seleccionado: '{choice}'")

    def on_model_change(self, choice):
        self.config_mgr.config["model_name"] = choice
        self.config_mgr.save_config()
        self.gemini_engine.model_name = choice
        self.lbl_active_model_badge.configure(text=choice)
        self.append_log(f"Modelo activo: '{choice}'")

    def sync_models_action(self):
        api_k = self.config_mgr.get_api_key()
        if not api_k:
            messagebox.showwarning("API Key Requerida", "Por favor ingresa tu API Key en Ajustes para listar tus modelos disponibles.")
            self.show_settings_tab()
            return

        self.append_log("Sincronizando modelos con Google Gemini...")
        self.btn_refresh_models.configure(state="disabled")

        def run_sync():
            ok, models, msg = self.gemini_engine.get_available_models()
            def finish():
                self.btn_refresh_models.configure(state="normal")
                if ok and models:
                    self.config_mgr.config["available_models"] = models
                    self.config_mgr.save_config()
                    self.update_model_dropdown()
                    self.append_log(f"✅ {msg}")
                    messagebox.showinfo("Modelos Mapeados", f"{msg}\n\nModelos activos:\n• " + "\n• ".join(models[:8]))
                else:
                    self.append_log(f"❌ {msg}")
                    messagebox.showerror("Error Mapeando Modelos", msg)

            self.after(0, finish)

        threading.Thread(target=run_sync, daemon=True).start()

    def on_ingest_mode_change(self, mode):
        if "Múltiples" in mode:
            self.text_view_frame.grid_forget()
            self.file_view_frame.grid(row=0, column=0, sticky="nsew", padx=16, pady=14)
        else:
            self.file_view_frame.grid_forget()
            self.text_view_frame.grid(row=0, column=0, sticky="nsew")

    def browse_multiple_files(self):
        files = filedialog.askopenfilenames(
            title="Seleccionar archivos para compilar",
            filetypes=[
                ("Todos los formatos compatibles", "*.docx;*.pdf;*.txt;*.png;*.jpg;*.jpeg;*.mp3;*.wav;*.m4a;*.ogg"),
                ("Documentos Word", "*.docx"),
                ("Documentos PDF", "*.pdf"),
                ("Archivos de Audio", "*.mp3;*.wav;*.m4a;*.ogg;*.aac"),
                ("Imágenes de Notas", "*.png;*.jpg;*.jpeg;*.webp"),
                ("Texto Plano", "*.txt;*.md;*.csv")
            ]
        )
        if files:
            added_count = 0
            for f in files:
                if f not in self.selected_files:
                    self.selected_files.append(f)
                    added_count += 1
            self.update_files_list_ui()
            self.append_log(f"Se agregaron {added_count} archivo(s) a la compilación. Total: {len(self.selected_files)}")

    def clear_all_files(self):
        self.selected_files = []
        self.update_files_list_ui()
        self.append_log("Lista de archivos vaciada.")

    def remove_file(self, file_path):
        if file_path in self.selected_files:
            self.selected_files.remove(file_path)
            self.update_files_list_ui()
            self.append_log(f"Archivo quitado: {os.path.basename(file_path)}")

    def update_files_list_ui(self):
        for w in self.files_scroll_container.winfo_children():
            w.destroy()

        count = len(self.selected_files)
        self.lbl_files_count.configure(text=f"Fuentes seleccionadas: {count} archivo(s)")

        if not self.selected_files:
            empty_lbl = ctk.CTkLabel(
                self.files_scroll_container, 
                text="📂 No hay archivos agregados aún.\nHaz clic en '➕ Agregar Archivo(s)...' para seleccionar documentos Word, PDFs, audios o fotos de notas.",
                font=ctk.CTkFont(family="Segoe UI", size=13),
                text_color=C_TEXT_MUTED
            )
            empty_lbl.pack(pady=40)
            return

        for idx, fpath in enumerate(self.selected_files, 1):
            fname = os.path.basename(fpath)
            ext = os.path.splitext(fpath)[1].lower()
            size_kb = os.path.getsize(fpath) / 1024
            size_str = f"{size_kb:.1f} KB" if size_kb < 1024 else f"{size_kb/1024:.1f} MB"

            icon_badge = "📄 Word" if ext == ".docx" else ("📑 PDF" if ext == ".pdf" else ("🎙 Audio" if ext in [".mp3", ".wav", ".m4a"] else "🖼 Imagen"))

            row = ctk.CTkFrame(self.files_scroll_container, fg_color=C_CARD, corner_radius=8)
            row.pack(fill="x", pady=3, padx=4)
            row.grid_columnconfigure(1, weight=1)

            # Badge tipo
            ctk.CTkLabel(
                row, 
                text=f" {icon_badge} ", 
                font=ctk.CTkFont(family="Segoe UI", size=10, weight="bold"),
                fg_color=C_BORDER,
                corner_radius=4,
                text_color=C_TEXT_WHITE
            ).grid(row=0, column=0, padx=(10, 8), pady=8)

            # Nombre y tamaño
            info_text = f"{idx}. {fname} ({size_str})"
            ctk.CTkLabel(
                row, 
                text=info_text, 
                font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
                text_color=C_TEXT_WHITE,
                anchor="w"
            ).grid(row=0, column=1, sticky="w", padx=4, pady=8)

            # Botón quitar
            btn_del = ctk.CTkButton(
                row, 
                text="✕", 
                width=28, 
                height=28,
                corner_radius=6,
                fg_color=C_CARD_INNER,
                hover_color=C_RED,
                text_color=C_TEXT_WHITE,
                font=ctk.CTkFont(size=11, weight="bold"),
                command=lambda p=fpath: self.remove_file(p)
            )
            btn_del.grid(row=0, column=2, padx=8, pady=8)

    def start_analysis_thread(self):
        api_k = self.config_mgr.get_api_key()
        if not api_k:
            self.append_log("❌ Error: Falta la API Key de Gemini.")
            messagebox.showwarning("Falta API Key", "Por favor ingresa tu API Key en la pestaña Ajustes.")
            self.show_settings_tab()
            return

        is_file_mode = "Múltiples" in self.ingest_segmented.get()
        files_to_process = self.selected_files if is_file_mode else []
        raw_text_to_process = self.raw_text_box.get("1.0", tk.END).strip() if not is_file_mode else ""

        if is_file_mode and not files_to_process:
            self.append_log("⚠️ Agrega al menos un archivo para compilar.")
            messagebox.showwarning("Sin archivos", "Por favor agrega uno o más archivos para analizar.")
            return

        if not is_file_mode and not raw_text_to_process:
            self.append_log("⚠️ El texto de notas está vacío.")
            messagebox.showwarning("Texto vacío", "Por favor ingresa o pega los apuntes de la reunión.")
            return

        self.btn_analyze.configure(state="disabled", text="⏳ Compilando y sintetizando con IA...")
        self.progress_bar.grid(row=0, column=0, sticky="ew", pady=(0, 6))
        self.progress_bar.start()

        self.append_log("Iniciando compilación unificada...")

        def run_proc():
            try:
                self.gemini_engine.set_api_key(self.config_mgr.get_api_key())
                self.gemini_engine.model_name = self.config_mgr.config.get("model_name", "gemini-2.0-flash")

                active_profile = self.config_mgr.get_profile()
                sys_prompt = active_profile.get("prompt", "")

                def on_prog(msg):
                    self.after(0, lambda m=msg: self.append_log(m))

                result = self.gemini_engine.analyze_compiled_sources(
                    file_paths=files_to_process,
                    raw_text=raw_text_to_process,
                    system_prompt=sys_prompt,
                    progress_callback=on_prog
                )

                source_summary = f"Compilación de {len(files_to_process)} archivo(s)" if is_file_mode else "Texto Directo"
                self.history_mgr.add_entry(result, source_summary, self.config_mgr.config.get("active_profile", ""))

                self.after(0, lambda: self.on_analysis_success(result))
            except Exception as e:
                err_str = str(e)
                self.after(0, lambda es=err_str: self.on_analysis_error(es))

        threading.Thread(target=run_proc, daemon=True).start()

    def on_analysis_success(self, result: dict):
        self.progress_bar.stop()
        self.progress_bar.grid_forget()
        self.btn_analyze.configure(state="normal", text="⚡  Compilar Fuentes y Generar Minuta")

        filas_count = len(result.get('filas', []))
        self.append_log(f"✅ ¡Compilación completada! {filas_count} acuerdos extraídos.")

        self.current_minuta_data = result
        self.populate_editor(result)
        messagebox.showinfo("Minuta Consolidada", f"¡Compilación finalizada con éxito!\nSe extrajeron {filas_count} compromisos y acuerdos.")
        self.show_editor_tab()

    def on_analysis_error(self, err_msg: str):
        self.progress_bar.stop()
        self.progress_bar.grid_forget()
        self.btn_analyze.configure(state="normal", text="⚡  Compilar Fuentes y Generar Minuta")

        self.append_log(f"❌ Error: {err_msg}")
        messagebox.showerror("Error en Compilación", f"Ocurrió un problema:\n\n{err_msg}")

    # ----------------------------------------------------
    # TAB 2: EDITOR DE MINUTA (ALTO CONTRASTE)
    # ----------------------------------------------------
    def build_editor_tab(self):
        self.tab_editor.grid_columnconfigure(0, weight=1)
        self.tab_editor.grid_rowconfigure(1, weight=1)

        top_bar = ctk.CTkFrame(self.tab_editor, fg_color="transparent")
        top_bar.grid(row=0, column=0, sticky="ew", pady=(0, 12))
        top_bar.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            top_bar, 
            text="Revisión y Edición de Minuta", 
            font=ctk.CTkFont(family="Segoe UI", size=24, weight="bold"),
            text_color=C_TEXT_WHITE
        ).grid(row=0, column=0, sticky="w")

        btn_group = ctk.CTkFrame(top_bar, fg_color="transparent")
        btn_group.grid(row=0, column=1, sticky="e")

        self.btn_copy_md = ctk.CTkButton(
            btn_group, 
            text="📋 Copiar Resumen", 
            width=130, 
            height=36,
            corner_radius=8,
            fg_color=C_CARD,
            hover_color=C_BORDER,
            text_color=C_TEXT_WHITE,
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            command=self.copy_summary_to_clipboard
        )
        self.btn_copy_md.pack(side="left", padx=4)

        self.btn_export_docx = ctk.CTkButton(
            btn_group, 
            text="📄  Crear Word (.docx)", 
            width=160, 
            height=36,
            corner_radius=8,
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            fg_color=C_GREEN,
            hover_color=C_GREEN_HOVER,
            text_color=C_TEXT_WHITE,
            command=self.export_docx_action
        )
        self.btn_export_docx.pack(side="left", padx=4)

        self.editor_scroll = ctk.CTkScrollableFrame(self.tab_editor, corner_radius=14, fg_color=C_CARD)
        self.editor_scroll.grid(row=1, column=0, sticky="nsew")
        self.editor_scroll.grid_columnconfigure(0, weight=1)

        # Tarjeta Datos Generales
        card_info = ctk.CTkFrame(self.editor_scroll, fg_color=C_CARD_INNER, corner_radius=12)
        card_info.grid(row=0, column=0, sticky="ew", padx=12, pady=12)
        card_info.grid_columnconfigure(1, weight=1)
        card_info.grid_columnconfigure(3, weight=1)

        ctk.CTkLabel(card_info, text="Asunto:", font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"), text_color=C_TEXT_WHITE).grid(row=0, column=0, sticky="w", padx=14, pady=(14, 6))
        self.entry_asunto = ctk.CTkEntry(card_info, height=34, corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE)
        self.entry_asunto.grid(row=0, column=1, columnspan=3, sticky="ew", padx=(0, 14), pady=(14, 6))

        ctk.CTkLabel(card_info, text="Fecha:", font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"), text_color=C_TEXT_WHITE).grid(row=1, column=0, sticky="w", padx=14, pady=6)
        self.entry_fecha = ctk.CTkEntry(card_info, height=34, corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE)
        self.entry_fecha.grid(row=1, column=1, sticky="ew", padx=(0, 14), pady=6)

        ctk.CTkLabel(card_info, text="Hora:", font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"), text_color=C_TEXT_WHITE).grid(row=1, column=2, sticky="w", padx=14, pady=6)
        self.entry_hora = ctk.CTkEntry(card_info, height=34, corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE)
        self.entry_hora.grid(row=1, column=3, sticky="ew", padx=(0, 14), pady=6)

        ctk.CTkLabel(card_info, text="Lugar:", font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"), text_color=C_TEXT_WHITE).grid(row=2, column=0, sticky="w", padx=14, pady=6)
        self.entry_lugar = ctk.CTkEntry(card_info, height=34, corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE)
        self.entry_lugar.grid(row=2, column=1, sticky="ew", padx=(0, 14), pady=6)

        ctk.CTkLabel(card_info, text="Coordinador(a):", font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"), text_color=C_TEXT_WHITE).grid(row=2, column=2, sticky="w", padx=14, pady=6)
        self.entry_coord = ctk.CTkEntry(card_info, height=34, corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE)
        self.entry_coord.grid(row=2, column=3, sticky="ew", padx=(0, 14), pady=6)

        ctk.CTkLabel(card_info, text="Asistentes:", font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"), text_color=C_TEXT_WHITE).grid(row=3, column=0, sticky="w", padx=14, pady=(6, 14))
        self.entry_asistentes = ctk.CTkEntry(card_info, height=34, corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE)
        self.entry_asistentes.grid(row=3, column=1, columnspan=3, sticky="ew", padx=(0, 14), pady=(6, 14))

        # Tarjeta Antecedentes
        card_detalles = ctk.CTkFrame(self.editor_scroll, fg_color=C_CARD_INNER, corner_radius=12)
        card_detalles.grid(row=1, column=0, sticky="ew", padx=12, pady=(0, 12))
        card_detalles.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            card_detalles, 
            text="Antecedentes y Puntos Tratados:", 
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color=C_TEXT_WHITE
        ).pack(anchor="w", padx=14, pady=(12, 6))

        self.txt_detalles = ctk.CTkTextbox(card_detalles, height=140, font=ctk.CTkFont(family="Segoe UI", size=13), corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE)
        self.txt_detalles.pack(fill="both", expand=True, padx=14, pady=(0, 14))

        # Tarjeta Tabla de Acuerdos
        card_tabla = ctk.CTkFrame(self.editor_scroll, fg_color=C_CARD_INNER, corner_radius=12)
        card_tabla.grid(row=2, column=0, sticky="ew", padx=12, pady=(0, 12))
        card_tabla.grid_columnconfigure(0, weight=1)

        tabla_header = ctk.CTkFrame(card_tabla, fg_color="transparent")
        tabla_header.pack(fill="x", padx=14, pady=12)

        ctk.CTkLabel(
            tabla_header, 
            text="Matriz de Acuerdos y Compromisos", 
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color=C_TEXT_WHITE
        ).pack(side="left")

        ctk.CTkButton(
            tabla_header, 
            text="+ Agregar Fila", 
            width=110, 
            height=30,
            corner_radius=8,
            fg_color=C_BLUE,
            hover_color=C_BLUE_HOVER,
            text_color=C_TEXT_WHITE,
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"),
            command=self.add_empty_compromiso_row
        ).pack(side="right")

        self.rows_container = ctk.CTkFrame(card_tabla, fg_color="transparent")
        self.rows_container.pack(fill="both", expand=True, padx=14, pady=(0, 14))

    def populate_editor(self, data: dict):
        self.entry_asunto.delete(0, tk.END)
        self.entry_asunto.insert(0, data.get("asunto", ""))

        self.entry_fecha.delete(0, tk.END)
        self.entry_fecha.insert(0, data.get("fecha", ""))

        self.entry_hora.delete(0, tk.END)
        self.entry_hora.insert(0, data.get("hora", ""))

        self.entry_lugar.delete(0, tk.END)
        self.entry_lugar.insert(0, data.get("lugar", ""))

        self.entry_coord.delete(0, tk.END)
        self.entry_coord.insert(0, data.get("coordinador", ""))

        self.entry_asistentes.delete(0, tk.END)
        self.entry_asistentes.insert(0, data.get("asistentes", ""))

        self.txt_detalles.delete("1.0", tk.END)
        self.txt_detalles.insert("1.0", data.get("detalles", ""))

        for widget in self.rows_container.winfo_children():
            widget.destroy()
        self.compromiso_entries = []

        filas = data.get("filas", [])
        if not filas:
            self.add_empty_compromiso_row()
        else:
            for f in filas:
                self.add_compromiso_row_widgets(
                    tema=f.get("tema", ""),
                    compromiso=f.get("compromiso", ""),
                    responsable=f.get("responsable", ""),
                    plazo=f.get("plazo", "")
                )

    def add_empty_compromiso_row(self):
        self.add_compromiso_row_widgets("", "", "", "")

    def add_compromiso_row_widgets(self, tema="", compromiso="", responsable="", plazo=""):
        row_idx = len(self.compromiso_entries) + 1
        row_frame = ctk.CTkFrame(self.rows_container, fg_color=C_CARD, corner_radius=8)
        row_frame.pack(fill="x", pady=4)
        row_frame.grid_columnconfigure(1, weight=2)
        row_frame.grid_columnconfigure(2, weight=3)
        row_frame.grid_columnconfigure(3, weight=2)
        row_frame.grid_columnconfigure(4, weight=1)

        lbl_num = ctk.CTkLabel(row_frame, text=f"{row_idx}.", font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"), text_color=C_TEXT_WHITE, width=28)
        lbl_num.grid(row=0, column=0, padx=6, pady=8)

        e_tema = ctk.CTkEntry(row_frame, placeholder_text="Tema / Asunto", height=32, corner_radius=6, fg_color=C_CARD_INNER, text_color=C_TEXT_WHITE)
        e_tema.insert(0, tema)
        e_tema.grid(row=0, column=1, padx=4, pady=8, sticky="ew")

        e_comp = ctk.CTkEntry(row_frame, placeholder_text="Acuerdo / Compromiso", height=32, corner_radius=6, fg_color=C_CARD_INNER, text_color=C_TEXT_WHITE)
        e_comp.insert(0, compromiso)
        e_comp.grid(row=0, column=2, padx=4, pady=8, sticky="ew")

        e_resp = ctk.CTkEntry(row_frame, placeholder_text="Responsable", height=32, corner_radius=6, fg_color=C_CARD_INNER, text_color=C_TEXT_WHITE)
        e_resp.insert(0, responsable)
        e_resp.grid(row=0, column=3, padx=4, pady=8, sticky="ew")

        e_plazo = ctk.CTkEntry(row_frame, placeholder_text="Plazo", height=32, corner_radius=6, fg_color=C_CARD_INNER, text_color=C_TEXT_WHITE)
        e_plazo.insert(0, plazo)
        e_plazo.grid(row=0, column=4, padx=4, pady=8, sticky="ew")

        btn_del = ctk.CTkButton(
            row_frame, 
            text="✕", 
            width=28, 
            height=28,
            corner_radius=6,
            fg_color=C_CARD_INNER,
            hover_color=C_RED,
            text_color=C_TEXT_WHITE,
            font=ctk.CTkFont(size=11, weight="bold"),
            command=lambda rf=row_frame: self.delete_compromiso_row(rf)
        )
        btn_del.grid(row=0, column=5, padx=6, pady=8)

        self.compromiso_entries.append({
            "frame": row_frame,
            "tema": e_tema,
            "compromiso": e_comp,
            "responsable": e_resp,
            "plazo": e_plazo
        })

    def delete_compromiso_row(self, row_frame):
        self.compromiso_entries = [entry for entry in self.compromiso_entries if entry["frame"] != row_frame]
        row_frame.destroy()

    def get_current_form_data(self) -> dict:
        filas = []
        for entry in self.compromiso_entries:
            t = entry["tema"].get().strip()
            c = entry["compromiso"].get().strip()
            r = entry["responsable"].get().strip()
            p = entry["plazo"].get().strip()
            if t or c or r or p:
                filas.append({
                    "tema": t or "Punto tratado",
                    "compromiso": c or "Sin compromiso",
                    "responsable": r or "No especificado",
                    "plazo": p or "No especificado"
                })

        return {
            "asunto": self.entry_asunto.get().strip() or "Minuta de Reunión",
            "fecha": self.entry_fecha.get().strip() or "No especificado",
            "hora": self.entry_hora.get().strip() or "No especificado",
            "lugar": self.entry_lugar.get().strip() or "No especificado",
            "coordinador": self.entry_coord.get().strip() or "Coordinador(a) de Reunión",
            "asistentes": self.entry_asistentes.get().strip() or "No especificado",
            "detalles": self.txt_detalles.get("1.0", tk.END).strip(),
            "filas": filas
        }

    def copy_summary_to_clipboard(self):
        data = self.get_current_form_data()
        md = f"""# MINUTA: {data['asunto']}
- **Fecha:** {data['fecha']} | **Hora:** {data['hora']}
- **Lugar:** {data['lugar']}
- **Coordinador:** {data['coordinador']}
- **Asistentes:** {data['asistentes']}

## Antecedentes y Desarrollo:
{data['detalles']}

## Acuerdos y Compromisos:
"""
        for idx, f in enumerate(data['filas'], 1):
            md += f"{idx}. **{f['tema']}**: {f['compromiso']} (Resp: {f['responsable']} | Plazo: {f['plazo']})\n"

        self.clipboard_clear()
        self.clipboard_append(md)
        messagebox.showinfo("Copiado", "Resumen copiado al portapapeles en formato Markdown.")

    def export_docx_action(self):
        data = self.get_current_form_data()
        clean_asunto = "".join(c for c in data['asunto'] if c.isalnum() or c in (' ', '_', '-')).rstrip()
        default_name = f"Minuta_{clean_asunto or 'Reunion'}.docx"

        save_path = filedialog.asksaveasfilename(
            title="Guardar Minuta Word",
            initialfile=default_name,
            defaultextension=".docx",
            filetypes=[("Documento de Word", "*.docx")]
        )

        if not save_path:
            return

        try:
            custom_tpl = self.config_mgr.config.get("custom_template_path", "")
            self.docx_engine.generate_docx(data, save_path, template_path=custom_tpl if custom_tpl else None)
            
            if messagebox.askyesno("Éxito", f"Documento generado correctamente en:\n{save_path}\n\n¿Deseas abrir el archivo ahora?"):
                if sys.platform == "win32":
                    os.startfile(save_path)
                elif sys.platform == "darwin":
                    subprocess.call(["open", save_path])
                else:
                    subprocess.call(["xdg-open", save_path])
        except Exception as e:
            messagebox.showerror("Error al Generar Word", f"No se pudo crear el documento:\n{e}")

    # ----------------------------------------------------
    # TAB 3: PLANTILLAS WORD
    # ----------------------------------------------------
    def build_templates_tab(self):
        self.tab_templates.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            self.tab_templates, 
            text="Gestión de Plantillas Word", 
            font=ctk.CTkFont(family="Segoe UI", size=24, weight="bold"),
            text_color=C_TEXT_WHITE
        ).pack(anchor="w", pady=(0, 14))

        card = ctk.CTkFrame(self.tab_templates, fg_color=C_CARD, corner_radius=14)
        card.pack(fill="x", pady=(0, 14))

        ctk.CTkLabel(
            card, 
            text="Plantilla Activa:", 
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color=C_TEXT_WHITE
        ).pack(anchor="w", padx=16, pady=(16, 4))
        
        tpl_path = self.config_mgr.config.get("custom_template_path", "")
        tpl_desc = tpl_path if tpl_path else "Plantilla Oficial DOH Integrada (Predeterminada)"
        
        self.lbl_tpl_status = ctk.CTkLabel(
            card, 
            text=f"📄 {tpl_desc}", 
            font=ctk.CTkFont(family="Segoe UI", size=13), 
            text_color=C_TEXT_LIGHT
        )
        self.lbl_tpl_status.pack(anchor="w", padx=16, pady=4)

        btn_box = ctk.CTkFrame(card, fg_color="transparent")
        btn_box.pack(anchor="w", padx=16, pady=(12, 16))

        ctk.CTkButton(
            btn_box, 
            text="Seleccionar Plantilla .docx Propia...", 
            height=34,
            corner_radius=8,
            fg_color=C_BLUE,
            hover_color=C_BLUE_HOVER,
            text_color=C_TEXT_WHITE,
            command=self.select_custom_template
        ).pack(side="left", padx=(0, 8))

        ctk.CTkButton(
            btn_box, 
            text="Restaurar Plantilla Oficial DOH", 
            height=34,
            corner_radius=8,
            fg_color=C_CARD_INNER,
            hover_color=C_BORDER,
            text_color=C_TEXT_WHITE,
            command=self.reset_default_template
        ).pack(side="left")

        guide_card = ctk.CTkFrame(self.tab_templates, fg_color=C_CARD, corner_radius=14)
        guide_card.pack(fill="both", expand=True)

        ctk.CTkLabel(
            guide_card, 
            text="Etiquetas Soportadas en Plantillas Word:", 
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            text_color=C_TEXT_WHITE
        ).pack(anchor="w", padx=16, pady=(16, 8))

        guide_text = """Diseña tu plantilla Word oficial incluyendo cualquiera de estas etiquetas de reemplazo automático:

• {ASUNTO}           : Título o asunto formal de la reunión.
• {FECHA}            : Fecha de la sesión.
• {HORA}             : Hora de inicio o realización.
• {LUGAR}            : Ubicación física o enlace virtual.
• {COORDINADOR}      : Nombre o cargo del redactor / coordinador(a).
• {ASISTENTES}       : Lista de participantes detectados.
• {DETALLES}         : Resumen completo de antecedentes y desarrollo.
• {TABLA_COMPROMISOS}: Genera la matriz con N°, Tema, Compromiso, Responsable y Plazo."""

        txt = ctk.CTkTextbox(guide_card, font=ctk.CTkFont(family="Consolas", size=12), corner_radius=8, fg_color=C_CARD_INNER, text_color=C_TEXT_WHITE)
        txt.insert("1.0", guide_text)
        txt.configure(state="disabled")
        txt.pack(fill="both", expand=True, padx=16, pady=(0, 16))

    def select_custom_template(self):
        f = filedialog.askopenfilename(title="Seleccionar plantilla Word", filetypes=[("Plantillas Word", "*.docx")])
        if f:
            self.config_mgr.config["custom_template_path"] = f
            self.config_mgr.save_config()
            self.lbl_tpl_status.configure(text=f"📄 Plantilla Personalizada: {os.path.basename(f)}")
            messagebox.showinfo("Plantilla Guardada", f"Se utilizará la plantilla:\n{f}")

    def reset_default_template(self):
        self.config_mgr.config["custom_template_path"] = ""
        self.config_mgr.save_config()
        self.lbl_tpl_status.configure(text="📄 Plantilla Oficial DOH Integrada (Predeterminada)")
        messagebox.showinfo("Plantilla Restaurada", "Se ha restaurado la plantilla oficial por defecto.")

    # ----------------------------------------------------
    # TAB 4: HISTORIAL
    # ----------------------------------------------------
    def build_history_tab(self):
        self.tab_history.grid_columnconfigure(0, weight=1)
        self.tab_history.grid_rowconfigure(2, weight=1)

        h_frame = ctk.CTkFrame(self.tab_history, fg_color="transparent")
        h_frame.grid(row=0, column=0, sticky="ew", pady=(0, 14))

        ctk.CTkLabel(
            h_frame, 
            text="Historial de Minutas Compiladas", 
            font=ctk.CTkFont(family="Segoe UI", size=24, weight="bold"),
            text_color=C_TEXT_WHITE
        ).pack(anchor="w")

        search_bar = ctk.CTkFrame(self.tab_history, fg_color=C_CARD, corner_radius=12)
        search_bar.grid(row=1, column=0, sticky="ew", pady=(0, 12))
        search_bar.grid_columnconfigure(0, weight=1)

        self.entry_search = ctk.CTkEntry(
            search_bar, 
            placeholder_text="🔍 Buscar por asunto, fecha, participante o contenido...", 
            height=38,
            corner_radius=8,
            fg_color=C_CARD_INNER,
            text_color=C_TEXT_WHITE
        )
        self.entry_search.grid(row=0, column=0, padx=(12, 8), pady=8, sticky="ew")
        self.entry_search.bind("<KeyRelease>", lambda e: self.refresh_history_list())

        ctk.CTkButton(
            search_bar, 
            text="Limpiar", 
            width=80, 
            height=38,
            corner_radius=8,
            fg_color=C_CARD_INNER,
            hover_color=C_BORDER,
            text_color=C_TEXT_WHITE,
            command=self.clear_search
        ).grid(row=0, column=1, padx=(0, 12), pady=8)

        self.history_scroll = ctk.CTkScrollableFrame(self.tab_history, corner_radius=14, fg_color=C_CARD)
        self.history_scroll.grid(row=2, column=0, sticky="nsew")
        self.history_scroll.grid_columnconfigure(0, weight=1)

    def clear_search(self):
        self.entry_search.delete(0, tk.END)
        self.refresh_history_list()

    def refresh_history_list(self):
        for w in self.history_scroll.winfo_children():
            w.destroy()

        query = self.entry_search.get().strip() if hasattr(self, "entry_search") else ""
        items = self.history_mgr.search(query)

        if not items:
            lbl = ctk.CTkLabel(
                self.history_scroll, 
                text="No hay minutas registradas en el historial.", 
                font=ctk.CTkFont(family="Segoe UI", size=14), 
                text_color=C_TEXT_MUTED
            )
            lbl.pack(pady=40)
            return

        for item in items:
            card = ctk.CTkFrame(self.history_scroll, fg_color=C_CARD_INNER, corner_radius=10)
            card.pack(fill="x", padx=10, pady=6)
            card.grid_columnconfigure(0, weight=1)

            title_row = ctk.CTkFrame(card, fg_color="transparent")
            title_row.grid(row=0, column=0, sticky="ew", padx=14, pady=(10, 4))
            title_row.grid_columnconfigure(0, weight=1)

            asunto = item.get("asunto", "Sin Asunto")
            ctk.CTkLabel(
                title_row, 
                text=f"📋 {asunto}", 
                font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
                text_color=C_TEXT_WHITE
            ).grid(row=0, column=0, sticky="w")
            
            created_at = item.get("created_at", "")
            ctk.CTkLabel(
                title_row, 
                text=created_at, 
                font=ctk.CTkFont(family="Segoe UI", size=11), 
                text_color=C_TEXT_MUTED
            ).grid(row=0, column=1, sticky="e")

            fecha = item.get("fecha", "No especificado")
            lugar = item.get("lugar", "No especificado")
            filas_c = item.get("compromisos_count", 0)
            source = item.get("source_name", "Origen")
            info_str = f"📅 {fecha}  •  📍 {lugar}  •  🎯 {filas_c} Acuerdos  •  📁 {source}"
            
            ctk.CTkLabel(
                card, 
                text=info_str, 
                font=ctk.CTkFont(family="Segoe UI", size=12), 
                text_color=C_TEXT_LIGHT
            ).grid(row=1, column=0, sticky="w", padx=14, pady=(0, 8))

            btn_row = ctk.CTkFrame(card, fg_color="transparent")
            btn_row.grid(row=2, column=0, sticky="e", padx=14, pady=(0, 10))

            entry_id = item.get("id")
            ctk.CTkButton(
                btn_row, 
                text="Abrir en Editor", 
                width=110, 
                height=28,
                corner_radius=6,
                fg_color=C_BLUE,
                hover_color=C_BLUE_HOVER,
                text_color=C_TEXT_WHITE,
                font=ctk.CTkFont(family="Segoe UI", size=11, weight="bold"),
                command=lambda eid=entry_id: self.load_history_item(eid)
            ).pack(side="left", padx=4)

            ctk.CTkButton(
                btn_row, 
                text="✕", 
                width=28, 
                height=28,
                corner_radius=6,
                fg_color=C_CARD,
                hover_color=C_RED,
                text_color=C_TEXT_WHITE,
                font=ctk.CTkFont(size=11, weight="bold"),
                command=lambda eid=entry_id: self.delete_history_item(eid)
            ).pack(side="left", padx=4)

    def load_history_item(self, entry_id: str):
        entry = self.history_mgr.get_entry(entry_id)
        if entry and "data" in entry:
            self.current_minuta_data = entry["data"]
            self.populate_editor(entry["data"])
            self.show_editor_tab()

    def delete_history_item(self, entry_id: str):
        if messagebox.askyesno("Eliminar Registro", "¿Deseas eliminar esta minuta del historial?"):
            self.history_mgr.delete_entry(entry_id)
            self.refresh_history_list()

    # ----------------------------------------------------
    # TAB 5: AJUSTES GLOBALES
    # ----------------------------------------------------
    def build_settings_tab(self):
        self.tab_settings.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            self.tab_settings, 
            text="Ajustes & Configuración Global", 
            font=ctk.CTkFont(family="Segoe UI", size=24, weight="bold"),
            text_color=C_TEXT_WHITE
        ).pack(anchor="w", pady=(0, 14))

        scroll = ctk.CTkScrollableFrame(self.tab_settings, corner_radius=14, fg_color=C_CARD)
        scroll.pack(fill="both", expand=True)
        scroll.grid_columnconfigure(0, weight=1)

        # Card 1: API Key & Validación
        card_api = ctk.CTkFrame(scroll, fg_color=C_CARD_INNER, corner_radius=12)
        card_api.pack(fill="x", padx=12, pady=8)
        card_api.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(
            card_api, 
            text="Google Gemini API Key", 
            font=ctk.CTkFont(family="Segoe UI", size=15, weight="bold"),
            text_color=C_TEXT_WHITE
        ).grid(row=0, column=0, columnspan=2, sticky="w", padx=16, pady=(16, 2))
        
        ctk.CTkLabel(
            card_api, 
            text="Obtén o consulta tu clave en Google AI Studio (aistudio.google.com).", 
            font=ctk.CTkFont(family="Segoe UI", size=12), 
            text_color=C_TEXT_LIGHT
        ).grid(row=1, column=0, columnspan=2, sticky="w", padx=16, pady=(0, 12))

        self.entry_api_key = ctk.CTkEntry(card_api, placeholder_text="AIzaSyB...", show="•", height=38, corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE)
        self.entry_api_key.insert(0, self.config_mgr.get_api_key())
        self.entry_api_key.grid(row=2, column=0, columnspan=2, sticky="ew", padx=16, pady=4)

        btn_box = ctk.CTkFrame(card_api, fg_color="transparent")
        btn_box.grid(row=3, column=0, columnspan=2, sticky="w", padx=16, pady=(10, 16))

        ctk.CTkButton(
            btn_box, 
            text="💾 Guardar API Key", 
            height=34,
            corner_radius=8,
            fg_color=C_BLUE,
            hover_color=C_BLUE_HOVER,
            text_color=C_TEXT_WHITE,
            command=self.save_api_key
        ).pack(side="left", padx=(0, 8))

        ctk.CTkButton(
            btn_box, 
            text="🔍 Probar y Mapear Modelos", 
            height=34,
            corner_radius=8,
            fg_color=C_CARD,
            hover_color=C_BORDER,
            text_color=C_TEXT_WHITE,
            command=self.test_api_connection
        ).pack(side="left")

        # Card 2: Preferencias de Directorio y Tema
        card_pref = ctk.CTkFrame(scroll, fg_color=C_CARD_INNER, corner_radius=12)
        card_pref.pack(fill="x", padx=12, pady=8)
        card_pref.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(
            card_pref, 
            text="Preferencias de Aplicación", 
            font=ctk.CTkFont(family="Segoe UI", size=15, weight="bold"),
            text_color=C_TEXT_WHITE
        ).grid(row=0, column=0, columnspan=2, sticky="w", padx=16, pady=(16, 12))

        ctk.CTkLabel(card_pref, text="Tema Visual:", font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"), text_color=C_TEXT_WHITE).grid(row=1, column=0, sticky="w", padx=16, pady=8)
        self.theme_combo = ctk.CTkComboBox(card_pref, values=["Dark", "Light", "System"], command=self.on_theme_change, height=34, corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE, dropdown_text_color=C_TEXT_WHITE, dropdown_fg_color=C_CARD)
        self.theme_combo.set(self.config_mgr.config.get("theme", "Dark"))
        self.theme_combo.grid(row=1, column=1, sticky="w", padx=16, pady=8)

        ctk.CTkLabel(card_pref, text="Carpeta de Salida:", font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold"), text_color=C_TEXT_WHITE).grid(row=2, column=0, sticky="w", padx=16, pady=8)
        
        folder_box = ctk.CTkFrame(card_pref, fg_color="transparent")
        folder_box.grid(row=2, column=1, sticky="ew", padx=16, pady=8)
        folder_box.grid_columnconfigure(0, weight=1)

        self.entry_out_dir = ctk.CTkEntry(folder_box, height=34, corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE)
        self.entry_out_dir.insert(0, self.config_mgr.config.get("output_directory", ""))
        self.entry_out_dir.grid(row=0, column=0, sticky="ew", padx=(0, 8))

        ctk.CTkButton(folder_box, text="Cambiar...", width=80, height=34, corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE, command=self.select_output_dir).grid(row=0, column=1)

        # Card 3: Prompts de Sistema
        card_prompt = ctk.CTkFrame(scroll, fg_color=C_CARD_INNER, corner_radius=12)
        card_prompt.pack(fill="both", expand=True, padx=12, pady=8)
        card_prompt.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            card_prompt, 
            text="Prompt de Sistema del Perfil", 
            font=ctk.CTkFont(family="Segoe UI", size=15, weight="bold"),
            text_color=C_TEXT_WHITE
        ).pack(anchor="w", padx=16, pady=(16, 2))
        
        ctk.CTkLabel(
            card_prompt, 
            text="Edita las instrucciones de extracción, vocabulario técnico y formalidad para el perfil activo.", 
            font=ctk.CTkFont(family="Segoe UI", size=12), 
            text_color=C_TEXT_LIGHT
        ).pack(anchor="w", padx=16, pady=(0, 8))

        self.txt_profile_prompt = ctk.CTkTextbox(card_prompt, height=180, font=ctk.CTkFont(family="Consolas", size=12), corner_radius=8, fg_color=C_CARD, text_color=C_TEXT_WHITE)
        self.txt_profile_prompt.pack(fill="both", expand=True, padx=16, pady=8)
        
        curr_prof = self.config_mgr.get_profile()
        self.txt_profile_prompt.insert("1.0", curr_prof.get("prompt", ""))

        ctk.CTkButton(
            card_prompt, 
            text="💾 Guardar Cambios en Prompt", 
            height=34,
            corner_radius=8,
            fg_color=C_BLUE,
            hover_color=C_BLUE_HOVER,
            text_color=C_TEXT_WHITE,
            command=self.save_profile_prompt
        ).pack(anchor="w", padx=16, pady=(0, 16))

    def save_api_key(self):
        k = self.entry_api_key.get().strip()
        self.config_mgr.set_api_key(k)
        self.gemini_engine.set_api_key(k)
        
        api_status = "● API Activa" if k else "○ Sin API Key"
        self.api_status_label.configure(
            text=api_status, 
            text_color=C_GREEN if k else C_RED
        )
        self.append_log("API Key guardada exitosamente.")
        messagebox.showinfo("Guardado", "API Key de Gemini guardada correctamente.")

        threading.Thread(target=self.silently_fetch_models, daemon=True).start()

    def test_api_connection(self):
        k = self.entry_api_key.get().strip()
        self.gemini_engine.set_api_key(k)
        self.append_log("Probando conexión y mapeando modelos en Google Gemini...")
        
        success, msg, models = self.gemini_engine.test_connection()
        if success:
            self.config_mgr.config["available_models"] = models
            self.config_mgr.save_config()
            self.update_model_dropdown()
            self.append_log(f"✅ {msg}")
            messagebox.showinfo("Conexión Exitosa", f"{msg}\n\nModelos detectados y habilitados:\n• " + "\n• ".join(models[:8]))
        else:
            self.append_log(f"❌ {msg}")
            messagebox.showerror("Error de Conexión", msg)

    def on_theme_change(self, choice):
        self.config_mgr.config["theme"] = choice
        self.config_mgr.save_config()
        ctk.set_appearance_mode(choice)

    def select_output_dir(self):
        d = filedialog.askdirectory(title="Seleccionar carpeta de salida")
        if d:
            self.entry_out_dir.delete(0, tk.END)
            self.entry_out_dir.insert(0, d)
            self.config_mgr.config["output_directory"] = d
            self.config_mgr.save_config()

    def save_profile_prompt(self):
        active_name = self.config_mgr.config.get("active_profile", "DOH Embalse Zapallar")
        prof = self.config_mgr.get_profile(active_name).copy()
        prof["prompt"] = self.txt_profile_prompt.get("1.0", tk.END).strip()
        self.config_mgr.update_profile(active_name, prof)
        messagebox.showinfo("Guardado", f"Prompt del perfil '{active_name}' actualizado correctamente.")

if __name__ == "__main__":
    app = MinutasApp()
    app.mainloop()
