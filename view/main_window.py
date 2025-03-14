import os
import json
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import (
    QMainWindow, QPushButton, QVBoxLayout, QWidget, QHBoxLayout, QStackedWidget, QMenu
)
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebEngineCore import QWebEngineProfile, QWebEnginePage
from PySide6.QtCore import Qt, QPoint

from view.add_view_dialog import AddViewDialog


class ChatGPTApp(QMainWindow):
    def __init__(self, storage_path, cache_path):
        super().__init__()

        # Set up the main window
        self.setWindowTitle("Firefly")
        screen_geometry = self.screen().availableGeometry()
        dialog_geometry = self.geometry()
        x = (screen_geometry.width() - dialog_geometry.width()) // 2
        y = (screen_geometry.height() - dialog_geometry.height()) // 2
        self.setGeometry(x, y, 800, 600)
        self.setWindowIcon(QIcon("icons/appIcon.png"))

        # Store the storage path for saving view data
        self.storage_path = storage_path
        self.views_file = os.path.join(storage_path, "views.json")

        # Create a central widget and layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # Create a horizontal layout for the entire window
        main_layout = QHBoxLayout(central_widget)

        # Create a vertical layout for the buttons
        self.button_layout = QVBoxLayout()

        # Add the '+' button to the left side
        self.button_add = QPushButton("+", self)
        self.button_add.clicked.connect(self.open_add_view_dialog)
        self.button_add.setFixedSize(40, 40)
        self.button_layout.addWidget(self.button_add)

        # Add stretch to push buttons to the top-left corner
        self.button_layout.addStretch()

        # Add the button layout to the main layout
        main_layout.addLayout(self.button_layout)

        # Create a stacked widget to manage multiple views
        self.stacked_widget = QStackedWidget()
        main_layout.addWidget(self.stacked_widget)

        # Create a custom profile with persistent storage and cache
        self.profile = QWebEngineProfile("MyProfile", self)
        self.profile.setPersistentStoragePath(storage_path)
        self.profile.setCachePath(cache_path)
        self.profile.setHttpCacheType(QWebEngineProfile.DiskHttpCache)

        self.profile.setHttpUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )

        # Add a button in the lower-left corner to toggle opacity and "always on top"
        self.button_opacity = QPushButton("⛶", self)
        self.button_opacity.clicked.connect(self.toggle_opacity_and_always_on_top)
        self.button_opacity.setFixedSize(40, 40)  # Set a fixed size for the button

        # Position the button in the lower-left corner with a margin
        self.update_button_position()

        # Track the current state of opacity and "always on top"
        self.is_transparent = False
        self.is_always_on_top = False

        # Load saved views from the cache
        self.load_views()

    def create_web_view(self, url):
        """Create a QWebEngineView with the given URL."""
        web_view = QWebEngineView()
        web_view.setPage(QWebEnginePage(self.profile, web_view))
        web_view.setUrl(url)
        return web_view

    def open_add_view_dialog(self):
        dialog = AddViewDialog(self)
        if dialog.exec():
            name, url, icon_path = dialog.get_data()
            if name and url:
                self.add_new_view(name, url, icon_path)

    def add_new_view(self, name, url, icon_path):
        new_view = self.create_web_view(url)
        self.stacked_widget.addWidget(new_view)
        new_button = QPushButton(self)

        if icon_path:
            new_button.setIcon(QIcon(icon_path))
            new_button.setProperty("icon_path", icon_path)  # Store the icon path

        else:
            new_button.setText(name)  # Set the button text to the view name

        new_button.setFixedSize(40, 40)
        new_button.clicked.connect(lambda: self.stacked_widget.setCurrentWidget(new_view))

        # Right-click menu for deleting views
        new_button.setContextMenuPolicy(Qt.CustomContextMenu)
        new_button.customContextMenuRequested.connect(
            lambda pos, button=new_button, view=new_view: self.show_context_menu(pos, button, view)
        )

        self.button_layout.insertWidget(self.button_layout.count() - 1, new_button)
        self.stacked_widget.setCurrentWidget(new_view)

        # Save the views to the cache
        self.save_views()

    def show_context_menu(self, pos, button, view):
        """Show a context menu to delete the view."""
        context_menu = QMenu(self)
        delete_action = context_menu.addAction("Delete")
        delete_action.triggered.connect(lambda: self.delete_view(button, view))
        context_menu.exec_(button.mapToGlobal(pos))

    def delete_view(self, button, view):
        """Delete a view and its corresponding button."""
        # Remove the view from the stacked widget
        self.stacked_widget.removeWidget(view)
        view.deleteLater()

        # Remove the button from the button layout
        self.button_layout.removeWidget(button)
        button.deleteLater()

        # Save the updated views to the cache
        self.save_views()

    def toggle_opacity_and_always_on_top(self):
        """Toggle window opacity and 'always on top' state."""
        if self.is_transparent:
            # Restore full opacity
            self.setWindowOpacity(1.0)
            self.is_transparent = False
        else:
            # Set reduced opacity
            self.setWindowOpacity(0.7)
            self.is_transparent = True

        if self.is_always_on_top:
            # Disable "always on top"
            self.setWindowFlag(Qt.WindowStaysOnTopHint, False)
            self.is_always_on_top = False
        else:
            # Enable "always on top"
            self.setWindowFlag(Qt.WindowStaysOnTopHint, True)
            self.is_always_on_top = True

        # Show the window again to apply the changes
        self.show()

    def update_button_position(self):
        """Update the position of the opacity button to keep it in the lower-left corner."""
        margin = 10  # Margin from the edges
        button_width = self.button_opacity.width()
        button_height = self.button_opacity.height()
        x = margin  # X position (left)
        y = self.height() - button_height - margin  # Y position (bottom)
        self.button_opacity.move(x, y)

    def resizeEvent(self, event):
        """Override resizeEvent to keep the opacity button in the lower-left corner."""
        super().resizeEvent(event)
        self.update_button_position()

    def save_views(self):
        """Save the current views to a JSON file."""
        views = []
        for i in range(self.stacked_widget.count()):
            view = self.stacked_widget.widget(i)
            button = self.button_layout.itemAt(i + 1).widget()  # +1 to skip the '+' button

            # Get the icon path correctly
            icon = button.icon()
            icon_path = ""
            if not icon.isNull():  # Ensure the button has an icon
                icon_path = button.property("icon_path")  # Retrieve the stored icon path

            views.append({
                "name": button.text() if button.text() else "",
                "url": view.url().toString(),
                "icon_path": icon_path
            })

        with open(self.views_file, "w") as f:
            json.dump(views, f)

    def load_views(self):
        """Load saved views from the JSON file."""
        if os.path.exists(self.views_file):
            with open(self.views_file, "r") as f:
                views = json.load(f)
                for view_data in views:
                    self.add_new_view(view_data["name"], view_data["url"], view_data["icon_path"])

    def closeEvent(self, event):
        """Override closeEvent to save views before closing."""
        self.save_views()
        super().closeEvent(event)