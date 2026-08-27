import os
import sys
import shutil
import subprocess

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def build():
    print("==================================================")
    print("[*] Compilando Minutas AI Studio v2.1 (.exe)")
    print("==================================================")

    root_dir = os.path.dirname(os.path.abspath(__file__))
    main_py = os.path.join(root_dir, "main.py")
    templates_dir = os.path.join(root_dir, "templates")

    from docx_engine import DocxEngine
    engine = DocxEngine(templates_dir=templates_dir)
    engine.ensure_default_template()

    cmd = [
        sys.executable,
        "-m", "PyInstaller",
        "--noconsole",
        "--onefile",
        "--name", "MinutasAI_Studio",
        f"--add-data={templates_dir};templates",
        "--collect-all", "customtkinter",
        "--collect-all", "google.genai",
        "--collect-all", "docx",
        "--collect-all", "pypdf",
        "--collect-all", "requests",
        main_py
    ]

    print("Ejecutando PyInstaller...")
    res = subprocess.run(cmd, cwd=root_dir)

    if res.returncode == 0:
        exe_path = os.path.join(root_dir, "dist", "MinutasAI_Studio.exe")
        target_dist = os.path.join(os.path.dirname(root_dir), "MinutasAI_Studio.exe")
        
        if os.path.exists(exe_path):
            shutil.copy2(exe_path, target_dist)
            print("\n==================================================")
            print("[OK] Compilación v2.1 completada con ÉXITO!")
            print(f"[*] Archivo ejecutable (.exe) actualizado en:\n{target_dist}")
            print("==================================================")
        else:
            print("Compilación finalizada en dist/")
    else:
        print(f"\n[ERROR] Error en la compilación. Código de salida: {res.returncode}")

if __name__ == "__main__":
    build()
