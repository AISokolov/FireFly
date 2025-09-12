from PySide6.QtWidgets import QDialog, QVBoxLayout, QLabel, QLineEdit, QPushButton, QFileDialog, QWidget
from PySide6.QtCore import Qt, QPoint


class AddViewDialog(QDialog):  # Change QMainWindow to QDialog
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Add New View")
        screen_geometry = self.screen().availableGeometry()
        window_geometry = self.geometry()

        x = (screen_geometry.width() - window_geometry.width()) // 2
        y = (screen_geometry.height() - window_geometry.height()) // 2
        self.setGeometry(250, 150, 300, 300)
        self.setWindowFlags(Qt.FramelessWindowHint)

        # Variables for dragging the window
        self.dragging = False
        self.offset = QPoint()

        # Create a central widget and set the layout
        layout = QVBoxLayout(self)  # Directly set the QDialog's layout

        # Close button
        self.close_button = QPushButton("x", self)
        self.close_button.setObjectName("closeButton")
        self.close_button.setFixedSize(30, 30)
        self.close_button.clicked.connect(self.close)
        layout.addWidget(self.close_button, alignment=Qt.AlignRight)  # Align close button to the right

        # Name input
        self.name_input = QLineEdit(self)
        self.name_input.setPlaceholderText("Name")
        layout.addWidget(self.name_input)

        # URL input
        self.url_input = QLineEdit(self)
        self.url_input.setPlaceholderText("URL")
        layout.addWidget(self.url_input)

        # Icon selection
        self.icon_button = QPushButton("Choose Icon", self)
        self.icon_button.clicked.connect(self.choose_icon)
        layout.addWidget(self.icon_button)

        # Download icon button
        self.download_icon_button = QPushButton("Find more icons here", self)
        self.download_icon_button.clicked.connect(self.download_icon)
        layout.addWidget(self.download_icon_button)

        # Add button
        self.add_button = QPushButton("Add", self)
        self.add_button.clicked.connect(self.accept)  # Now 'accept' is available
        layout.addWidget(self.add_button)

        self.icon_path = ""

    def choose_icon(self):
        self.icon_path, _ = QFileDialog.getOpenFileName(self, "Choose Icon", "icons", "Images (*.png *.xpm *.jpg *.ico)")

    def get_data(self):
        return self.name_input.text(), self.url_input.text(), self.icon_path

    def download_icon(self):
        import webbrowser
        webbrowser.open("https://seeklogo.com/")
