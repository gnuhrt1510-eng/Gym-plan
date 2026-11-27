import { useState } from 'react'
import { DISHES, type Dish } from '../data/dishes'
import { SLOT_LABEL } from '../data/foods'
import { addDays, formatDate, today } from '../lib/date'
import { entryMacros, frequentDishes, suggestFillers, totalMacros, verdict } from '../lib/foodlog'
import { estimateLocal, estimateWithClaude, sumItems, type Estimate } from '../lib/estimate'
import { computeTargets, formatAmount, GOAL_LABEL, nextTemplateId, planDay, shoppingList, type Macros } from '../lib/nutrition'
import { uid, type Update } from '../lib/store'
import type { AppState, FoodEntry, MealDayState } from '../types'
import ConfirmButton from './ConfirmButton'
import Ring from './Ring'

const EMPTY_DAY: MealDayState = { overrides: {}, eaten: {} }
const POPULAR = ['com-van-phong', 'pho-bo', 'banh-mi-thit', 'com-tam', 'uc-ga', 'trung', 'com-trang', 'sua-tuoi', 'whey', 'chuoi'].map(
  (id) => DISHES.find((d) => d.id === id)!,
)

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN')
const clock = (t: number) => {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function MacroBar({ label, value, target, unit, className }: { label: string; value: number; target: number; unit: string; className: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0
  return (
    <div className="macro">
      <div className="row between small">
        <span>{label}</span>
        <span className="num">
          <b>{fmt(value)}</b>/{fmt(target)} {unit}
        </span>
      </div>
      <div className={`bar ${className}`}>
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function MealTab({ state, update, onOpenSettings }: { state: AppState; update: Update; onOpenSettings: () => void }) {
  const [date, setDate] = useState(today())
  const [desc, setDesc] = useState('')
  const [est, setEst] = useState<Estimate | null>(null)
  const [estBusy, setEstBusy] = useState(false)
  const [estNote, setEstNote] = useState('')
  const [custom, setCustom] = useState<{ name: string; kcal: string; protein: string } | null>(null)
  const [showPlan, setShowPlan] = useState(false)
  const [showShopping, setShowShopping] = useState(false)

  const targets = computeTargets(state.profile)
  const entries = state.foodLog[date] ?? []
  const eaten = totalMacros(entries)
  const v = verdict(eaten.kcal, targets.kcal)
  const proteinLeft = Math.max(0, targets.protein - eaten.protein)

  const setEntries = (fn: (list: FoodEntry[]) => FoodEntry[]) =>
    update((s) => ({ ...s, foodLog: { ...s.foodLog, [date]: fn(s.foodLog[date] ?? []) } }))

  const addEntry = (name: string, m: Macros, qty = 1) => {
    const time = date === today() ? Date.now() : new Date(`${date}T12:00:00`).getTime()
    setEntries((list) => [...list, { id: uid(), name, qty, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, time }])
  }
  const addDish = (dish: Dish, qty = 1) => {
    addEntry(`${dish.name} (${dish.portion})`, dish, qty)
  }
  const changeQty = (id: string, delta: number) =>
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, qty: Math.max(0.5, Math.round((e.qty + delta) * 2) / 2) } : e)))
  const remove = (id: string) => setEntries((list) => list.filter((e) => e.id !== id))

  const estTotal = est ? sumItems(est.items) : { kcal: 0, protein: 0, carbs: 0, fat: 0 }

  const compute = async () => {
    const d = desc.trim()
    if (!d || estBusy) return
    setEstBusy(true)
    setEstNote('')
    try {
      let r: Estimate | null = null
      try {
        r = await estimateWithClaude(d)
      } catch (e) {
        const code = (e as { code?: string })?.code
        if (code === 'rate_limited') setEstNote('Claude đang bận, dùng ước tính nhanh.')
      }
      setEst(r ?? estimateLocal(d))
    } finally {
      setEstBusy(false)
    }
  }

  const addEstimate = () => {
    if (!est || est.items.length === 0) return
    const d = desc.trim()
    addEntry(d.length > 70 ? d.slice(0, 67) + '…' : d, sumItems(est.items))
    setDesc('')
    setEst(null)
  }
  const frequent = frequentDishes(state.foodLog).filter((f) => f.count >= 2).slice(0, 6)
  const fillers = v.status === 'short' ? suggestFillers(v.diff, proteinLeft) : []

  const saveCustom = () => {
    if (!custom) return
    const kcal = Number(custom.kcal)
    if (!custom.name.trim() || !kcal) return
    const protein = Number(custom.protein) || 0
    // Không biết carb/fat: chia phần calo còn lại 60% carb, 40% fat
    const rest = Math.max(0, kcal - protein * 4)
    addEntry(custom.name.trim(), { kcal, protein, carbs: (rest * 0.6) / 4, fat: (rest * 0.4) / 9 })
    setCustom(null)
  }

  const dayState = state.meals[date] ?? EMPTY_DAY
  const plan = showPlan ? planDay(date, targets, dayState) : []
  const week = Array.from({ length: 7 }, (_, i) => addDays(date, i))
  const shopping = showPlan && showShopping ? shoppingList(week.map((d) => planDay(d, targets, state.meals[d]))) : []
  const swap = (slot: keyof typeof SLOT_LABEL, currentId: string) =>
    update((s) => {
      const d = s.meals[date] ?? EMPTY_DAY
      return { ...s, meals: { ...s.meals, [date]: { ...d, overrides: { ...d.overrides, [slot]: nextTemplateId(slot, currentId) } } } }
    })


  return (
    <div className="stack">
      <header className="page-head">
        <h1 className="display">Ăn uống</h1>
        <p className="muted">
          Mục tiêu <b>{GOAL_LABEL[state.profile.goal]}</b>: {fmt(targets.kcal)} kcal · {targets.protein}g protein/ngày ·{' '}
          <button className="link" onClick={onOpenSettings}>
            chỉnh
          </button>
        </p>
      </header>

      <div className="date-nav">
        <button className="btn round" onClick={() => setDate(addDays(date, -1))} aria-label="Ngày trước">
          ‹
        </button>
        <button className="date-label" onClick={() => setDate(today())}>
          {date === today() ? 'Hôm nay · ' : ''}
          {formatDate(date)}
        </button>
        <button className="btn round" onClick={() => setDate(addDays(date, 1))} aria-label="Ngày sau">
          ›
        </button>
      </div>

      <section className={`card verdict ${v.status}`}>
        <div className="kcal-wrap">
          <Ring value={eaten.kcal / targets.kcal} size={132} stroke={11}>
            <span className="ring-big num">{fmt(Math.abs(targets.kcal - eaten.kcal))}</span>
            <span className="ring-label">{eaten.kcal > targets.kcal ? 'kcal dư' : 'kcal còn lại'}</span>
          </Ring>
          <div className="kcal-side">
            <span className="eyebrow">Đã ăn</span>
            <span className="kcal-eaten num">
              {fmt(eaten.kcal)}
              <small> / {fmt(targets.kcal)}</small>
            </span>
            <p className="verdict-text">
              {entries.length === 0
                ? 'Chưa ghi bữa nào'
                : v.status === 'short'
                  ? `Còn thiếu ${fmt(v.diff)} kcal`
                  : v.status === 'over'
                    ? `Dư ${fmt(v.diff)} kcal`
                    : 'Đủ calo hôm nay'}
            </p>
            {entries.length > 0 && <span className="muted small">Đã ăn {entries.length} lần</span>}
          </div>
        </div>
        {entries.length > 0 && proteinLeft > 10 && <p className="small muted">Protein còn thiếu {fmt(proteinLeft)}g — nên ưu tiên món nhiều đạm.</p>}
        {fillers.length > 0 && entries.length > 0 && (
          <div className="chips">
            <span className="small muted">Ăn thêm:</span>
            {fillers.map((d) => (
              <button key={d.id} className="chip" onClick={() => addDish(d)}>
                + {d.name} <span className="muted">{d.kcal}</span>
              </button>
            ))}
          </div>
        )}
        <div className="macro-grid">
          <MacroBar label="Protein" value={eaten.protein} target={targets.protein} unit="g" className="m-p" />
          <MacroBar label="Carb" value={eaten.carbs} target={targets.carbs} unit="g" className="m-c" />
          <MacroBar label="Fat" value={eaten.fat} target={targets.fat} unit="g" className="m-f" />
        </div>
      </section>

      <section className="card">
        <h2>Thêm bữa vừa ăn</h2>
        <p className="muted small">Mô tả món bạn ăn, app tự tính calo. VD: “2 bát cơm với 150g thịt bò xào rau cần”, “phở bò + 2 quả trứng”.</p>
        <textarea
          id="meal-desc"
          className="meal-desc"
          rows={3}
          placeholder="Hôm nay ăn gì…"
          value={desc}
          onChange={(e) => {
            setDesc(e.target.value)
            setEst(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void compute()
          }}
        />
        <button className="btn primary" onClick={() => void compute()} disabled={!desc.trim() || estBusy}>
          {estBusy ? 'Đang tính…' : 'Tính calo'}
        </button>
        {estNote && <p className="small warn-text">{estNote}</p>}

        {est && (
          <div className="estimate">
            <ul className="ex-list">
              {est.items.map((it, i) => (
                <li key={i}>
                  <span>
                    {it.name}
                    {it.amount && <span className="muted small"> · {it.amount}</span>}
                  </span>
                  <span className="num small">
                    <b>{fmt(it.kcal)}</b> kcal · P {fmt(it.protein)}g
                  </span>
                </li>
              ))}
            </ul>
            {est.unknown.length > 0 && <p className="small warn-text">Chưa nhận ra: “{est.unknown.join('”, “')}”. Tự nhập calo cho phần này ở dưới nếu cần.</p>}
            <div className="estimate-total">
              <span className="num">
                <b>{fmt(estTotal.kcal)}</b> kcal
              </span>
              <span className="muted small num">
                P {fmt(estTotal.protein)}g · C {fmt(estTotal.carbs)}g · F {fmt(estTotal.fat)}g
              </span>
            </div>
            <div className="row gap">
              <button className="btn ghost grow" onClick={() => setEst(null)}>
                Sửa mô tả
              </button>
              <button className="btn primary grow" onClick={addEstimate} disabled={est.items.length === 0}>
                + Thêm vào nhật ký
              </button>
            </div>
            <p className="muted small">{est.source === 'claude' ? 'Claude ước tính, sai số khoảng ±15%.' : 'Ước tính nhanh theo khẩu phần phổ biến, sai số khoảng ±20%.'}</p>
          </div>
        )}

        <p className="eyebrow">Hoặc thêm nhanh</p>
        <div className="chips">
          {(frequent.length ? frequent.map((f) => ({ key: f.name, label: f.name.replace(/ \(.*\)$/, ''), kcal: f.entry.kcal, add: () => addEntry(f.entry.name, f.entry) })) : POPULAR.map((d) => ({ key: d.id, label: d.name, kcal: d.kcal, add: () => addDish(d) }))).map(
            (c) => (
              <button key={c.key} className="chip" onClick={c.add}>
                + {c.label} <span className="muted">{fmt(c.kcal)}</span>
              </button>
            ),
          )}
        </div>

        {custom ? (
          <div className="custom-form">
            <input id="custom-name" placeholder="Tên món" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            <div className="row gap">
              <input id="custom-kcal" type="number" inputMode="numeric" placeholder="kcal" value={custom.kcal} onChange={(e) => setCustom({ ...custom, kcal: e.target.value })} />
              <input
                id="custom-protein"
                type="number"
                inputMode="numeric"
                placeholder="Protein g (nếu biết)"
                value={custom.protein}
                onChange={(e) => setCustom({ ...custom, protein: e.target.value })}
              />
            </div>
            <div className="row gap">
              <button className="btn ghost grow" onClick={() => setCustom(null)}>
                Huỷ
              </button>
              <button className="btn primary grow" onClick={saveCustom} disabled={!custom.name.trim() || !Number(custom.kcal)}>
                Thêm
              </button>
            </div>
          </div>
        ) : (
          <button className="link small left" onClick={() => setCustom({ name: '', kcal: '', protein: '' })}>
            Tự nhập calo
          </button>
        )}
      </section>

      <section className="card">
        <h2>Đã ăn {date === today() ? 'hôm nay' : formatDate(date)}</h2>
        {entries.length === 0 && <p className="muted small">Chưa có gì.</p>}
        <ul className="log-list">
          {entries.map((e) => (
            <li key={e.id}>
              <span className="time num">{clock(e.time)}</span>
              <div className="log-main">
                <span>{e.name}</span>
                <span className="muted small num">
                  {fmt(entryMacros(e).kcal)} kcal · P {fmt(entryMacros(e).protein)}g
                </span>
              </div>
              <div className="qty">
                <button className="btn tiny" onClick={() => (e.qty <= 0.5 ? remove(e.id) : changeQty(e.id, -0.5))} aria-label="Bớt nửa phần">
                  −
                </button>
                <span className="num">{e.qty}</span>
                <button className="btn tiny" onClick={() => changeQty(e.id, 0.5)} aria-label="Thêm nửa phần">
                  +
                </button>
              </div>
              <ConfirmButton className="btn ghost tiny" confirmLabel="Xoá" ariaLabel="Xoá món" onConfirm={() => remove(e.id)}>
                ✕
              </ConfirmButton>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="row between">
          <div>
            <h2>Thực đơn gợi ý</h2>
            <p className="muted small">Chưa biết ăn gì? Thực đơn 4 bữa vừa đúng mục tiêu.</p>
          </div>
          <button className="btn ghost small" onClick={() => setShowPlan((x) => !x)}>
            {showPlan ? 'Ẩn' : 'Xem'}
          </button>
        </div>
        {showPlan && (
          <>
            {plan.map((meal) => (
              <div key={meal.slot} className="plan-meal">
                <div className="row between">
                  <div>
                    <p className="eyebrow">{SLOT_LABEL[meal.slot]}</p>
                    <b>{meal.template.name}</b>
                  </div>
                  <span className="num small">{fmt(meal.macros.kcal)} kcal</span>
                </div>
                <p className="muted small">{meal.items.map((it) => `${it.food.name} ${formatAmount(it.food, it.grams)}`).join(' · ')}</p>
                <div className="row gap">
                  <button className="btn ghost small" onClick={() => swap(meal.slot, meal.template.id)}>
                    Đổi món
                  </button>
                  <button className="btn small" onClick={() => addEntry(meal.template.name, meal.macros)}>
                    + Ghi là đã ăn
                  </button>
                </div>
              </div>
            ))}
            <button className="btn ghost small" onClick={() => setShowShopping((x) => !x)}>
              {showShopping ? 'Ẩn danh sách đi chợ' : 'Danh sách đi chợ 7 ngày'}
            </button>
            {showShopping && (
              <ul className="ex-list">
                {shopping.map((s) => (
                  <li key={s.food.id}>
                    <span>{s.food.name}</span>
                    <span className="muted small">{formatAmount(s.food, s.grams)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  )
}
