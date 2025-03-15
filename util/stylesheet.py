from PySide6.QtCore import QFile, QTextStream

def load_stylesheet(filename):
    """Load and apply a CSS stylesheet to the application."""
    file = QFile(filename)
    if file.open(QFile.ReadOnly | QFile.Text):
        stream = QTextStream(file)
        stylesheet = stream.readAll()
        file.close()
        print(f"Stylesheet loaded successfully from: {filename}")  # Debugging
        return stylesheet
    print(f"Failed to open stylesheet file: {filename}")  # Debugging
    return ""