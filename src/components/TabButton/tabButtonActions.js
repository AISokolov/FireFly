export function closeTabFromButton(event, id, onClose) {
    event.stopPropagation();
    onClose(id);
}
