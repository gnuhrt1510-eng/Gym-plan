# Gym Plan

App kế hoạch tập gym + meal plan, chạy trên trình duyệt (tối ưu cho điện thoại, có thể "Thêm vào màn hình chính").
Dữ liệu lưu trong `localStorage` của máy, có thể xuất/nhập file JSON để sao lưu.

## Tính năng

- **Tập luyện**: chương trình 4 buổi Ngực • Lưng • Chân • Vai (mặc định), cùng Full Body 3 buổi, Upper/Lower, Push/Pull/Legs.
  Tích ✓ từng set, ghi số rep thực tế, tự bấm giờ nghỉ giữa set, đánh dấu buổi đã tập trong tuần.
- **Tăng tạ tự động (double progression)** — `src/lib/progression.ts`
  - Mọi set đạt rep tối đa → buổi sau tăng tạ (+2.5 kg thân trên, +5 kg thân dưới, +1 kg bài cô lập…)
  - Trong khoảng rep → giữ tạ, cố thêm rep
  - Không đạt rep tối thiểu 3 buổi liên tiếp → giảm 10% (deload)
- **Tiến độ**: biểu đồ mức tạ + 1RM ước tính theo từng bài, cân nặng cơ thể, lịch sử buổi tập.
- **Nhật ký ăn** — `src/lib/foodlog.ts`, `src/data/dishes.ts`
  - Gõ tên món (không dấu được, VD `pho`, `2 trung`), chạm để ghi; ăn bao nhiêu bữa cũng được
  - Báo còn thiếu / đủ / dư calo trong ngày, protein còn thiếu và gợi ý món bù
  - Món không có trong danh sách: tự nhập calo
- **Thực đơn gợi ý** — `src/lib/nutrition.ts`
  - Tính BMR/TDEE (Mifflin–St Jeor), calo & macro theo mục tiêu giảm mỡ / giữ cân / tăng cơ
  - Thực đơn 4 bữa/ngày với món Việt, khẩu phần tự scale theo protein/carb/fat mục tiêu
  - Nút "Đổi món", "Ghi là đã ăn", danh sách đi chợ 7 ngày

## Chạy

```bash
npm install
npm run dev      # mở http://localhost:5173
npm test         # unit test cho logic tăng tạ & dinh dưỡng
npm run build    # build tĩnh vào dist/, deploy lên bất kỳ static host nào
```

Thêm bài tập / chương trình: `src/data/programs.ts`. Thêm thực phẩm / món: `src/data/foods.ts`.

## Đưa lên web (GitHub Pages)

Mỗi lần push, workflow *Deploy web app* build và đưa app lên GitHub Pages (công khai, không mật khẩu).

1. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions** (làm một lần).
2. Mở `https://<tên-github>.github.io/<tên-repo>/` trên điện thoại → Chia sẻ → **Thêm vào màn hình chính**.

Dữ liệu tập/ăn/chạy trên bản web lưu trong trình duyệt của từng máy (không đồng bộ giữa các máy).

## Chạy bộ (GPS)

Tab **Chạy** cần mở app trực tiếp bằng trình duyệt điện thoại (HTTPS) và cho phép Vị trí + Chuyển động.
Giữ màn hình sáng khi chạy: trình duyệt dừng GPS khi tắt màn hình hoặc chuyển sang app khác.
