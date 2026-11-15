import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import "./AddTabModal.css";

const DEFAULT_ICONS = [
    "/assets/default-icons/Discord.png",
    "/assets/default-icons/telegramIcon.ico",
    "/assets/default-icons/whatsappIcon.png",
    "/assets/default-icons/chatgptIcon.png",
    "/assets/default-icons/yandexIcon.png",
    "/assets/default-icons/gmailIcon.png",
];

function AddTabModal({ isOpen, onClose, onSubmit, mode = "create", initialTab = null }) {
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [icon, setIcon] = useState(DEFAULT_ICONS[0]);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        setTitle(initialTab?.title ?? "");
        setUrl(initialTab?.url ?? "");
        setIcon(initialTab?.icon ?? DEFAULT_ICONS[0]);
        setError("");
    }, [isOpen, initialTab]);

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

        const saved = onSubmit({
            title: trimmedTitle || "New Tab",
            url: trimmedUrl,
            icon,
        });

        if (!saved) {
            setError("Enter a valid HTTP or HTTPS website address.");
            return;
        }
        setError("");

    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="add-tab-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">{mode === "edit" ? "Edit tab" : "Add tab"}</h2>

                <form onSubmit={handleSubmit} className="add-tab-form">
                    {error && <p role="alert">{error}</p>}
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
                            {mode === "edit" ? "Save" : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddTabModal;
