from PySide6.QtCore import QPoint, Qt
from PySide6.QtWidgets import QVBoxLayout, QPushButton, QDialog, QSlider, QLabel


class SettingsDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Settings")
        self.setGeometry(250, 150, 200, 70)
        self.setWindowFlags(Qt.FramelessWindowHint)

        # Create a central widget and set the layout
        layout = QVBoxLayout(self)
        # Close button
        self.close_button = QPushButton("x", self)
        self.close_button.setObjectName("closeButton")
        self.close_button.setFixedSize(30, 30)
        self.close_button.clicked.connect(self.close)
        layout.addWidget(self.close_button, alignment=Qt.AlignRight)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(10)

        # Opacity slider
        self.opacity_slider = QSlider(Qt.Horizontal, self)
        self.opacity_slider.setRange(10, 100)  # Opacity range from 30% to 100%
        self.opacity_slider.setValue(100)  # Default value
        self.opacity_slider.valueChanged.connect(self.change_opacity)
        layout.addWidget(self.opacity_slider)

    def change_opacity(self, value):
        self.parent().setWindowOpacity(value / 100.0)