import type { Food, MealSlot, MealTemplate } from '../types'

/** Giá trị dinh dưỡng xấp xỉ trên 100 g (đã nấu chín với thịt/cá/cơm). */
export const FOODS: Food[] = [
  { id: 'rice', name: 'Cơm trắng', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: 'brownrice', name: 'Cơm gạo lứt', kcal: 112, protein: 2.6, carbs: 23.5, fat: 0.9 },
  { id: 'bun', name: 'Bún tươi', kcal: 110, protein: 1.7, carbs: 25, fat: 0.1 },
  { id: 'pho', name: 'Bánh phở', kcal: 140, protein: 2.5, carbs: 31, fat: 0.4 },
  { id: 'bread', name: 'Bánh mì', kcal: 265, protein: 9, carbs: 49, fat: 3.2, unit: { label: 'ổ', grams: 90 } },
  { id: 'wholebread', name: 'Bánh mì nguyên cám', kcal: 250, protein: 12, carbs: 41, fat: 3.5, unit: { label: 'lát', grams: 30 } },
  { id: 'oats', name: 'Yến mạch', kcal: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  { id: 'sweetpotato', name: 'Khoai lang luộc', kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { id: 'potato', name: 'Khoai tây luộc', kcal: 87, protein: 1.9, carbs: 20, fat: 0.1 },
  { id: 'chicken', name: 'Ức gà', kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: 'chickenthigh', name: 'Đùi gà bỏ da', kcal: 177, protein: 24, carbs: 0, fat: 8.2 },
  { id: 'beef', name: 'Thịt bò nạc', kcal: 187, protein: 27, carbs: 0, fat: 8 },
  { id: 'pork', name: 'Thịt heo nạc', kcal: 143, protein: 21, carbs: 0, fat: 6 },
  { id: 'salmon', name: 'Cá hồi', kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { id: 'basa', name: 'Cá basa', kcal: 105, protein: 17, carbs: 0, fat: 4 },
  { id: 'shrimp', name: 'Tôm', kcal: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  { id: 'tofu', name: 'Đậu phụ', kcal: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { id: 'egg', name: 'Trứng gà', kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, unit: { label: 'quả', grams: 50 } },
  { id: 'eggwhite', name: 'Lòng trắng trứng', kcal: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { id: 'milk', name: 'Sữa tươi không đường', kcal: 62, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { id: 'greekyogurt', name: 'Sữa chua Hy Lạp', kcal: 59, protein: 10, carbs: 3.6, fat: 0.4, unit: { label: 'hộp', grams: 100 } },
  { id: 'whey', name: 'Whey protein', kcal: 400, protein: 80, carbs: 8, fat: 6, unit: { label: 'muỗng', grams: 30 } },
  { id: 'banana', name: 'Chuối', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, unit: { label: 'quả', grams: 120 } },
  { id: 'apple', name: 'Táo', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, unit: { label: 'quả', grams: 180 } },
  { id: 'avocado', name: 'Bơ (quả)', kcal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  { id: 'peanutbutter', name: 'Bơ đậu phộng', kcal: 588, protein: 25, carbs: 20, fat: 50, unit: { label: 'muỗng', grams: 16 } },
  { id: 'peanuts', name: 'Đậu phộng rang', kcal: 567, protein: 26, carbs: 16, fat: 49 },
  { id: 'veg', name: 'Rau xanh (cải, muống)', kcal: 25, protein: 2.5, carbs: 4, fat: 0.3 },
  { id: 'broccoli', name: 'Bông cải xanh', kcal: 35, protein: 2.4, carbs: 7, fat: 0.4 },
  { id: 'oil', name: 'Dầu ăn / dầu ô liu', kcal: 884, protein: 0, carbs: 0, fat: 100, unit: { label: 'muỗng', grams: 10 } },
]

export const FOOD_MAP: Record<string, Food> = Object.fromEntries(FOODS.map((f) => [f.id, f]))

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Bữa sáng',
  lunch: 'Bữa trưa',
  snack: 'Bữa phụ',
  dinner: 'Bữa tối',
}

export const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner']

/** Tỉ lệ calo mỗi bữa trong ngày */
export const SLOT_SHARE: Record<MealSlot, number> = {
  breakfast: 0.25,
  lunch: 0.32,
  snack: 0.15,
  dinner: 0.28,
}

export const MEAL_TEMPLATES: MealTemplate[] = [
  // Bữa sáng
  { id: 'b-oats', slot: 'breakfast', name: 'Yến mạch sữa chuối', items: [{ foodId: 'oats', grams: 60 }, { foodId: 'milk', grams: 250 }, { foodId: 'banana', grams: 120 }, { foodId: 'whey', grams: 30, fixed: true }] },
  { id: 'b-banhmi', slot: 'breakfast', name: 'Bánh mì trứng', items: [{ foodId: 'bread', grams: 90 }, { foodId: 'egg', grams: 100 }, { foodId: 'veg', grams: 50, fixed: true }] },
  { id: 'b-pho', slot: 'breakfast', name: 'Phở bò', items: [{ foodId: 'pho', grams: 200 }, { foodId: 'beef', grams: 100 }, { foodId: 'veg', grams: 50, fixed: true }] },
  { id: 'b-eggtoast', slot: 'breakfast', name: 'Trứng ốp + bánh mì nguyên cám + bơ', items: [{ foodId: 'wholebread', grams: 60 }, { foodId: 'egg', grams: 100 }, { foodId: 'eggwhite', grams: 100 }, { foodId: 'avocado', grams: 50 }] },
  { id: 'b-sweetpotato', slot: 'breakfast', name: 'Khoai lang + trứng + sữa', items: [{ foodId: 'sweetpotato', grams: 200 }, { foodId: 'egg', grams: 100 }, { foodId: 'milk', grams: 200 }] },

  // Bữa trưa
  { id: 'l-chicken', slot: 'lunch', name: 'Cơm ức gà rau luộc', items: [{ foodId: 'rice', grams: 200 }, { foodId: 'chicken', grams: 150 }, { foodId: 'veg', grams: 150, fixed: true }, { foodId: 'oil', grams: 5 }] },
  { id: 'l-beef', slot: 'lunch', name: 'Cơm bò xào bông cải', items: [{ foodId: 'rice', grams: 200 }, { foodId: 'beef', grams: 130 }, { foodId: 'broccoli', grams: 150, fixed: true }, { foodId: 'oil', grams: 10 }] },
  { id: 'l-bun', slot: 'lunch', name: 'Bún thịt heo nạc', items: [{ foodId: 'bun', grams: 250 }, { foodId: 'pork', grams: 150 }, { foodId: 'veg', grams: 100, fixed: true }] },
  { id: 'l-basa', slot: 'lunch', name: 'Cơm gạo lứt cá basa', items: [{ foodId: 'brownrice', grams: 220 }, { foodId: 'basa', grams: 180 }, { foodId: 'veg', grams: 150, fixed: true }, { foodId: 'oil', grams: 10 }] },
  { id: 'l-thigh', slot: 'lunch', name: 'Cơm đùi gà kho + canh rau', items: [{ foodId: 'rice', grams: 200 }, { foodId: 'chickenthigh', grams: 150 }, { foodId: 'veg', grams: 150, fixed: true }] },

  // Bữa phụ
  { id: 's-yogurt', slot: 'snack', name: 'Sữa chua Hy Lạp + chuối', items: [{ foodId: 'greekyogurt', grams: 200 }, { foodId: 'banana', grams: 120 }] },
  { id: 's-whey', slot: 'snack', name: 'Whey + sữa + táo', items: [{ foodId: 'whey', grams: 30, fixed: true }, { foodId: 'milk', grams: 250 }, { foodId: 'apple', grams: 180 }] },
  { id: 's-pb', slot: 'snack', name: 'Bánh mì bơ đậu phộng', items: [{ foodId: 'wholebread', grams: 60 }, { foodId: 'peanutbutter', grams: 16 }, { foodId: 'banana', grams: 120 }] },
  { id: 's-nuts', slot: 'snack', name: 'Trứng luộc + đậu phộng + chuối', items: [{ foodId: 'egg', grams: 100 }, { foodId: 'peanuts', grams: 20 }, { foodId: 'banana', grams: 120 }] },

  // Bữa tối
  { id: 'd-salmon', slot: 'dinner', name: 'Cá hồi áp chảo + khoai lang', items: [{ foodId: 'salmon', grams: 150 }, { foodId: 'sweetpotato', grams: 200 }, { foodId: 'broccoli', grams: 150, fixed: true }] },
  { id: 'd-tofu', slot: 'dinner', name: 'Cơm đậu phụ sốt cà + trứng', items: [{ foodId: 'rice', grams: 180 }, { foodId: 'tofu', grams: 200 }, { foodId: 'egg', grams: 50 }, { foodId: 'veg', grams: 150, fixed: true }, { foodId: 'oil', grams: 10 }] },
  { id: 'd-shrimp', slot: 'dinner', name: 'Cơm tôm rim + rau luộc', items: [{ foodId: 'rice', grams: 180 }, { foodId: 'shrimp', grams: 180 }, { foodId: 'veg', grams: 150, fixed: true }, { foodId: 'oil', grams: 5 }] },
  { id: 'd-chicken', slot: 'dinner', name: 'Ức gà nướng + khoai tây + salad', items: [{ foodId: 'chicken', grams: 170 }, { foodId: 'potato', grams: 250 }, { foodId: 'veg', grams: 100, fixed: true }, { foodId: 'oil', grams: 10 }] },
  { id: 'd-beef', slot: 'dinner', name: 'Bò lúc lắc + cơm gạo lứt', items: [{ foodId: 'beef', grams: 150 }, { foodId: 'brownrice', grams: 180 }, { foodId: 'veg', grams: 100, fixed: true }, { foodId: 'oil', grams: 10 }] },
]

export const TEMPLATE_MAP: Record<string, MealTemplate> = Object.fromEntries(MEAL_TEMPLATES.map((t) => [t.id, t]))
