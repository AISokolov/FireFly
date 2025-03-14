import sys
import os
from PySide6.QtWidgets import QApplication
from view.main_window import ChatGPTApp
from util.stylesheet import load_stylesheet

# Set up a persistent storage path for the profile
storage_path = os.path.join(os.getcwd(), "firefly_profile")
cache_path = os.path.join(os.getcwd(), "firefly_cache")

# Ensure the directories exist
os.makedirs(storage_path, exist_ok=True)
os.makedirs(cache_path, exist_ok=True)

if __name__ == "__main__":
    app = QApplication(sys.argv)

    # Load and apply the stylesheet
    stylesheet = load_stylesheet("styles/style.css")
    if stylesheet:
        app.setStyleSheet(stylesheet)

    # Create and show the main window
    window = ChatGPTApp(storage_path, cache_path)
    window.show()

    # Run the application
    sys.exit(app.exec())