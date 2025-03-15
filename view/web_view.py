import os
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebEngineCore import QWebEngineProfile, QWebEnginePage

class WebView(QWebEngineView):
    def __init__(self, url):
        super().__init__()

        # Set up the web view with the custom profile
        self.setPage(QWebEnginePage(self.profile, self))
        self.setUrl(url)