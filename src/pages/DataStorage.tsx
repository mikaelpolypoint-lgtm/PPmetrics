import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import PageHeader from '../components/PageHeader';
import {
    Folder, FileText, Upload, Download,
    Trash2, Edit2, CornerUpLeft, FolderPlus
} from 'lucide-react';
import { format } from 'date-fns';

interface StorageItem {
    id: string;
    type: 'file' | 'folder';
    name: string;
    parentId: string | null;
    size?: number;
    contentType?: string;
    downloadUrl?: string; // Legacy
    fileData?: string;    // Base64 content
    storagePath?: string; // Legacy
    createdAt: string;
}

const DataStorage: React.FC = () => {
    const [currentFolder, setCurrentFolder] = useState<StorageItem | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<StorageItem[]>([]);
    const [items, setItems] = useState<StorageItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal States could be added here (Rename, Create Folder, etc.)
    // For simplicity, using simple prompts for v1

    // Fetch Items
    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const parentId = currentFolder ? currentFolder.id : null;
            const q = query(
                collection(db, 'storage_items'),
                where('parentId', '==', parentId),
                orderBy('type', 'desc'), // Folders first (z-a if desc? 'folder' > 'file' string-wise? 'folder' starts with f, 'file' starts with f. 'folder' > 'file' -> o > i. Yes.)
                orderBy('name', 'asc')
            );

            // Note: Compound queries might require an index. 
            // If it fails, we fall back to client sorting.

            const snapshot = await getDocs(q);
            const loaded: StorageItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageItem));

            // Manual sort if index is missing
            loaded.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });

            setItems(loaded);
        } catch (error) {
            console.error("Error fetching items:", error);
            // Fallback for missing index error
            try {
                const simpleQ = query(
                    collection(db, 'storage_items'),
                    where('parentId', '==', currentFolder ? currentFolder.id : null)
                );
                const snapshot = await getDocs(simpleQ);
                const loaded: StorageItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StorageItem));
                loaded.sort((a, b) => {
                    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                    return a.name.localeCompare(b.name);
                });
                setItems(loaded);
            } catch (retryErr) {
                console.error("Retry failed:", retryErr);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [currentFolder]);

    const handleCreateFolder = async () => {
        const name = prompt("Enter folder name:");
        if (!name) return;

        try {
            await addDoc(collection(db, 'storage_items'), {
                type: 'folder',
                name,
                parentId: currentFolder ? currentFolder.id : null,
                createdAt: new Date().toISOString()
            });
            fetchItems();
        } catch (error) {
            console.error("Error creating folder:", error);
            alert("Failed to create folder");
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        // Check file size (Firestore limit is 1MB, let's limit to 900KB to be safe)
        if (file.size > 900 * 1024) {
            alert("File is too large! For direct database storage, files must be under 900KB.");
            return;
        }

        setIsUploading(true);

        try {
            // Read file as Base64/DataURL
            const reader = new FileReader();

            reader.onload = async (event) => {
                const fileData = event.target?.result as string;

                // Create DB Entry with file data embedded
                await addDoc(collection(db, 'storage_items'), {
                    type: 'file',
                    name: file.name,
                    parentId: currentFolder ? currentFolder.id : null,
                    size: file.size,
                    contentType: file.type,
                    fileData: fileData, // Storing CONTENT directly in DB
                    createdAt: new Date().toISOString()
                });

                fetchItems();
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            };

            reader.onerror = () => {
                alert("Failed to read file.");
                setIsUploading(false);
            };

            reader.readAsDataURL(file);

        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Upload failed");
            setIsUploading(false);
        }
    };

    const handleDelete = async (item: StorageItem) => {
        if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

        try {
            if (item.type === 'folder') {
                const q = query(collection(db, 'storage_items'), where('parentId', '==', item.id));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    alert("Folder is not empty. Please delete content first.");
                    return;
                }
            }

            // Just delete the doc. No storage bucket cleanup needed.
            await deleteDoc(doc(db, 'storage_items', item.id));
            setItems(prev => prev.filter(i => i.id !== item.id));
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Delete failed");
        }
    };

    const handleRename = async (item: StorageItem) => {
        const newName = prompt("Enter new name:", item.name);
        if (!newName || newName === item.name) return;

        try {
            await updateDoc(doc(db, 'storage_items', item.id), { name: newName });
            fetchItems();
        } catch (error) {
            alert("Rename failed");
        }
    };

    const handleMove = async (item: StorageItem) => {
        // Simple move: Prompt for ID or allow "Move Up"
        // For a nice UI, we'd need a modal with folder tree.
        // Quick "Move Up to Parent" implementation:
        if (!item.parentId) {
            alert("Already at root");
            return;
        }
        if (confirm(`Move "${item.name}" to parent folder?`)) {
            try {
                // We need to look up grandparent. 
                // Since we don't have the parent object loaded, we can't easily jump up unless we read it or rely on Breadcrumbs.
                // We are viewing 'currentFolder'. item is inside 'currentFolder'.
                // So item.parentId === currentFolder.id.
                // We want to move item to currentFolder.parentId.

                const newParentId = currentFolder?.parentId || null;
                await updateDoc(doc(db, 'storage_items', item.id), { parentId: newParentId });
                fetchItems();
            } catch (error) {
                alert("Move failed");
            }
        }
    };

    const navigateToFolder = (folder: StorageItem) => {
        setBreadcrumbs(prev => [...prev, folder]);
        setCurrentFolder(folder);
    };

    const navigateUp = () => {
        if (breadcrumbs.length === 0) return;
        const newBreadcrumbs = [...breadcrumbs];
        newBreadcrumbs.pop(); // Remove current
        setBreadcrumbs(newBreadcrumbs);
        setCurrentFolder(newBreadcrumbs.length > 0 ? newBreadcrumbs[newBreadcrumbs.length - 1] : null);
    };

    const navigateToBreadcrumb = (index: number) => {
        if (index === -1) {
            setBreadcrumbs([]);
            setCurrentFolder(null);
        } else {
            const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
            setBreadcrumbs(newBreadcrumbs);
            setCurrentFolder(newBreadcrumbs[newBreadcrumbs.length - 1]);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
            <div className="flex justify-between items-start">
                <PageHeader
                    title="Data Storage"
                    description="Manage exports, imports and project files."
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleCreateFolder}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <FolderPlus size={16} /> New Folder
                    </button>
                    <div className="relative">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            {isUploading ? <span className="loading loading-spinner loading-xs"></span> : <Upload size={16} />}
                            Upload File
                        </button>
                    </div>
                </div>
            </div>

            {/* Browser Interface */}
            <div className="card flex-1 flex flex-col min-h-0 bg-white border border-gray-200 shadow-sm p-0 overflow-hidden">

                {/* Toolbar / Breadcrumbs */}
                <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-gray-50/50">
                    <button
                        onClick={navigateUp}
                        disabled={!currentFolder}
                        className="p-2 hover:bg-gray-200 rounded-lg text-text-muted disabled:opacity-30"
                    >
                        <CornerUpLeft size={18} />
                    </button>

                    <div className="flex items-center gap-1 text-sm font-medium overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => navigateToBreadcrumb(-1)}
                            className={currentFolder === null ? "text-brand-primary font-bold px-2 py-1 bg-white rounded shadow-sm" : "text-text-muted hover:text-brand-primary px-2"}
                        >
                            Root
                        </button>
                        {breadcrumbs.map((folder, idx) => (
                            <React.Fragment key={folder.id}>
                                <span className="text-gray-300">/</span>
                                <button
                                    onClick={() => navigateToBreadcrumb(idx)}
                                    className={idx === breadcrumbs.length - 1
                                        ? "text-brand-primary font-bold px-2 py-1 bg-white rounded shadow-sm whitespace-nowrap"
                                        : "text-text-muted hover:text-brand-primary px-2 whitespace-nowrap"}
                                >
                                    {folder.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <span className="loading loading-spinner text-brand-primary"></span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-text-muted">
                            <FolderPlus size={48} className="mb-2 opacity-20" />
                            <p>This folder is empty</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-xs uppercase text-text-muted sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 font-semibold w-10"></th>
                                    <th className="px-4 py-3 font-semibold">Name</th>
                                    <th className="px-4 py-3 font-semibold w-32">Size</th>
                                    <th className="px-4 py-3 font-semibold w-40">Date</th>
                                    <th className="px-4 py-3 font-semibold w-20 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map(item => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                                        onClick={() => item.type === 'folder' && navigateToFolder(item)}
                                    >
                                        <td className="px-4 py-3 text-text-muted">
                                            {item.type === 'folder' ? (
                                                <Folder size={20} className="fill-brand-secondary/20 text-brand-secondary" />
                                            ) : (
                                                <FileText size={20} className="text-gray-400" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-text-main">
                                            {item.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-muted font-mono">
                                            {item.size ? (item.size / 1024).toFixed(1) + ' KB' : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-muted">
                                            {item.createdAt ? format(new Date(item.createdAt), 'dd.MM.yyyy HH:mm') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="relative flex justify-end items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                {item.type === 'file' && item.downloadUrl && (
                                                    <a
                                                        href={item.downloadUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 hover:bg-gray-200 rounded text-text-muted hover:text-brand-primary"
                                                        title="Download"
                                                    >
                                                        <Download size={16} />
                                                    </a>
                                                )}

                                                {/* Bonus: Move Up */}
                                                {item.parentId && (
                                                    <button
                                                        onClick={() => handleMove(item)}
                                                        className="p-1.5 hover:bg-gray-200 rounded text-text-muted hover:text-brand-primary"
                                                        title="Move to Parent Folder"
                                                    >
                                                        <CornerUpLeft size={16} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleRename(item)}
                                                    className="p-1.5 hover:bg-gray-200 rounded text-text-muted hover:text-brand-primary"
                                                    title="Rename"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-1.5 hover:bg-red-50 rounded text-text-muted hover:text-red-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataStorage;
