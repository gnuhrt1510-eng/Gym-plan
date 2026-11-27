import { DISHES, DISH_MAP, type Dish } from '../data/dishes'
import { normalize } from './foodlog'

/** Một thành phần trong bữa ăn đã ước tính */
export interface EstimateItem {
  name: string
  amount: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Estimate {
  items: EstimateItem[]
  /** phần mô tả không nhận ra (chỉ ở bộ tính nhanh) */
  unknown: string[]
  source: 'claude' | 'local'
}

/** Gram cho 1 phần của một số món, để đổi "200g cơm" ra số phần */
const GRAMS_PER_PORTION: Record<string, number> = {
  'com-trang': 150,
  'uc-ga': 100,
  'thit-bo': 100,
  'thit-heo': 100,
  'ba-roi': 100,
  ca: 100,
  'ca-hoi': 100,
  tom: 100,
  trung: 50,
  'yen-mach': 50,
  'khoai-lang': 200,
  'dau-phong': 30,
  chuoi: 120,
  tao: 180,
  'sua-tuoi': 180,
  rau: 150,
  'dau-hu': 150,
  'banh-mi-khong': 90,
  whey: 30,
}

/** Từ gọi tắt → món (kiểm tra theo thứ tự, cụm dài trước) */
const ALIASES: [string, string][] = [
  ['com tam', 'com-tam'],
  ['com ga', 'com-ga'],
  ['com chien', 'com-chien'],
  ['com rang', 'com-chien'],
  ['com van phong', 'com-van-phong'],
  ['com binh dan', 'com-van-phong'],
  ['com', 'com-trang'],
  ['pho ga', 'pho-ga'],
  ['pho', 'pho-bo'],
  ['bun bo', 'bun-bo'],
  ['bun cha', 'bun-cha'],
  ['bun rieu', 'bun-rieu'],
  ['bun dau', 'bun-dau'],
  ['bun thit nuong', 'bun-thit-nuong'],
  ['banh mi trung', 'banh-mi-trung'],
  ['banh mi thit', 'banh-mi-thit'],
  ['banh mi', 'banh-mi-khong'],
  ['uc ga', 'uc-ga'],
  ['dui ga', 'dui-ga'],
  ['ga ran', 'ga-ran'],
  ['thit ga', 'uc-ga'],
  ['ga', 'uc-ga'],
  ['ba roi', 'ba-roi'],
  ['ba chi', 'ba-roi'],
  ['thit bo', 'thit-bo'],
  ['bo', 'thit-bo'],
  ['thit heo', 'thit-heo'],
  ['thit lon', 'thit-heo'],
  ['suon', 'thit-heo'],
  ['heo', 'thit-heo'],
  ['lon', 'thit-heo'],
  ['ca hoi', 'ca-hoi'],
  ['ca', 'ca'],
  ['tom', 'tom'],
  ['hot vit lon', 'trung-vit-lon'],
  ['trung', 'trung'],
  ['dau hu', 'dau-hu'],
  ['dau phu', 'dau-hu'],
  ['dau phong', 'dau-phong'],
  ['lac', 'dau-phong'],
  ['hat', 'dau-phong'],
  ['yen mach', 'yen-mach'],
  ['khoai lang', 'khoai-lang'],
  ['whey', 'whey'],
  ['sua chua', 'sua-chua'],
  ['sua', 'sua-tuoi'],
  ['chuoi', 'chuoi'],
  ['tao', 'tao'],
  ['tra sua', 'tra-sua'],
  ['ca phe', 'cafe-sua'],
  ['cafe', 'cafe-sua'],
  ['bia', 'bia'],
  ['nuoc ngot', 'nuoc-ngot'],
  ['coca', 'nuoc-ngot'],
  ['xoi', 'xoi'],
  ['chao', 'chao'],
  ['mi tom', 'mi-tom'],
  ['mi goi', 'mi-tom'],
  ['hu tieu', 'hu-tieu'],
  ['mi quang', 'mi-quang'],
  ['banh cuon', 'banh-cuon'],
  ['banh bao', 'banh-bao'],
  ['banh xeo', 'banh-xeo'],
  ['goi cuon', 'goi-cuon'],
  ['lau', 'lau'],
  ['pizza', 'pizza'],
  ['burger', 'hamburger'],
  ['canh', 'canh'],
  ['rau', 'rau'],
  ['salad', 'rau'],
]

/** cụm dài khớp trước ("tra sua" trước "sua", "pho ga" trước "ga") */
const ALIASES_BY_LENGTH = [...ALIASES].sort((a, b) => b[0].length - a[0].length)

const WORD_NUM: Record<string, number> = { mot: 1, hai: 2, ba: 3, bon: 4, tu: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10, nua: 0.5, ruoi: 1.5 }
const COUNT_UNITS = /\b(bat|chen|to|dia|qua|trai|cai|o|muong|ly|coc|lon|hop|mieng|phan|lat|goi|cuon|cu|nam|suat)\b/

const hasPhrase = (text: string, phrase: string) => new RegExp(`(^| )${phrase}( |$)`).test(text)

function findDish(text: string): { dish: Dish; phrase: string } | null {
  for (const [phrase, id] of ALIASES_BY_LENGTH) if (hasPhrase(text, phrase)) return { dish: DISH_MAP[id], phrase }
  // thử tên đầy đủ của món trong danh sách
  let best: Dish | null = null
  for (const d of DISHES) {
    const base = normalize(d.name.replace(/\s*\(.*\)$/, ''))
    if (text.includes(base) && (!best || base.length > normalize(best.name).length)) best = d
  }
  return best ? { dish: best, phrase: normalize(best.name) } : null
}

function parseQty(text: string): { grams?: number; count?: number } {
  const g = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gram|gam|ml)\b/)
  if (g) {
    const v = Number(g[1].replace(',', '.'))
    return { grams: g[2] === 'kg' ? v * 1000 : v }
  }
  const n = text.match(/(\d+(?:[.,]\d+)?)/)
  if (n) return { count: Number(n[1].replace(',', '.')) }
  const w = text.split(' ').find((t) => t in WORD_NUM)
  if (w && (COUNT_UNITS.test(text) || w !== 'ba')) return { count: WORD_NUM[w] }
  return {}
}

function itemFrom(dish: Dish, factor: number, amount: string, name = dish.name): EstimateItem {
  return {
    name,
    amount,
    kcal: dish.kcal * factor,
    protein: dish.protein * factor,
    carbs: dish.carbs * factor,
    fat: dish.fat * factor,
  }
}

/** Ước tính nhanh, không cần mạng: tách câu theo dấu phẩy / "với" / "và" / "+" rồi khớp từng món */
export function estimateLocal(description: string): Estimate {
  const text = normalize(description).replace(/[()]/g, ' ')
  const chunks = text
    .split(/,|;|\+|\n| voi | va | kem | an them | them /)
    .map((c) => c.trim())
    .filter(Boolean)
  const items: EstimateItem[] = []
  const unknown: string[] = []
  for (const chunk of chunks) {
    const found = findDish(chunk)
    if (!found) {
      unknown.push(chunk)
      continue
    }
    const { dish, phrase } = found
    const q = parseQty(chunk)
    const per = GRAMS_PER_PORTION[dish.id]
    if (q.grams && per) {
      items.push(itemFrom(dish, q.grams / per, `${Math.round(q.grams)}g`))
    } else {
      const count = q.count ?? 1
      items.push(itemFrom(dish, count, `${count} × ${dish.portion}`))
    }
    // xào / chiên / rán: cộng dầu ăn
    if (/\b(xao|chien|ran|rang|ap chao)\b/.test(chunk)) {
      items.push({ name: 'Dầu ăn (xào/chiên)', amount: '~1 muỗng canh', kcal: 90, protein: 0, carbs: 0, fat: 10 })
    }
    // rau đi kèm trong cùng cụm ("bò xào rau cần")
    if (dish.id !== 'rau' && phrase !== 'rau' && /\b(rau|cai|can|muong|bong cai|dua leo|ca chua)\b/.test(chunk.replace(phrase, ''))) {
      items.push(itemFrom(DISH_MAP.rau, 1, '1 phần', 'Rau'))
    }
  }
  return { items, unknown, source: 'local' }
}

export function sumItems(items: EstimateItem[]) {
  return items.reduce(
    (a, i) => ({ kcal: a.kcal + i.kcal, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

/* ---------- nhờ Claude ước tính (chỉ khi mở trong Claude) ---------- */

type SampleFn = { json: <T>(input: string, opts?: Record<string, unknown>) => Promise<T> }
type ClaudeWin = { claude?: { use?: (n: string) => Promise<unknown> } }

let samplePromise: Promise<SampleFn | null> | null = null
export function getSample(): Promise<SampleFn | null> {
  if (!samplePromise) {
    const claude = (window as unknown as ClaudeWin).claude
    samplePromise = claude?.use ? (claude.use('sample') as Promise<SampleFn | null>).catch(() => null) : Promise.resolve(null)
  }
  return samplePromise
}

const num = (v: unknown) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : Number(v) >= 0 ? Number(v) : 0)

export async function estimateWithClaude(description: string): Promise<Estimate | null> {
  const sample = await getSample()
  if (!sample) return null
  const prompt = `Bạn là chuyên gia dinh dưỡng. Hãy ước tính dinh dưỡng của bữa ăn người dùng mô tả (tiếng Việt, có thể không dấu hoặc viết tắt).
Tách thành từng thành phần. Nếu không nói rõ lượng, dùng khẩu phần phổ biến ở Việt Nam (1 bát cơm ≈ 150 g cơm chín). Món xào/chiên nhớ tính dầu mỡ. Thịt không nói rõ thì coi là nạc.
Chỉ trả lời bằng JSON đúng dạng sau, không thêm chữ nào khác:
{"items":[{"name":"Cơm trắng","amount":"2 bát (~300 g)","kcal":390,"protein":8,"carbs":86,"fat":1}]}
Tên món bằng tiếng Việt có dấu. kcal, protein, carbs, fat là số (gram), cho cả lượng đã ăn.

Mô tả: ${description.slice(0, 600)}`
  const res = await sample.json<{ items?: unknown[] }>(prompt, { modelTier: 'default' })
  const items = (Array.isArray(res?.items) ? res.items : [])
    .map((x) => x as Record<string, unknown>)
    .filter((x) => typeof x.name === 'string')
    .map((x) => ({
      name: String(x.name).slice(0, 80),
      amount: String(x.amount ?? '').slice(0, 40),
      kcal: num(x.kcal),
      protein: num(x.protein),
      carbs: num(x.carbs),
      fat: num(x.fat),
    }))
  if (items.length === 0) return null
  return { items, unknown: [], source: 'claude' }
}
