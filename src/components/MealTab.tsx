import { useState } from 'react'
import { SLOT_LABEL } from '../data/foods'
import { addDays, formatDate, today } from '../lib/date'
import { computeTargets, formatAmount, GOAL_LABEL, nextTemplateId, planDay, shoppingList, sumMacros, type Macros } from '../lib/nutrition'
import type { Update } from '../lib/store'
import type { AppState, MealDayState, MealSlot } from '../types'

const EMPTY_DAY: MealDayState = { overrides: {}, eaten: {} }

function MacroBar({ label, value, target, unit, className }: { label: string; value: number; target: number; unit: string; className: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0
  return (
    <div className="macro">
      <div className="row between small">
        <span>{label}</span>
        <span>
          <b>{Math.round(value)}</b>/{target} {unit}
        </span>
      </div>
      <div className={`bar ${className}`}>
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const macroLine = (m: Macros) => `${Math.round(m.kcal)} kcal · P ${Math.round(m.protein)}g · C ${Math.round(m.carbs)}g · F ${Math.round(m.fat)}g`

export default function MealTab({ state, update, onOpenSettings }: { state: AppState; update: Update; onOpenSettings: () => void }) {
  const [date, setDate] = useState(today())
  const [showShopping, setShowShopping] = useState(false)
  const targets = computeTargets(state.profile)
  const dayState = state.meals[date] ?? EMPTY_DAY
  const meals = planDay(date, targets, dayState)
  const eaten = sumMacros(meals.filter((m) => dayState.eaten[m.slot]).map((m) => m.macros))
  const planned = sumMacros(meals.map((m) => m.macros))

  const editDay = (fn: (d: MealDayState) => MealDayState) =>
    update((s) => ({ ...s, meals: { ...s.meals, [date]: fn(s.meals[date] ?? EMPTY_DAY) } }))

  const toggleEaten = (slot: MealSlot) => editDay((d) => ({ ...d, eaten: { ...d.eaten, [slot]: !d.eaten[slot] } }))
  const swap = (slot: MealSlot, currentId: string) =>
    editDay((d) => ({ ...d, overrides: { ...d.overrides, [slot]: nextTemplateId(slot, currentId) } }))

  const week = Array.from({ length: 7 }, (_, i) => addDays(date, i))
  const shopping = showShopping ? shoppingList(week.map((d) => planDay(d, targets, state.meals[d]))) : []

  return (
    <div className="stack">
      <header className="page-head">
        <h1>Meal plan</h1>
        <p className="muted">
          Mục tiêu: <b>{GOAL_LABEL[state.profile.goal]}</b> · {targets.kcal} kcal/ngày ·{' '}
          <button className="link" onClick={onOpenSettings}>
            chỉnh thông số
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

      <section className="card">
        <h2>Đã ăn hôm nay</h2>
        <MacroBar label="Calo" value={eaten.kcal} target={targets.kcal} unit="kcal" className="m-kcal" />
        <MacroBar label="Protein" value={eaten.protein} target={targets.protein} unit="g" className="m-p" />
        <MacroBar label="Carb" value={eaten.carbs} target={targets.carbs} unit="g" className="m-c" />
        <MacroBar label="Fat" value={eaten.fat} target={targets.fat} unit="g" className="m-f" />
        <p className="muted small">Kế hoạch cả ngày: {macroLine(planned)}</p>
      </section>

      {meals.map((meal) => {
        const isEaten = !!dayState.eaten[meal.slot]
        return (
          <section key={meal.slot} className={`card ${isEaten ? 'done-card' : ''}`}>
            <div className="row between">
              <div>
                <p className="eyebrow">{SLOT_LABEL[meal.slot]}</p>
                <h2>{meal.template.name}</h2>
              </div>
              <button className={`checkbox ${isEaten ? 'on' : ''}`} onClick={() => toggleEaten(meal.slot)} aria-label="Đã ăn">
                {isEaten ? '✓' : ''}
              </button>
            </div>
            <ul className="ex-list">
              {meal.items.map((it) => (
                <li key={it.food.id}>
                  <span>{it.food.name}</span>
                  <span className="muted small">{formatAmount(it.food, it.grams)}</span>
                </li>
              ))}
            </ul>
            <div className="row between">
              <span className="muted small">{macroLine(meal.macros)}</span>
              <button className="btn ghost small" onClick={() => swap(meal.slot, meal.template.id)}>
                🔄 Đổi món
              </button>
            </div>
          </section>
        )
      })}

      <section className="card">
        <div className="row between">
          <h2>🛒 Đi chợ 7 ngày</h2>
          <button className="btn ghost small" onClick={() => setShowShopping((v) => !v)}>
            {showShopping ? 'Ẩn' : 'Xem'}
          </button>
        </div>
        {showShopping && (
          <>
            <p className="muted small">
              Từ {formatDate(week[0])} đến {formatDate(week[6])} (khối lượng đã nấu chín)
            </p>
            <ul className="ex-list">
              {shopping.map((s) => (
                <li key={s.food.id}>
                  <span>{s.food.name}</span>
                  <span className="muted small">{formatAmount(s.food, s.grams)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
