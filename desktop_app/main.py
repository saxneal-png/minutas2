import os
import sys

# Ensure local imports work when compiled or run directly
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from docx_engine import DocxEngine
from gui import MinutasApp

def main():
    # Pre-generate default templates if they do not exist
    try:
        engine = DocxEngine()
        engine.ensure_default_template()
    except Exception as e:
        print(f"Advertencia inicializando plantillas: {e}")

    app = MinutasApp()
    app.mainloop()

if __name__ == "__main__":
    main()
