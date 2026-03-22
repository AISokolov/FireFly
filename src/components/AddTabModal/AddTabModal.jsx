import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import "./AddTabModal.css";

const DEFAULT_ICONS = [
    "/public/assets/default-icons/discord.png",
    "/public/assets/default-icons/telegramicon.ico",
    "/public/assets/default-icons/gmailicon.png",
    "/public/assets/default-icons/chatgptIcon.png",
    "/public/assets/default-icons/yandexIcon.png",
    "/public/assets/default-icons/gmailIcon.png",
];

function AddTabModal({ isOpen, onClose, onCreateTab }) {
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [icon, setIcon] = useState(DEFAULT_ICONS[0]);

    if (!isOpen) return null;

    const handlePickCustomIcon = async () => {
        const selected = await open({
            multiple: false,
            directory: false,
            filters: [
                {
                    name: "Images",
                    extensions: ["png", "jpg", "jpeg", "webp", "svg", "ico"],
                },
            ],
        });

        if (typeof selected === "string") {
            setIcon(selected);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const trimmedTitle = title.trim();
        const trimmedUrl = url.trim();

        if (!trimmedUrl) return;

        onCreateTab({
            title: trimmedTitle || "New Tab",
            url: trimmedUrl,
            icon,
        });

        setTitle("");
        setUrl("");
        setIcon(DEFAULT_ICONS[0]);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="add-tab-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Add tab</h2>

                <form onSubmit={handleSubmit} className="add-tab-form">
                    <label className="modal-label">
                        Title
                        <input
                            className="modal-input"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="YouTube"
                        />
                    </label>

                    <label className="modal-label">
                        URL
                        <input
                            className="modal-input"
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://youtube.com"
                        />
                    </label>

                    <div className="modal-label">
                        Default icon
                        <div className="icon-picker">
                            {DEFAULT_ICONS.map((iconPath) => (
                                <button
                                    key={iconPath}
                                    type="button"
                                    className={`icon-option ${icon === iconPath ? "selected" : ""}`}
                                    onClick={() => setIcon(iconPath)}
                                >
                                    <img src={iconPath} alt="Tab icon" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="modal-label">
                        Custom icon
                        <button
                            type="button"
                            className="modal-btn secondary"
                            onClick={handlePickCustomIcon}
                        >
                            Add icon
                        </button>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="modal-btn secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="modal-btn primary">
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddTabModal;