# SmartSite Web Dashboard Wiki

## 1. Mục tiêu

`web_dashboard` là lớp ứng dụng web cho workspace SmartSite. Nó không phải toàn bộ pipeline học máy; nó là UI + API để:

- xem snapshot artifact đã export sẵn
- hiển thị lớp không gian theo thành phố
- phân tích một vùng chọn bằng dữ liệu point-level thực
- sinh insight tiếng Việt bằng rule-based hoặc LLM OpenAI-compatible

Dashboard chỉ nên được mô tả là công cụ exploratory site-selection support. Không nên mô tả là revenue forecast hay recommendation engine đã kiểm chứng.

## 2. Kiến trúc repo hiện tại

```text
web_dashboard/
├─ README.md
├─ PROJECT_WIKI.md
├─ data/
│  ├─ dashboard_data_bundle.json
│  ├─ grid_predictions.csv
│  ├─ grid_summary.csv
│  ├─ kpi_summary.json
│  ├─ model_runs.csv
│  ├─ favicon.svg
│  ├─ boundaries/
│  ├─ population/
│  └─ spatial/
├─ fe/
│  ├─ .env.example
│  ├─ index.html
│  ├─ package.json
│  ├─ vite.config.js
│  ├─ eslint.config.js
│  └─ src/
└─ be/
   ├─ .env.example
   └─ backend/
      ├─ main.py
      ├─ models/
      ├─ routers/
      └─ services/
```

Các file page/component cũ như `PlacesPage`, `ModelPage`, `LineagePage`, `OpportunityPage`, `FigureModal` đã bị dọn khỏi repo vì không còn nằm trong import graph.

## 3. Frontend

### 3.1 Stack

- React 19
- Vite 8
- Goong Maps JS
- Recharts
- Axios

### 3.2 Entry points

- `fe/src/main.jsx`: bootstrap React
- `fe/src/App.jsx`: nạp bundle, giữ state view, điều hướng 3 tab chính

### 3.3 Các view đang hoạt động

- `overview`
  - component: `fe/src/components/app/OverviewTab.jsx`
  - dữ liệu chính: `dashboard_data_bundle.json`
- `map`
  - component: `fe/src/components/predictions/AIMapPage.jsx`
  - dữ liệu chính: `spatial/full/*.geojson`, `spatial/index.json`
  - overlay dân số: backend `/api/population/density`
- `location`
  - component: `fe/src/components/LocationModule/LocationModule.jsx`
  - dữ liệu chính: backend `/api/analyze-zone` và `/api/ai-insight`

### 3.4 Luồng dữ liệu frontend

```text
App.jsx
└─ loadDashboardBundle()
   └─ fe/src/data/dashboardBundle.js
      └─ fetch /dashboard_data_bundle.json

AppShell
├─ OverviewTab
├─ AIMapPage
└─ LocationModule
   ├─ MapPanel
   ├─ StatsPanel
   └─ InsightPanel
```

### 3.5 Các module frontend quan trọng

- `fe/src/data/dashboardBundle.js`
  - fetch bundle và chuẩn hóa shape cho UI
- `fe/src/data/appContent.js`
  - nav items, view titles, disclaimers
- `fe/src/data/administrativeData.js`
  - city, district, ward metadata cho map UI
- `fe/src/services/mapService.js`
  - load và normalize spatial GeoJSON
- `fe/src/services/populationService.js`
  - gọi API population density, có in-memory cache
- `fe/src/services/locationApiService.js`
  - POST `/api/analyze-zone`
- `fe/src/services/aiInsightService.js`
  - POST `/api/ai-insight`
- `fe/src/services/insightService.js`
  - rule-based insights trong frontend
- `fe/src/hooks/useLocationIntelligence.js`
  - orchestration state cho màn hình Location
- `fe/src/components/GoongMap/GoongMap.jsx`
  - wrapper quanh Goong JS
- `fe/src/components/GoongMap/goongMapUtils.js`
  - helper thao tác layer/source

### 3.6 Vite static serving

`fe/vite.config.js` dùng:

```js
publicDir: path.resolve(__dirname, '../data')
```

Điều này làm `data/` trở thành canonical public asset directory của frontend. Các URL đúng:

- `/dashboard_data_bundle.json`
- `/spatial/index.json`
- `/spatial/full/HCM.geojson`
- `/boundaries/tp-hcm.geojson`

Không dùng `/data/...`.

### 3.7 Chạy frontend

```powershell
cd fe
npm install
npm.cmd run dev
```

Lưu ý thực tế trong workspace Windows này: `npm.cmd` ổn định hơn `npm` trong PowerShell vì tránh vấn đề `npm.ps1`.

## 4. Backend

### 4.1 Stack

- FastAPI
- Uvicorn
- Pydantic
- Pandas
- GeoPandas
- Shapely
- OpenAI Python SDK
- python-dotenv

### 4.2 Entry point

- `be/backend/main.py`

Khởi tạo:

- load `.env` từ `be/.env`
- bật CORS cho `http://localhost:5173` và `http://localhost:3000`
- preload cafe data và POI data ở startup
- mount 2 router: `analysis` và `population`

### 4.3 API hiện có

#### `GET /health`

Trả:

```json
{
  "status": "ok",
  "service": "SmartSite Location Intelligence API"
}
```

#### `POST /api/analyze-zone`

Request model:

```json
{
  "min_lat": 16.02,
  "max_lat": 16.07,
  "min_lng": 108.18,
  "max_lng": 108.23
}
```

Response model: `ZoneAnalysis`

Các field chính:

- `bbox`
- `cafe_stats`
  - `total_cafes`
  - `avg_rating`
  - `avg_sentiment`
  - `avg_reviews`
  - `high_rated_count`
  - `review_density`
- `poi_breakdown`
- `total_poi`
- `competition_level`
- `dominant_poi_category`

#### `POST /api/ai-insight`

Request:

```json
{
  "zone_analysis": { "...": "ZoneAnalysis object" }
}
```

Response model: `AiInsightResponse`

Các field chính:

- `headline`
- `bullets`
- `verdict`
- `benchmark`
- `model_used`
- `fallback_reason`
- `language`

#### `GET /api/population/density?city=hcm|hn|danang`

Đọc trực tiếp GeoJSON trong `data/population/` và trả nguyên payload.

### 4.4 Các service backend quan trọng

- `be/backend/services/DataLoaderService.py`
  - load point-level cafe CSV và POI GeoJSON
  - dùng `lru_cache`
- `be/backend/services/LocationApiService.py`
  - filter data theo bbox
  - aggregate cafe stats và POI breakdown
- `be/backend/services/AiInsightService.py`
  - compute benchmark toàn bộ dataset
  - thử gọi LLM OpenAI-compatible
  - fallback sang rule-based insight nếu lỗi hoặc thiếu key

### 4.5 Data sources backend đọc trực tiếp

Backend không dùng `web_dashboard/data/` cho zone analysis. Nó đọc từ repo root SmartSite:

- `Step 2_ Data Processing/Coffee_Tea_Data_GGMap.csv`
- `Step 2_ Data Processing/Coffee_Tea_Data_POI.geojson`

Path này được resolve trong `DataLoaderService.py` từ vị trí file service.

### 4.6 Chạy backend

Trong workspace hiện tại, lệnh an toàn là:

```powershell
cd be
d:\Ki2_nam3\KhaiPhaDuLieuWeb\SmartSite\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

Không nên dựa vào `python` hay `py` nếu PATH chưa được cấu hình.

## 5. Data directory

### 5.1 File runtime còn giữ

```text
data/
├─ dashboard_data_bundle.json
├─ grid_predictions.csv
├─ grid_summary.csv
├─ kpi_summary.json
├─ model_runs.csv
├─ favicon.svg
├─ boundaries/
│  ├─ da-nang.geojson
│  ├─ ha-noi.geojson
│  └─ tp-hcm.geojson
├─ population/
│  ├─ danang_population.geojson
│  ├─ hcm_population.geojson
│  └─ hn_population.geojson
└─ spatial/
   ├─ index.json
   ├─ full/
   └─ hotspots/
```

### 5.2 Vai trò từng nhóm file

- `dashboard_data_bundle.json`
  - snapshot tổng hợp mà tab Overview đọc
- `grid_predictions.csv`, `grid_summary.csv`, `kpi_summary.json`, `model_runs.csv`
  - source artifacts được bundle tham chiếu trong metadata
- `spatial/index.json`
  - manifest cho lớp không gian
- `spatial/full/*.geojson`
  - lớp grid đầy đủ cho AIMapPage
- `spatial/hotspots/*.geojson`
  - layer gọn hơn cho overlay nếu cần
- `boundaries/*.geojson`
  - ranh giới city-level cho frontend
- `population/*_population.geojson`
  - dữ liệu dân số cấp ward do backend serve

### 5.3 Các file đã dọn khỏi `data/`

Các file sau không còn được frontend/backend dùng trực tiếp và đã bị xóa để repo gọn hơn:

- `dashboard_data_spec.json`
- `grid_predictions.json`
- `grid_map.geojson`
- `city_bounds.json`
- `vn.json`
- `icons.svg`
- `population/index.json`
- `README.md`
- `README_spatial.md`
- ảnh trong `data/eda/`

## 6. Environment variables

### 6.1 Frontend

`fe/.env.example`

```ini
VITE_GOONG_MAPTILES_KEY=your_goong_maptiles_key_here
```

Nếu không có key, `GoongMap.jsx` sẽ render fallback UI thay vì bản đồ thật.

### 6.2 Backend

`be/.env.example`

```ini
LLM_API_KEY=
LLM_API_BASE=
LLM_MODEL=gpt-4o-mini

OPENAI_API_KEY=
OPENAI_MODEL=
```

Quy ước:

- ưu tiên `LLM_*`
- `OPENAI_*` chỉ là legacy fallback

Provider hỗ trợ là mọi OpenAI-compatible endpoint mà package `openai` gọi được.

## 7. Quy tắc mô tả sản phẩm

Nên dùng:

- observed market signals
- relative opportunity
- exploratory ranking
- site-selection support
- benchmark-assisted insight

Không nên dùng:

- guaranteed best location
- revenue forecast
- business success prediction
- ground-truth demand score

Một câu disclaimer an toàn:

> SmartSite hiển thị các tín hiệu thị trường quan sát được và xếp hạng tương đối có hỗ trợ mô hình; đây không phải dự báo doanh thu hay khuyến nghị địa điểm chắc chắn.

## 8. Lệnh kiểm tra

### Frontend

```powershell
cd fe
npm.cmd run lint
npm.cmd run build
```

### Backend

```powershell
cd be
d:\Ki2_nam3\KhaiPhaDuLieuWeb\SmartSite\.venv\Scripts\python.exe -m uvicorn backend.main:app --port 8000
```

### Health check

```powershell
curl http://localhost:8000/health
```

## 9. Ghi chú bảo trì

- Nếu đổi schema `ZoneAnalysis` hoặc `AiInsightResponse`, phải sửa đồng thời:
  - `be/backend/models/schemas.py`
  - `fe/src/services/locationApiService.js`
  - `fe/src/services/aiInsightService.js`
  - các component Location đang đọc các field này
- Nếu đổi shape bundle dashboard, phải sửa:
  - `fe/src/data/dashboardBundle.js`
  - dữ liệu export upstream nếu có
- Nếu đổi tên file trong `data/spatial/` hoặc `data/population/`, phải sửa:
  - `fe/src/services/mapService.js`
  - `be/backend/routers/population.py`

## 10. Tóm tắt quyết định tài liệu

Repo hiện giữ 2 file tài liệu:

- `README.md`
  - ngắn, dành cho clone-run-maintain nhanh
- `PROJECT_WIKI.md`
  - chi tiết hơn về kiến trúc, data contract, và vận hành

Không gộp thành một file duy nhất vì repo này vẫn có đủ phần vận hành nội bộ để cần một wiki dài hơn README.
