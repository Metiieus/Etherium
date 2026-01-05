import { create } from 'zustand';
import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface GameState {
    // UI State
    activeTool: string | null;
    setActiveTool: (tool: string | null) => void;
    inspectorView: 'combat' | 'sheet';
    setInspectorView: (view: 'combat' | 'sheet') => void;

    // Data State
    campaign: any | null;
    setCampaign: (campaign: any) => void;
    characters: any[];
    setCharacters: (chars: any[]) => void;

    // Actions
    updateCampaignData: (id: string, data: any) => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
    activeTool: null,
    setActiveTool: (tool: string | null) => set({ activeTool: tool }),
    inspectorView: 'combat',
    setInspectorView: (view: 'combat' | 'sheet') => set({ inspectorView: view }),

    campaign: null,
    setCampaign: (campaign: any) => set({ campaign }),
    characters: [],
    setCharacters: (characters: any[]) => set({ characters }),

    updateCampaignData: async (id: string, data: any) => {
        try {
            if (!id) return;
            await updateDoc(doc(db, "campaigns", id), data);
        } catch (error) {
            console.error("Error updating campaign:", error);
        }
    }
}));
