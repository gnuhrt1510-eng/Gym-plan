/** Món ăn thường gặp với khẩu phần phổ biến — số liệu ước lượng để tính nhanh, không cần cân đo. */
export interface Dish {
  id: string
  name: string
  portion: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** từ khoá phụ để tìm (không dấu cũng được) */
  tags?: string
}

const d = (id: string, name: string, portion: string, kcal: number, protein: number, carbs: number, fat: number, tags = ''): Dish => ({
  id,
  name,
  portion,
  kcal,
  protein,
  carbs,
  fat,
  tags,
})

export const DISHES: Dish[] = [
  // Món nước
  d('pho-bo', 'Phở bò', '1 tô', 450, 25, 55, 12, 'pho'),
  d('pho-ga', 'Phở gà', '1 tô', 400, 25, 55, 8, 'pho'),
  d('bun-bo', 'Bún bò Huế', '1 tô', 550, 28, 65, 18, 'bun'),
  d('bun-cha', 'Bún chả', '1 phần', 600, 28, 70, 22, 'bun'),
  d('bun-rieu', 'Bún riêu', '1 tô', 450, 20, 60, 14, 'bun'),
  d('bun-thit-nuong', 'Bún thịt nướng', '1 tô', 550, 25, 70, 18, 'bun'),
  d('bun-dau', 'Bún đậu mắm tôm', '1 phần', 700, 30, 70, 32, 'bun'),
  d('hu-tieu', 'Hủ tiếu', '1 tô', 450, 20, 60, 13),
  d('mi-quang', 'Mì Quảng', '1 tô', 550, 25, 65, 20),
  d('banh-canh', 'Bánh canh', '1 tô', 450, 18, 65, 12),
  d('chao', 'Cháo thịt / cháo gà', '1 tô', 300, 15, 45, 6),
  d('mi-tom', 'Mì gói', '1 gói', 350, 7, 50, 14, 'mi tom'),
  d('mi-tom-trung', 'Mì gói + trứng', '1 tô', 430, 13, 50, 19, 'mi tom'),

  // Cơm
  d('com-trang', 'Cơm trắng', '1 chén', 200, 4, 44, 0.5, 'com'),
  d('com-ga', 'Cơm gà', '1 dĩa', 600, 35, 75, 15, 'com'),
  d('com-tam', 'Cơm tấm sườn', '1 dĩa', 650, 30, 80, 22, 'com suon'),
  d('com-tam-full', 'Cơm tấm sườn bì chả trứng', '1 dĩa', 850, 40, 85, 38, 'com suon'),
  d('com-van-phong', 'Cơm văn phòng (cơm + món mặn + rau)', '1 phần', 600, 28, 80, 18, 'com binh dan'),
  d('com-chien', 'Cơm chiên', '1 dĩa', 650, 18, 85, 25, 'com rang'),
  d('com-bo', 'Cơm bò xào', '1 dĩa', 650, 32, 75, 22, 'com'),
  d('com-ca', 'Cơm cá kho', '1 phần', 550, 28, 75, 14, 'com'),

  // Đạm lẻ
  d('uc-ga', 'Ức gà', '100g', 165, 31, 0, 3.6, 'ga'),
  d('dui-ga', 'Đùi gà', '1 cái', 250, 25, 0, 16, 'ga'),
  d('thit-bo', 'Thịt bò', '100g', 190, 27, 0, 8, 'bo'),
  d('thit-heo', 'Thịt heo nạc', '100g', 145, 21, 0, 6, 'lon'),
  d('ba-roi', 'Thịt ba rọi', '100g', 400, 15, 0, 38, 'heo'),
  d('ca', 'Cá (basa, cá thu…)', '100g', 130, 20, 0, 5),
  d('ca-hoi', 'Cá hồi', '100g', 210, 20, 0, 13),
  d('tom', 'Tôm', '100g', 100, 24, 0, 0.5),
  d('trung', 'Trứng gà', '1 quả', 72, 6.3, 0.4, 4.8, 'trung luoc op la'),
  d('trung-vit-lon', 'Hột vịt lộn', '1 quả', 180, 14, 1, 13, 'trung'),
  d('dau-hu', 'Đậu hũ', '1 bìa', 110, 12, 3, 6, 'dau phu'),
  d('whey', 'Whey protein', '1 muỗng', 120, 24, 3, 1.5, 'sua protein'),

  // Bánh, đồ ăn sáng
  d('banh-mi-thit', 'Bánh mì thịt', '1 ổ', 450, 18, 55, 17, 'banh mi'),
  d('banh-mi-trung', 'Bánh mì trứng', '1 ổ', 380, 15, 50, 13, 'banh mi'),
  d('banh-mi-khong', 'Bánh mì không', '1 ổ', 240, 8, 46, 3, 'banh mi'),
  d('xoi', 'Xôi', '1 gói', 450, 10, 80, 10),
  d('banh-cuon', 'Bánh cuốn', '1 dĩa', 400, 15, 60, 10),
  d('banh-bao', 'Bánh bao', '1 cái', 300, 10, 45, 9),
  d('banh-xeo', 'Bánh xèo', '1 cái', 300, 10, 25, 18),
  d('goi-cuon', 'Gỏi cuốn', '1 cuốn', 70, 4, 10, 1.5),
  d('yen-mach', 'Yến mạch', '50g', 195, 8, 33, 3.5, 'oat'),
  d('khoai-lang', 'Khoai lang', '1 củ (200g)', 170, 3, 40, 0.2),

  // Sữa, trái cây, ăn vặt
  d('sua-tuoi', 'Sữa tươi', '1 hộp 180ml', 115, 6, 9, 6, 'sua'),
  d('sua-chua', 'Sữa chua', '1 hộp', 100, 4, 15, 3, 'yaourt'),
  d('chuoi', 'Chuối', '1 quả', 105, 1.3, 27, 0.4, 'trai cay'),
  d('tao', 'Táo', '1 quả', 95, 0.5, 25, 0.3, 'trai cay'),
  d('dau-phong', 'Đậu phộng / hạt', '1 nắm (30g)', 170, 7, 5, 14, 'hat dieu'),
  d('rau', 'Rau luộc / salad', '1 dĩa', 50, 3, 8, 0.5),
  d('canh', 'Canh rau', '1 chén', 60, 4, 6, 2),

  // Đồ ăn nhanh, đồ uống
  d('ga-ran', 'Gà rán', '1 miếng', 320, 20, 10, 22, 'kfc'),
  d('pizza', 'Pizza', '1 miếng', 285, 12, 36, 10),
  d('hamburger', 'Hamburger', '1 cái', 500, 25, 45, 25, 'burger'),
  d('lau', 'Lẩu', '1 phần', 700, 40, 50, 35),
  d('tra-sua', 'Trà sữa trân châu', '1 ly M', 350, 3, 60, 10),
  d('cafe-sua', 'Cà phê sữa', '1 ly', 150, 2, 25, 4, 'ca phe bac xiu'),
  d('nuoc-ngot', 'Nước ngọt', '1 lon', 140, 0, 35, 0, 'coca pepsi'),
  d('bia', 'Bia', '1 lon', 150, 1, 13, 0),
]

export const DISH_MAP: Record<string, Dish> = Object.fromEntries(DISHES.map((x) => [x.id, x]))
