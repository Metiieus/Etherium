import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    onSnapshot,
    addDoc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    where,
    getDocs
} from 'firebase/firestore';

const SERVERS = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

export function useWebRTC(campaignId: string | undefined, userId: string | undefined, isMaster: boolean) {
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const pc = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    // Initialize PeerConnection
    const setupPeerConnection = () => {
        pc.current = new RTCPeerConnection(SERVERS);

        pc.current.ontrack = (event) => {
            console.log("Track received:", event.streams[0]);
            event.streams[0].getTracks().forEach(track => {
                setRemoteStream((prev) => {
                    if (!prev) return new MediaStream([track]);
                    if (prev.getTracks().find(t => t.id === track.id)) return prev;
                    return new MediaStream([...prev.getTracks(), track]);
                });
            });
        };

        if (localStreamRef.current && isMaster) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.current?.addTrack(track, localStreamRef.current!);
            });
        }

        return pc.current;
    };

    // Master: Start Call (Create Offer)
    const startCall = async () => {
        if (!campaignId || !pc.current) return;

        const callDocRef = doc(collection(db, `campaigns/${campaignId}/signaling`), 'broadcast');
        const offerCandidates = collection(callDocRef, 'offerCandidates');
        const answerCandidates = collection(callDocRef, 'answerCandidates');

        // Clean up previous call data if exists (simple reset for single broadcast)
        await setDoc(callDocRef, {});

        pc.current.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(offerCandidates, event.candidate.toJSON());
            }
        };

        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
            timestamp: serverTimestamp()
        };

        await setDoc(callDocRef, { offer });

        // Listen for remote answer
        onSnapshot(callDocRef, (snapshot) => {
            const data = snapshot.data();
            if (!pc.current?.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                pc.current.setRemoteDescription(answerDescription);
            }
        });

        // Listen for remote ICE candidates
        onSnapshot(answerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.current?.addIceCandidate(candidate);
                }
            });
        });
    };

    // Player: Join Call (Create Answer)
    const joinCall = async () => {
        if (!campaignId || !pc.current) return;

        const callDocRef = doc(collection(db, `campaigns/${campaignId}/signaling`), 'broadcast');
        const offerCandidates = collection(callDocRef, 'offerCandidates');
        const answerCandidates = collection(callDocRef, 'answerCandidates');

        pc.current.onicecandidate = (event) => {
            if (event.candidate && pc.current) {
                addDoc(answerCandidates, event.candidate.toJSON());
            }
        };

        const callSnapshot = await getDoc(callDocRef);
        const callData = callSnapshot.data();

        if (callData?.offer) {
            await pc.current.setRemoteDescription(new RTCSessionDescription(callData.offer));

            const answerDescription = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answerDescription);

            const answer = {
                type: answerDescription.type,
                sdp: answerDescription.sdp,
                timestamp: serverTimestamp()
            };

            await updateDoc(callDocRef, { answer });

            // Listen for local ICE candidates (from Caller)
            onSnapshot(offerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.current?.addIceCandidate(candidate);
                    }
                });
            });
        }
    };

    // Effect to manage connection lifecycle
    useEffect(() => {
        if (!campaignId || !userId) return;

        // Reset stream state
        setRemoteStream(null);
        setupPeerConnection();

        // Give a small delay for local stream to be ready if master
        const timer = setTimeout(() => {
            if (isMaster) {
                startCall();
            } else {
                // Player waits for offer
                const callDocRef = doc(collection(db, `campaigns/${campaignId}/signaling`), 'broadcast');
                const unsub = onSnapshot(callDocRef, (snap) => {
                    if (snap.data()?.offer && !pc.current?.remoteDescription) {
                        joinCall();
                    }
                });
                return () => unsub();
            }
        }, 1000);

        return () => {
            clearTimeout(timer);
            pc.current?.close();
            pc.current = null;
        };
    }, [campaignId, userId, isMaster]);

    // Function to set local stream (Master only)
    const setLocalStream = (stream: MediaStream) => {
        localStreamRef.current = stream;
        // Add tracks if connection exists
        if (pc.current && isMaster) {
            stream.getTracks().forEach((track) => {
                const sender = pc.current?.getSenders().find(s => s.track?.kind === track.kind);
                if (sender) {
                    sender.replaceTrack(track);
                } else {
                    pc.current?.addTrack(track, stream);
                }
            });
        }
    };

    return { remoteStream, setLocalStream };
}
