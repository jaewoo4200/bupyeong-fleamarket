"use client";

import { useMemo, useState } from "react";
import { X, Plus, Pencil, Trash2, Check } from "lucide-react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/data/hooks";
import { getCategory, categorize } from "@/lib/venue/categories";
import { effectiveSeats } from "@/lib/venue/seats";
import type { EventConfig, Seller } from "@/lib/data/types";

const inp =
  "h-9 w-full rounded-lg border border-cream-300 bg-white px-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus-visible:border-coral-400 focus-visible:outline-none";

type Draft = { seq: string; business: string; name: string; productText: string; phone: string; twoTables: boolean };

function CategoryChip({ categoryKey }: { categoryKey: Seller["categoryKey"] }) {
  const cat = getCategory(categoryKey);
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: cat.color }}>
      {cat.label}
    </span>
  );
}

function TwoTableToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        on
          ? "rounded-full bg-coral-100 px-2 py-1 text-xs font-semibold text-coral-700"
          : "rounded-full bg-cream-100 px-2 py-1 text-xs font-semibold text-ink-400"
      }
      title="클릭하여 2매대(붙임석) 셀러 토글"
    >
      {on ? "2매대 ●" : "1매대"}
    </button>
  );
}

export function RosterTable({ event, sellers }: { event: EventConfig; sellers: Seller[] }) {
  const [adding, setAdding] = useState(false);
  const inactive = useMemo(() => new Set(event.inactiveSeatCodes), [event.inactiveSeatCodes]);
  const taken = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sellers) if (s.assignedSeat) m.set(s.assignedSeat, s.id);
    return m;
  }, [sellers]);
  const seatOptions = useMemo(
    () => effectiveSeats(event).filter((s) => !inactive.has(s.code)).sort((a, b) => a.num - b.num),
    [event, inactive],
  );
  const nextSeq = useMemo(() => (sellers.length ? Math.max(...sellers.map((s) => s.seq)) + 1 : 1), [sellers]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900">
          참가 셀러 <span className="text-ink-400">({sellers.length}팀)</span>
        </h3>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          <Plus /> 셀러 추가
        </Button>
      </div>

      {adding && <AddSellerForm eventId={event.id} nextSeq={nextSeq} onDone={() => setAdding(false)} />}

      <div className="overflow-x-auto rounded-2xl border border-cream-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-cream-200 bg-cream-50 text-xs text-ink-500">
            <tr>
              <th className="px-3 py-2.5 font-semibold">번호</th>
              <th className="px-3 py-2.5 font-semibold">상호 / 이름</th>
              <th className="px-3 py-2.5 font-semibold">카테고리 / 취급상품</th>
              <th className="px-3 py-2.5 font-semibold">2매대</th>
              <th className="px-3 py-2.5 font-semibold">배정 자리</th>
              <th className="px-3 py-2.5 text-right font-semibold">수정</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((s) => (
              <SellerRow key={s.id} seller={s} event={event} seatOptions={seatOptions} taken={taken} />
            ))}
            {sellers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-ink-400">
                  명단이 비어 있습니다. 위에서 엑셀을 업로드하거나 “셀러 추가”를 누르세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SellerRow({
  seller,
  event,
  seatOptions,
  taken,
}: {
  seller: Seller;
  event: EventConfig;
  seatOptions: ReturnType<typeof effectiveSeats>;
  taken: Map<string, string>;
}) {
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState<Draft>(() => toDraft(seller));

  const start = () => {
    setD(toDraft(seller));
    setEditing(true);
  };
  const save = () => {
    store.updateSeller(seller.id, {
      seq: Number(d.seq) || seller.seq,
      business: d.business.trim(),
      name: d.name.trim(),
      productText: d.productText,
      phone: d.phone.trim() || undefined,
      twoTables: d.twoTables,
    });
    setEditing(false);
  };
  const del = () => {
    if (confirm(`'${seller.business || seller.name}' 셀러를 명단에서 삭제할까요?`)) store.removeSeller(seller.id);
  };

  const SeatSelect = (
    <Select
      value={seller.assignedSeat ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        if (v) store.reassignSeat(event.id, seller.id, v);
        else store.clearAssignment(event.id, seller.id);
      }}
      className="h-8 w-28 text-xs"
    >
      <option value="">미배정</option>
      {seatOptions.map((opt) => {
        const occupiedBy = taken.get(opt.code);
        const mine = occupiedBy === seller.id;
        return (
          <option key={opt.code} value={opt.code}>
            {opt.label}
            {occupiedBy && !mine ? " (교환)" : ""}
          </option>
        );
      })}
    </Select>
  );

  if (editing) {
    return (
      <tr className="border-b border-cream-100 bg-coral-50/40 last:border-0 align-top">
        <td className="px-3 py-2">
          <input
            value={d.seq}
            onChange={(e) => setD({ ...d, seq: e.target.value })}
            inputMode="numeric"
            className={inp + " w-14 tnum"}
          />
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-col gap-1">
            <input value={d.business} placeholder="상호" onChange={(e) => setD({ ...d, business: e.target.value })} className={inp} />
            <input value={d.name} placeholder="이름" onChange={(e) => setD({ ...d, name: e.target.value })} className={inp} />
            <input value={d.phone} placeholder="연락처(선택)" onChange={(e) => setD({ ...d, phone: e.target.value })} className={inp} />
          </div>
        </td>
        <td className="px-3 py-2">
          <input value={d.productText} placeholder="취급상품 (예: 향수 및 비누)" onChange={(e) => setD({ ...d, productText: e.target.value })} className={inp} />
          <div className="mt-1.5">
            <CategoryChip categoryKey={categorize(d.productText)} />
          </div>
        </td>
        <td className="px-3 py-2">
          <TwoTableToggle on={d.twoTables} onClick={() => setD({ ...d, twoTables: !d.twoTables })} />
        </td>
        <td className="px-3 py-2">{SeatSelect}</td>
        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-1">
            <button onClick={save} className="inline-flex size-8 items-center justify-center rounded-lg bg-coral-600 text-white hover:bg-coral-700" title="저장">
              <Check className="size-4" />
            </button>
            <button onClick={() => setEditing(false)} className="inline-flex size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-cream-100" title="취소">
              <X className="size-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-cream-100 last:border-0 hover:bg-cream-50">
      <td className="px-3 py-2 tnum text-ink-400">{seller.seq}</td>
      <td className="px-3 py-2">
        <div className="font-bold text-ink-900">{seller.business || "—"}</div>
        <div className="text-xs text-ink-400">{seller.name}{seller.phone ? ` · ${seller.phone}` : ""}</div>
      </td>
      <td className="px-3 py-2">
        <CategoryChip categoryKey={seller.categoryKey} />
      </td>
      <td className="px-3 py-2">
        <TwoTableToggle on={seller.twoTables} onClick={() => store.setSellerTwoTables(seller.id, !seller.twoTables)} />
      </td>
      <td className="px-3 py-2">{SeatSelect}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          <button onClick={start} className="inline-flex size-8 items-center justify-center rounded-lg text-ink-400 hover:bg-cream-100 hover:text-ink-900" title="수정">
            <Pencil className="size-4" />
          </button>
          <button onClick={del} className="inline-flex size-8 items-center justify-center rounded-lg text-ink-300 hover:bg-rose-50 hover:text-rose-500" title="삭제">
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddSellerForm({ eventId, nextSeq, onDone }: { eventId: string; nextSeq: number; onDone: () => void }) {
  const store = useStore();
  const [d, setD] = useState<Draft>({ seq: String(nextSeq), business: "", name: "", productText: "", phone: "", twoTables: false });

  const submit = () => {
    if (!d.business.trim() && !d.name.trim()) {
      alert("상호 또는 이름을 입력하세요.");
      return;
    }
    store.addSeller(eventId, {
      seq: Number(d.seq) || nextSeq,
      business: d.business.trim(),
      name: d.name.trim(),
      productText: d.productText,
      phone: d.phone.trim() || undefined,
      twoTables: d.twoTables,
    });
    onDone();
  };

  return (
    <div className="rounded-2xl border border-coral-200 bg-coral-50/40 p-4">
      <p className="mb-3 text-sm font-bold text-ink-900">새 셀러 추가</p>
      <div className="grid gap-2 sm:grid-cols-[4rem_1fr_1fr] sm:items-start">
        <input value={d.seq} onChange={(e) => setD({ ...d, seq: e.target.value })} inputMode="numeric" placeholder="번호" className={inp + " tnum"} />
        <input value={d.business} onChange={(e) => setD({ ...d, business: e.target.value })} placeholder="상호" className={inp} />
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="이름" className={inp} />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input value={d.productText} onChange={(e) => setD({ ...d, productText: e.target.value })} placeholder="취급상품 (예: 향수 및 비누)" className={inp} />
        <input value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="연락처(선택)" className={inp} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <TwoTableToggle on={d.twoTables} onClick={() => setD({ ...d, twoTables: !d.twoTables })} />
          <span>·</span>
          <CategoryChip categoryKey={categorize(d.productText)} />
          <span className="text-ink-400">자동 분류</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onDone}>
            취소
          </Button>
          <Button size="sm" onClick={submit}>
            <Plus /> 추가
          </Button>
        </div>
      </div>
    </div>
  );
}

function toDraft(s: Seller): Draft {
  return {
    seq: String(s.seq),
    business: s.business,
    name: s.name,
    productText: s.productText,
    phone: s.phone ?? "",
    twoTables: s.twoTables,
  };
}
