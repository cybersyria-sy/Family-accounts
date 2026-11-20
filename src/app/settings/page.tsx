"use client";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Avatar, Button, Card, Chip, Input } from "@/components/ui";
import { EntryList } from "@/components/EntryList";
import { useData } from "@/lib/data";
import { useUndo, check } from "@/lib/undo";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  return <Shell><SettingsBody /></Shell>;
}

function SettingsBody() {
  const { t, lang, setLang } = useI18n();
  const { family, families, people, me, entries, refresh, selectFamily, myViewers } = useData();
  const offerUndo = useUndo();
  const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const [showAll, setShowAll] = useState(false);
  if (!family || !me) return null;

  const link = typeof window !== "undefined" ? `${window.location.origin}/join/${family.invite_code}` : "";

  const addPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const { data, error } = await supabase.from("people").insert({ family_id: family.id, name: newName.trim() }).select("id").single();
    if (error) return setErr(error.message);
    setNewName("");
    await refresh();
    offerUndo("personAdded", async () => check(await supabase.from("people").delete().eq("id", data.id)));
  };

  const removePerson = async (id: string) => {
    const p = people.find((x) => x.id === id);
    if (!p || p.user_id || entries.some((e) => e.from_person === id || e.to_person === id)) return setErr(t("cantRemove"));
    const { error } = await supabase.from("people").delete().eq("id", id);
    await refresh();
    if (!error) offerUndo("personRemoved", async () => check(await supabase.from("people").insert({ id: p.id, family_id: p.family_id, name: p.name })));
  };

  const setSharing = async (viewer: string, on: boolean) => {
    setErr("");
    const add = () => supabase.from("shares").insert({ family_id: family.id, viewer_user: viewer });
    const del = () => supabase.from("shares").delete().eq("family_id", family.id).eq("owner_user", me.user_id!).eq("viewer_user", viewer);
    const { error } = await (on ? add() : del());
    if (error) return setErr(error.message);
    await refresh();
    offerUndo(on ? "sharingOn" : "sharingOff", async () => check(await (on ? del() : add())));
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const share = async () => {
    try { await navigator.share({ title: family.name, url: link }); } catch { copy(); }
  };
  const newCode = async () => {
    const oldCode = family.invite_code;
    const { error } = await supabase.rpc("reset_invite_code", { p_family: family.id });
    await refresh();
    if (!error) offerUndo("newLinkMade", async () => check(await supabase.from("families").update({ invite_code: oldCode }).eq("id", family.id)));
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-lg font-bold">{t("people")}</h2>
        <ul className="divide-y divide-stone-100">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2">
              <Avatar name={p.name} />
              <div className="flex-1">
                <p className="font-semibold">{p.name}{p.id === me.id && ` (${t("you")})`}</p>
                <p className="text-sm text-stone-500">{p.user_id ? t("hasAccount") : t("noAccount")}</p>
              </div>
              {!p.user_id && <button onClick={() => removePerson(p.id)} className="text-sm text-red-700">{t("removePerson")}</button>}
            </li>
          ))}
        </ul>
        <form onSubmit={addPerson} className="flex items-end gap-2">
          <div className="flex-1"><Input label={t("name")} required value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
          <Button>{t("addPerson")}</Button>
        </form>
        {err && <p className="text-red-700">{err}</p>}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">👁 {t("shareMine")}</h2>
        <p className="text-stone-600">{t("shareHelp")}</p>
        {people.filter((p) => p.user_id && p.id !== me.id).length === 0 ? (
          <p className="text-sm text-stone-500">{t("shareNobody")}</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {people.filter((p) => p.user_id && p.id !== me.id).map((p) => {
              const on = myViewers.includes(p.user_id!);
              return (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <Avatar name={p.name} />
                  <div className="flex-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className={`text-sm ${on ? "text-emerald-700" : "text-stone-500"}`}>{on ? t("canSeeAll") : t("cannotSee")}</p>
                  </div>
                  <Button variant={on ? "ghost" : "primary"} onClick={() => setSharing(p.user_id!, !on)}>{on ? t("stopSharing") : t("shareWith")}</Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">{t("inviteLink")}</h2>
        <p className="text-stone-600">{t("inviteHelp")}</p>
        <p className="break-all rounded-lg bg-stone-100 p-2 text-sm" dir="ltr">{link}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={share}>{t("share_")}</Button>
          <Button variant="ghost" onClick={copy}>{copied ? t("copied") : t("copy")}</Button>
          <Button variant="ghost" onClick={newCode}>{t("newCode")}</Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">{t("language")}</h2>
        <div className="flex gap-2">
          <Chip active={lang === "ar"} onClick={() => setLang("ar")}>العربية</Chip>
          <Chip active={lang === "en"} onClick={() => setLang("en")}>English</Chip>
        </div>
      </Card>

      {families.length > 1 && (
        <Card className="space-y-3">
          <h2 className="text-lg font-bold">{t("switchFamily")}</h2>
          <div className="flex flex-wrap gap-2">
            {families.map((f) => <Chip key={f.id} active={f.id === family.id} onClick={() => selectFamily(f.id)}>{f.name}</Chip>)}
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <button className="flex w-full items-center justify-between text-lg font-bold" onClick={() => setShowAll(!showAll)}>
          {t("allEntries")} <span>{showAll ? "−" : "+"}</span>
        </button>
        {showAll && <EntryList list={entries} />}
      </Card>

      <Button variant="danger" className="w-full" onClick={() => supabase.auth.signOut()}>{t("signOut")}</Button>
    </div>
  );
}
