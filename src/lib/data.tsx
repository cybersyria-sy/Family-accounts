"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, Family, Person, Entry } from "./supabase";

type Data = {
  session: Session | null;
  ready: boolean;
  families: Family[];
  family: Family | null;
  people: Person[];
  me: Person | null;
  entries: Entry[];
  /** user ids I share my transactions with */
  myViewers: string[];
  /** of those, who may also edit */
  myEditors: string[];
  /** user ids who share their transactions with me */
  sharedWithMe: string[];
  /** Can I change this entry (I'm in it or I recorded it)? Shared ones are read-only. */
  canEdit: (e: Entry) => boolean;
  selectFamily: (id: string) => void;
  refresh: () => Promise<void>;
};

const DataCtx = createContext<Data | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [families, setFamilies] = useState<Family[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [shares, setShares] = useState<{ owner_user: string; viewer_user: string; can_edit: boolean }[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const refresh = useCallback(async () => {
    if (!userId) { setLoaded(true); return; }
    const { data: fams } = await supabase.from("families").select("id,name,invite_code").order("created_at");
    const list = (fams ?? []) as Family[];
    setFamilies(list);
    let fid = familyId;
    if (!fid || !list.some((f) => f.id === fid)) {
      let saved: string | null = null;
      try { saved = localStorage.getItem("family"); } catch {}
      fid = list.find((f) => f.id === saved)?.id ?? list[0]?.id ?? null;
      setFamilyId(fid);
    }
    if (fid) {
      const [{ data: ppl }, { data: ents }, { data: shr }] = await Promise.all([
        supabase.from("people").select("id,family_id,name,user_id").eq("family_id", fid).order("created_at"),
        supabase.from("entries").select("*").eq("family_id", fid).order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("shares").select("owner_user,viewer_user,can_edit").eq("family_id", fid),
      ]);
      setShares((shr ?? []) as { owner_user: string; viewer_user: string; can_edit: boolean }[]);
      setPeople((ppl ?? []) as Person[]);
      setEntries((ents ?? []) as Entry[]);
    } else {
      setPeople([]);
      setEntries([]);
      setShares([]);
    }
    setLoaded(true);
  }, [userId, familyId]);

  useEffect(() => { if (authReady) refresh(); }, [authReady, refresh]);

  const selectFamily = (id: string) => {
    try { localStorage.setItem("family", id); } catch {}
    setFamilyId(id);
  };

  const family = families.find((f) => f.id === familyId) ?? null;
  const me = people.find((p) => p.user_id === userId) ?? null;
  const myViewers = shares.filter((s) => s.owner_user === userId).map((s) => s.viewer_user);
  const sharedWithMe = shares.filter((s) => s.viewer_user === userId).map((s) => s.owner_user);
  const editableOwners = shares.filter((s) => s.viewer_user === userId && s.can_edit).map((s) => s.owner_user);
  const myEditors = shares.filter((s) => s.owner_user === userId && s.can_edit).map((s) => s.viewer_user);
  const userOf = (pid: string) => people.find((p) => p.id === pid)?.user_id ?? null;
  const canEdit = (e: Entry) =>
    e.created_by === userId || (!!me && (e.from_person === me.id || e.to_person === me.id)) ||
    [e.created_by, userOf(e.from_person), userOf(e.to_person)].some((u) => !!u && editableOwners.includes(u));

  return (
    <DataCtx.Provider value={{ session, ready: authReady && loaded, families, family, people, me, entries, myViewers, myEditors, sharedWithMe, canEdit, selectFamily, refresh }}>
      {children}
    </DataCtx.Provider>
  );
}

export const useData = () => {
  const d = useContext(DataCtx);
  if (!d) throw new Error("DataProvider missing");
  return d;
};
