import sys
import os

from PySide6 import QtGui
from PySide6.QtWidgets import QApplication
from view.main_window import ChatGPTApp
from util.stylesheet import load_stylesheet

# Set up a persistent storage path for the profile
storage_path = os.path.join(os.getcwd(), "firefly_profile")
cache_path = os.path.join(os.getcwd(), "firefly_cache")

# Ensure the directories exist
os.makedirs(storage_path, exist_ok=True)
os.makedirs(cache_path, exist_ok=True)

basedir = os.path.dirname(__file__)

try:
    from ctypes import windll  # Only exists on Windows.
    myappid = 'mycompany.myproduct.subproduct.version'
    windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
except ImportError:
    pass

def resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        # PyInstaller creates a temp folder and stores the resources there
        base_path = sys._MEIPASS
    else:
        # Use the current directory in development mode
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

if __name__ == "__main__":
    # Create the Qt application
    app = QApplication(sys.argv)

    # Load and apply the stylesheet
    stylesheet_path = resource_path("styles/style.qss")
    stylesheet = load_stylesheet(stylesheet_path)
    if stylesheet:
        app.setStyleSheet(stylesheet)
    else:
        print(f"Failed to load stylesheet from: {stylesheet_path}")

    app.setWindowIcon(QtGui.QIcon(os.path.join(basedir, 'icons/appIcon.ico')))

    # Create and show the main window
    window = ChatGPTApp(storage_path, cache_path)
    window.show()

    # Run the application
    sys.exit(app.exec())