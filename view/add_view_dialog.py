from PySide6.QtCore import Qt
from PySide6.QtWidgets import QDialog, QVBoxLayout, QLabel, QLineEdit, QPushButton, QFileDialog

class AddViewDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Add New View")
        screen_geometry = self.screen().availableGeometry()
        dialog_geometry = self.geometry()

        x = (screen_geometry.width() - dialog_geometry.width()) // 2
        y = (screen_geometry.height() - dialog_geometry.height()) // 2
        self.setGeometry(x, y, 300, 200)

        layout = QVBoxLayout(self)

        self.name_label = QLabel("Name:")
        self.name_input = QLineEdit(self)
        layout.addWidget(self.name_label)
        layout.addWidget(self.name_input)

        self.url_label = QLabel("URL:")
        self.url_input = QLineEdit(self)
        layout.addWidget(self.url_label)
        layout.addWidget(self.url_input)

        self.icon_label = QLabel("Icon:")
        self.icon_button = QPushButton("Choose Icon", self)
        self.icon_button.clicked.connect(self.choose_icon)
        layout.addWidget(self.icon_label)
        layout.addWidget(self.icon_button)

        self.download_icon_button = QPushButton("Find more icons here", self)
        self.download_icon_button.clicked.connect(self.download_icon)
        layout.addWidget(self.download_icon_button)

        self.add_button = QPushButton("Add", self)
        self.add_button.clicked.connect(self.accept)
        layout.addWidget(self.add_button)

        self.icon_path = ""

    def choose_icon(self):
        self.icon_path, _ = QFileDialog.getOpenFileName(self, "Choose Icon", "", "Images (*.png *.xpm *.jpg)")

    def get_data(self):
        return self.name_input.text(), self.url_input.text(), self.icon_path

    def download_icon(self):
        import webbrowser
        webbrowser.open("https://seeklogo.com/")