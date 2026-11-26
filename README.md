# Gym Plan

App kế hoạch tập gym + meal plan, chạy trên trình duyệt (tối ưu cho điện thoại, có thể "Thêm vào màn hình chính").
Dữ liệu lưu trong `localStorage` của máy, có thể xuất/nhập file JSON để sao lưu.

## Tính năng

- **Tập luyện**: 3 chương trình có sẵn (Full Body 3 buổi, Upper/Lower 4 buổi, Push/Pull/Legs).
  Tích ✓ từng set, ghi số rep thực tế, tự bấm giờ nghỉ giữa set, đánh dấu buổi đã tập trong tuần.
- **Tăng tạ tự động (double progression)** — `src/lib/progression.ts`
  - Mọi set đạt rep tối đa → buổi sau tăng tạ (+2.5 kg thân trên, +5 kg thân dưới, +1 kg bài cô lập…)
  - Trong khoảng rep → giữ tạ, cố thêm rep
  - Không đạt rep tối thiểu 3 buổi liên tiếp → giảm 10% (deload)
- **Tiến độ**: biểu đồ mức tạ + 1RM ước tính theo từng bài, cân nặng cơ thể, lịch sử buổi tập.
- **Meal plan** — `src/lib/nutrition.ts`
  - Tính BMR/TDEE (Mifflin–St Jeor), calo & macro theo mục tiêu giảm mỡ / giữ cân / tăng cơ
  - Thực đơn 4 bữa/ngày với món Việt, khẩu phần tự scale theo protein/carb/fat mục tiêu
  - Tích "đã ăn" để theo dõi macro trong ngày, nút "Đổi món", danh sách đi chợ 7 ngày

## Chạy

```bash
npm install
npm run dev      # mở http://localhost:5173
npm test         # unit test cho logic tăng tạ & dinh dưỡng
npm run build    # build tĩnh vào dist/, deploy lên bất kỳ static host nào
```

Thêm bài tập / chương trình: `src/data/programs.ts`. Thêm thực phẩm / món: `src/data/foods.ts`.
