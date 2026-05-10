import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Trash2, Lock, Unlock, MessageCircleHeart, ScrollText, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props { songId: string }

interface VoiceNote { id: string; user_id: string; file_path: string; created_at: string }
interface Letter { id: string; author_id: string; title: string | null; body: string; unlocked: boolean; created_at: string }

const PUBLIC = (path: string) => supabase.storage.from("voice-notes").getPublicUrl(path).data.publicUrl;

const VoiceNotePlayer = ({ path }: { path: string }) => {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    let active = true;
    (async () => {
      // signed URL is more reliable across browsers (correct content-type headers)
      const { data } = await supabase.storage.from("voice-notes").createSignedUrl(path, 60 * 60);
      if (active) setSrc(data?.signedUrl ?? PUBLIC(path));
    })();
    return () => { active = false; };
  }, [path]);
  return <audio src={src} controls preload="metadata" className="flex-1 h-8" onError={() => toast.error("Couldn't load voice note")} />;
};

export const SongExtras = ({ songId }: Props) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [recording, setRecording] = useState(false);
  const [showLetterForm, setShowLetterForm] = useState(false);
  const [lTitle, setLTitle] = useState("");
  const [lBody, setLBody] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const load = async () => {
    const [{ data: vn }, { data: lt }] = await Promise.all([
      supabase.from("song_voice_notes").select("*").eq("song_id", songId).order("created_at", { ascending: false }),
      supabase.from("song_letters").select("*").eq("song_id", songId).order("created_at", { ascending: false }),
    ]);
    setNotes((vn as any) ?? []);
    const list = (lt as any[]) ?? [];
    // Auto-unlock other-author letters when played
    const toUnlock = list.filter((l) => !l.unlocked && l.author_id !== user?.id);
    if (toUnlock.length) {
      await supabase.from("song_letters").update({ unlocked: true, unlocked_at: new Date().toISOString() }).in("id", toUnlock.map((l) => l.id));
    }
    const { data: lt2 } = await supabase.from("song_letters").select("*").eq("song_id", songId).order("created_at", { ascending: false });
    setLetters((lt2 as any) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [songId]);

  const pickMime = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    for (const t of candidates) {
      // @ts-ignore
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) return t;
    }
    return "";
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const actualType = mr.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualType });
        stream.getTracks().forEach((t) => t.stop());
        if (!user) return;
        const ext = actualType.includes("mp4") ? "m4a" : actualType.includes("ogg") ? "ogg" : "webm";
        const path = `${user.id}/${songId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("voice-notes").upload(path, blob, { contentType: actualType, upsert: false });
        if (error) { toast.error(error.message); return; }
        await supabase.from("song_voice_notes").insert({ song_id: songId, user_id: user.id, file_path: path });
        toast.success("Voice note saved");
        load();
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
      // auto-stop at 15s
      setTimeout(() => { if (mr.state === "recording") mr.stop(); setRecording(false); }, 15000);
    } catch (e: any) {
      toast.error("Mic access denied");
    }
  };
  const stopRec = () => { recRef.current?.stop(); setRecording(false); };

  const deleteNote = async (n: VoiceNote) => {
    await supabase.storage.from("voice-notes").remove([n.file_path]);
    await supabase.from("song_voice_notes").delete().eq("id", n.id);
    load();
  };

  const saveLetter = async () => {
    if (!user || !lBody.trim()) return;
    const { error } = await supabase.from("song_letters").insert({ song_id: songId, author_id: user.id, title: lTitle || null, body: lBody });
    if (error) { toast.error(error.message); return; }
    setLTitle(""); setLBody(""); setShowLetterForm(false);
    toast.success("Letter sealed 💌");
    load();
  };

  const deleteLetter = async (id: string) => {
    await supabase.from("song_letters").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6 mt-8">
      {/* Voice notes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <MessageCircleHeart className="h-3.5 w-3.5 text-primary" /> Voice notes
          </div>
          {!recording ? (
            <Button size="sm" variant="ghost" onClick={startRec}><Mic className="h-3.5 w-3.5 mr-1" /> Record</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={stopRec} className="text-primary"><Square className="h-3.5 w-3.5 mr-1 fill-current" /> Stop</Button>
          )}
        </div>
        {notes.length === 0 && <p className="text-xs text-muted-foreground italic">No voice notes yet — leave one for them.</p>}
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="flex items-center gap-2 bg-popover/40 rounded-sm p-2 border border-border">
              <VoiceNotePlayer path={n.file_path} />
              {n.user_id === user?.id && (
                <button onClick={() => deleteNote(n)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Letters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <ScrollText className="h-3.5 w-3.5 text-primary" /> Letters
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowLetterForm((v) => !v)}><Plus className="h-3.5 w-3.5 mr-1" /> Write</Button>
        </div>
        {showLetterForm && (
          <div className="space-y-2 mb-4 p-3 rounded-sm border border-primary/30 bg-primary/5">
            <Input placeholder="Title (optional)" value={lTitle} onChange={(e) => setLTitle(e.target.value)} maxLength={120} />
            <Textarea placeholder="A long letter, sealed until they play this song…" value={lBody} onChange={(e) => setLBody(e.target.value)} rows={5} maxLength={4000} />
            <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setShowLetterForm(false)}>Cancel</Button><Button size="sm" onClick={saveLetter} disabled={!lBody.trim()}>Seal</Button></div>
          </div>
        )}
        {letters.length === 0 && !showLetterForm && <p className="text-xs text-muted-foreground italic">No letters tied to this song yet.</p>}
        <div className="space-y-3">
          {letters.map((l) => {
            const mine = l.author_id === user?.id;
            const visible = l.unlocked || mine;
            return (
              <div key={l.id} className="rounded-sm border border-border p-3 bg-popover/30">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {visible ? <Unlock className="h-3 w-3 text-primary" /> : <Lock className="h-3 w-3" />}
                    {mine ? "You wrote" : visible ? "Unlocked" : "Sealed"}
                  </div>
                  {mine && <button onClick={() => deleteLetter(l.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>}
                </div>
                {l.title && <div className="text-sm font-medium mb-1">{l.title}</div>}
                {visible ? (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{l.body}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">A letter waits here. Keep listening — it unlocks when you play this song.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
