# SmartSite dashboard runtime artifacts

Cập nhật artifact sạch hơn cho dashboard, ưu tiên giảm heuristic mơ hồ và ghi rõ mức verification.
Các file được ghi trực tiếp vào `ai_workspace/web_dashboard/data` để frontend dùng runtime đồng nhất.

## Files chính
- `model_runs.csv`: model tracker đã chuẩn hóa theo từng notebook/model, có `verification_level`, `target_definition`, `split_strategy`, `primary_metric_*`.
- `grid_predictions.csv`: dự đoán/ranking cấp grid tái lập từ logic nhãn của notebook **Multimoal_WDLearning v5-1**.
- `grid_predictions.json`: bản JSON của `grid_predictions.csv` để frontend đọc trực tiếp.
- `grid_summary.csv`: tổng hợp city-level hiện trạng dữ liệu grid.
- `kpi_summary.json`: metadata, freshness, best model theo task, thresholds dùng để dựng grid prediction.

## Verification levels
- `A-`: split + metric + logic target/label kiểm tra được từ notebook source/output, nhưng chưa có model binary/pipeline inference độc lập.
- `B`: metric đọc được từ output notebook, target xác nhận được tương đối, nhưng một phần cần suy diễn nhẹ hoặc notebook cũ chưa xuất đủ chi tiết.

## Khuyến nghị dùng trên dashboard
- **Model Tracking**: dùng `model_runs.csv`, ưu tiên `primary_metric_name/value`, `verification_level`, `split_strategy`, `target_definition`.
- **Opportunity Map**: dùng `grid_predictions.csv/json` nhưng hiển thị là:
  - `high_observed_vitality`: ô đã có hoạt động mạnh theo proxy quan sát.
  - `medium_or_emerging`: ô hoạt động trung bình hoặc ô trống có NTL lân cận cao.
  - `low_potential`: ô trống có tín hiệu môi trường yếu theo rule hiện tại.
- **Không gọi đây là revenue forecast / success probability**.

## Important caveat
`grid_predictions.*` là **verified rule-reproduction artifact**, không phải output từ model weight đã export. Nó vẫn hữu ích để dashboard bớt placeholder, nhưng phải gắn disclaimer pseudo-label/exploratory.

## Rebuild
```powershell
python scripts/build_verified_artifacts.py
```
