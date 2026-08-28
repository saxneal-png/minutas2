import os
import sys
import shutil
import zipfile
import subprocess

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def package():
    print("================================================================")
    print("[*] Empaquetando Minutas AI Studio (Edicion Universal Multi-PC)")
    print("================================================================")

    root_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.dirname(root_dir)
    dist_folder = os.path.join(workspace_root, "Minutas_AI_Studio")

    if os.path.exists(dist_folder):
        shutil.rmtree(dist_folder)
    os.makedirs(dist_folder, exist_ok=True)

    # 1. Compilar el lanzador nativo de Windows (C# .NET) con Microsoft csc.exe
    csc_path = r"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    launcher_cs = os.path.join(workspace_root, "launcher.cs")
    launcher_exe = os.path.join(dist_folder, "MinutasAI.exe")

    print("[1/5] Compilando lanzador nativo MinutasAI.exe con csc.exe...")
    if os.path.exists(csc_path) and os.path.exists(launcher_cs):
        subprocess.run([
            csc_path,
            "/target:winexe",
            "/optimize+",
            f"/out:{launcher_exe}",
            launcher_cs
        ], check=True)
        print("  [OK] Lanzador nativo MinutasAI.exe generado")

    # 2. Copiar archivos de la aplicación a dist/app
    app_target = os.path.join(dist_folder, "app")
    os.makedirs(app_target, exist_ok=True)

    print("[2/5] Copiando codigo y recursos de la aplicacion...")
    py_files = ["main.py", "gui.py", "gemini_engine.py", "docx_engine.py", "config_manager.py", "history_manager.py"]
    for f in py_files:
        src = os.path.join(root_dir, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(app_target, f))

    # Asegurar plantillas
    from docx_engine import DocxEngine
    engine = DocxEngine(templates_dir=os.path.join(app_target, "templates"))
    engine.ensure_default_template()

    # 3. Copiar el runtime de Python oficial
    py_base = os.path.dirname(sys.executable)
    runtime_target = os.path.join(dist_folder, "runtime")
    os.makedirs(runtime_target, exist_ok=True)

    print(f"[3/5] Empaquetando entorno de ejecucion autonomo desde {py_base}...")
    
    # Binarios y DLLs del core
    for item in os.listdir(py_base):
        src_item = os.path.join(py_base, item)
        dst_item = os.path.join(runtime_target, item)
        if os.path.isfile(src_item) and (item.endswith(".exe") or item.endswith(".dll") or item.endswith(".txt")):
            shutil.copy2(src_item, dst_item)

    # Carpetas esenciales: DLLs, tcl
    for folder in ["DLLs", "tcl"]:
        src_f = os.path.join(py_base, folder)
        dst_f = os.path.join(runtime_target, folder)
        if os.path.exists(src_f):
            shutil.copytree(src_f, dst_f, dirs_exist_ok=True)

    # Lib (estándar + site-packages)
    lib_src = os.path.join(py_base, "Lib")
    lib_dst = os.path.join(runtime_target, "Lib")
    print("  [OK] Copiando librerias estandar y modulos...")
    
    def ignore_patterns(d, files):
        return [f for f in files if f == "__pycache__" or f.endswith(".pyc")]

    shutil.copytree(lib_src, lib_dst, ignore=ignore_patterns, dirs_exist_ok=True)

    # 4. Crear lanzador batch secundario de conveniencia
    bat_content = """@echo off
start "" "%~dp0runtime\\pythonw.exe" "%~dp0app\\main.py"
"""
    with open(os.path.join(dist_folder, "Iniciar_Minutas.bat"), "w", encoding="utf-8") as f:
        f.write(bat_content)

    readme_content = """===============================================================
  MINUTAS AI STUDIO - COMPILADOR DE APUNTES Y MINUTAS AUTOMATICO
===============================================================

INSTRUCCIONES DE USO:
1. Haz doble clic en 'MinutasAI.exe' (o en 'Iniciar_Minutas.bat').
2. La aplicacion se abrira instantaneamente.
3. No requiere instalar Python, Node.js ni ningun programa adicional.
4. Funciona en cualquier computador con Windows (10 o 11).

Si copias esta carpeta a otro PC o a un pendrive USB:
- Puedes mover toda la carpeta 'Minutas_AI_Studio' a cualquier lugar (Escritorio, Documentos, etc.)
- Ejecuta siempre 'MinutasAI.exe'.
"""
    with open(os.path.join(dist_folder, "LEEME.txt"), "w", encoding="utf-8") as f:
        f.write(readme_content)

    # 5. Crear archivo ZIP final
    zip_dest = os.path.join(workspace_root, "Minutas_AI_Studio_Universal.zip")
    print(f"[4/5] Creando archivo comprimido {zip_dest}...")
    with zipfile.ZipFile(zip_dest, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(dist_folder):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, workspace_root)
                zipf.write(file_path, arcname)

    print("\n================================================================")
    print("[OK] PAQUETE UNIVERSAL MULTI-PC CREADO CON EXITO!")
    print(f"[*] Carpeta lista: {dist_folder}")
    print(f"[*] Archivo ZIP listo para enviar o copiar por USB:\n{zip_dest}")
    print("================================================================")

if __name__ == "__main__":
    package()
