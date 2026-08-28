import os
import sys
import subprocess

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def find_iscc():
    candidates = [
        os.path.join(os.environ.get('LOCALAPPDATA', ''), r'Programs\Inno Setup 6\ISCC.exe'),
        r'C:\Program Files (x86)\Inno Setup 6\ISCC.exe',
        r'C:\Program Files\Inno Setup 6\ISCC.exe',
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

def build():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_root = os.path.dirname(root_dir)
    main_py = os.path.join(root_dir, "main.py")
    templates_dir = os.path.join(root_dir, "templates")
    manifest_path = os.path.join(root_dir, "app.manifest")
    iss_file = os.path.join(workspace_root, "minutas_setup.iss")

    print("================================================================")
    print("[1/2] Compilando build portable --onedir con PyInstaller...")
    print("================================================================")

    from docx_engine import DocxEngine
    DocxEngine(templates_dir=templates_dir).ensure_default_template()

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",
        f"--manifest={manifest_path}",
        f"--add-data={templates_dir};templates",
        "--collect-all", "customtkinter",
        "--collect-all", "google.genai",
        "--collect-all", "docx",
        "--collect-all", "pypdf",
        "--collect-all", "requests",
        "--onedir",
        "-y",
        "--name", "MinutasAI_Studio_Portable",
        "--clean",
        main_py
    ]
    subprocess.run(cmd, cwd=root_dir, check=True)

    portable_src = os.path.join(root_dir, "dist", "MinutasAI_Studio_Portable")
    if not os.path.exists(portable_src):
        raise RuntimeError("Build --onedir failed: dist folder not found")

    print()
    print("================================================================")
    print("[2/2] Creando Instalador Oficial de Windows con Inno Setup...")
    print("================================================================")

    iscc_path = find_iscc()
    if not iscc_path:
        raise RuntimeError("No se encontró ISCC.exe (Inno Setup 6).")

    print(f"  Compilador Inno Setup: {iscc_path}")
    print(f"  Script de configuración: {iss_file}")

    subprocess.run([iscc_path, iss_file], check=True, cwd=workspace_root)

    installer_exe = os.path.join(workspace_root, "Instalador_MinutasAI_Studio.exe")
    if os.path.exists(installer_exe):
        size_mb = os.path.getsize(installer_exe) / 1024 / 1024
        print()
        print("================================================================")
        print(f"🎉 ¡Instalador creado con éxito! ({size_mb:.1f} MB)")
        print(f"📁 Ubicación: {installer_exe}")
        print("================================================================")

if __name__ == "__main__":
    build()
