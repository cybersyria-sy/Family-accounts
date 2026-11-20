"use client";
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({ variant = "primary", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v = {
    primary: "bg-emerald-700 text-white active:bg-emerald-800 disabled:opacity-50",
    ghost: "bg-white text-stone-800 border border-stone-300 active:bg-stone-100",
    danger: "bg-white text-red-700 border border-red-300 active:bg-red-50",
  }[variant];
  return <button {...p} className={`rounded-xl px-4 py-3 text-base font-semibold ${v} ${className}`} />;
}

export function Input({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-stone-600">{label}</span>}
      <input {...p} className={`w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 ${p.className ?? ""}`} />
    </label>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 ${className}`}>{children}</div>;
}

export function Chip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full px-4 py-2 text-base font-medium ring-1 ${active ? "bg-emerald-700 text-white ring-emerald-700" : "bg-white text-stone-700 ring-stone-300"}`}>
      {children}
    </button>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
