import { create } from 'zustand';

type EditorState = {
    currentNoteId: string | null;
    content: string;
    setCurrentNoteId: (noteId: string | null) => void;
    setContent: (content: string) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
    currentNoteId: null,
    content: '',
    setCurrentNoteId: (currentNoteId) => set({ currentNoteId }),
    setContent: (content) => set({ content }),
}));
