export const FOLDER_COLORS = ["#8B5CF6", "#6366F1", "#F59E0B", "#F472B6", "#2DD4BF"];
export const emptyLayout = () => ({ rootIds: [], folders: [] });

// Repair stale references and duplicates without losing any live tab.
export function normalizeLayout(value, tabs) {
    const tabIds = new Set(tabs.map((tab) => tab.id));
    const folderIds = new Set();
    const folders = (Array.isArray(value?.folders) ? value.folders : []).filter((folder) => {
        if (!folder || typeof folder.id !== "string" || !/^[\w-]{1,128}$/.test(folder.id) || tabIds.has(folder.id) || folderIds.has(folder.id)) return false;
        folderIds.add(folder.id);
        return true;
    }).map((folder) => ({
        id: folder.id,
        name: typeof folder.name === "string" && folder.name.trim() ? folder.name.trim().slice(0, 80) : "Folder",
        color: FOLDER_COLORS.includes(folder.color) ? folder.color : FOLDER_COLORS[0],
        tabIds: Array.isArray(folder.tabIds) ? folder.tabIds : [],
    }));
    const used = new Set();
    const take = (id) => { if (!tabIds.has(id) || used.has(id)) return false; used.add(id); return true; };
    folders.forEach((folder) => { folder.tabIds = folder.tabIds.filter(take); });
    const rootIds = (Array.isArray(value?.rootIds) ? value.rootIds : []).filter((id) => {
        if (folderIds.has(id)) { folderIds.delete(id); return true; }
        return take(id);
    });
    rootIds.push(...folderIds, ...tabs.filter((tab) => !used.has(tab.id)).map((tab) => tab.id));
    return { rootIds, folders };
}

export function locateItem(layout, id) {
    const folder = layout.folders.find((item) => item.tabIds.includes(id));
    return { folderId: folder?.id ?? null, index: (folder?.tabIds ?? layout.rootIds).indexOf(id) };
}

export function moveItem(layout, id, folderId = null, beforeId = null) {
    if (id === beforeId) return layout;
    const isFolder = layout.folders.some((folder) => folder.id === id);
    if (isFolder && folderId) return layout;
    if (folderId && !layout.folders.some((folder) => folder.id === folderId)) return layout;
    if (locateItem(layout, id).index < 0) return layout;
    const next = { rootIds: layout.rootIds.filter((item) => item !== id), folders: layout.folders.map((folder) => ({ ...folder, tabIds: folder.tabIds.filter((item) => item !== id) })) };
    const destination = folderId ? next.folders.find((folder) => folder.id === folderId).tabIds : next.rootIds;
    const index = destination.indexOf(beforeId);
    destination.splice(index < 0 ? destination.length : index, 0, id);
    return next;
}
