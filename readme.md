
# FireFlyApp

This is a simple PySide6 application that allows you to manage multiple web views with a custom UI.

## Features

- Add and remove web views
- Customizable view icons
- Frameless window with rounded corners
- Opacity and "always on top" toggle

## Requirements

- Python 3.6+
- PySide6
- PyInstaller

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/AISokolov/ChatGPTApp.git
    cd ChatGPTApp
    ```

2. Install the required packages:
    ```sh
    pip install -r requirements.txt
    ```

## Usage

Run the application:
```sh
python main.py
```

## Packaging

To package the application into a single executable file using PyInstaller, run the following command:
```sh
pyinstaller --onefile --windowed --icon=icons/appIcon.ico --add-data "styles/style.qss;styles" --add-data "icons/appIcon.ico;icons" main.py
```

This will create a single executable file in the `dist` directory.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.