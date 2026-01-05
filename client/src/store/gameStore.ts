import { create } from 'zustand';
import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export interface GameState {
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
    chatMessages: any[];
    setChatMessages: (msgs: any[]) => void;
    journalEntries: any[];
    setJournalEntries: (entries: any[]) => void;

    // Actions
    updateCampaignData: (id: string, data: any) => Promise<void>;
    sendMessage: (campaignId: string, text: string, user: any, role?: string) => Promise<void>;
    addJournalEntry: (campaignId: string, text: string, author: string) => Promise<void>;
    updateCharacter: (charId: string, data: any) => Promise<void>;

    // Initiative Actions
    addToInitiative: (campaignId: string, currentList: any[], name: string, value: number, isNpc?: boolean) => Promise<void>;
    removeFromInitiative: (campaignId: string, currentList: any[], itemId: string) => Promise<void>;
    nextTurn: (campaignId: string, currentList: any[], currentIndex: number, currentRound: number) => Promise<void>;
    sortInitiative: (campaignId: string, currentList: any[]) => Promise<void>;
    resetInitiative: (campaignId: string) => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
    // UI
    activeTool: null,
    setActiveTool: (tool) => set({ activeTool: tool }),
    inspectorView: 'combat',
    setInspectorView: (view) => set({ inspectorView: view }),

    // Data
    campaign: null,
    setCampaign: (campaign) => set({ campaign }),
    characters: [],
    setCharacters: (characters) => set({ characters }),
    chatMessages: [],
    setChatMessages: (chatMessages) => set({ chatMessages }),
    journalEntries: [],
    setJournalEntries: (journalEntries) => set({ journalEntries }),

    // Actions
    updateCampaignData: async (id: string, data: any) => {
        if (!id) return;
        try {
            await updateDoc(doc(db, "campaigns", id), data);
        } catch (error) { console.error("Error updating campaign:", error); }
    },

    sendMessage: async (campaignId: string, text: string, user: any, role: string = 'player') => {
        if (!campaignId || !text.trim()) return;
        try {
            await addDoc(collection(db, "campaigns", campaignId, "chat"), {
                user: user?.name || "Jogador",
                text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                role,
                createdAt: serverTimestamp()
            });
        } catch (error) { console.error("Error sending message:", error); }
    },

    addJournalEntry: async (campaignId: string, text: string, author: string) => {
        if (!campaignId || !text.trim()) return;
        try {
            await addDoc(collection(db, "campaigns", campaignId, "journal"), {
                text,
                author,
                createdAt: serverTimestamp(),
                displayDate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        } catch (error) { console.error("Error adding journal:", error); }
    },

    updateCharacter: async (charId: string, data: any) => {
        if (!charId) return;
        try {
            await updateDoc(doc(db, "characters", charId), data);
        } catch (error) { console.error("Error updating character:", error); }
    },

    // Initiative Logic
    addToInitiative: async (campaignId: string, currentList: any[], name: string, value: number, isNpc: boolean = true) => {
        const newItem = { id: Date.now().toString(), name, value, isNpc };
        const newList = [...(currentList || []), newItem].sort((a: any, b: any) => b.value - a.value);
        await updateDoc(doc(db, "campaigns", campaignId), { initiativeList: newList });
    },

    removeFromInitiative: async (campaignId: string, currentList: any[], itemId: string) => {
        const newList = (currentList || []).filter((i: any) => i.id !== itemId);
        await updateDoc(doc(db, "campaigns", campaignId), { initiativeList: newList });
    },

    nextTurn: async (campaignId: string, currentList: any[], currentIndex: number, currentRound: number) => {
        if (!currentList || currentList.length === 0) return;
        let nextIdx = (currentIndex ?? -1) + 1;
        let round = currentRound ?? 1;

        if (nextIdx >= currentList.length) {
            nextIdx = 0;
            round += 1;
        }

        await updateDoc(doc(db, "campaigns", campaignId), {
            currentTurnIndex: nextIdx,
            round: round
        });
    },

    sortInitiative: async (campaignId: string, currentList: any[]) => {
        const sorted = [...(currentList || [])].sort((a: any, b: any) => b.value - a.value);
        await updateDoc(doc(db, "campaigns", campaignId), {
            initiativeList: sorted,
            currentTurnIndex: 0
        });
    },

    resetInitiative: async (campaignId: string) => {
        await updateDoc(doc(db, "campaigns", campaignId), {
            initiativeList: [],
            currentTurnIndex: 0,
            round: 1
        });
    }
}));
