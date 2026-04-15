# SmartSite Web Dashboard

SmartSite là dashboard nghiên cứu cho bài toán phân tích thị trường và chọn vị trí mở quán cà phê tại Hà Nội, Đà Nẵng, và TP.HCM.

Repo này gồm 3 phần chính:

- `fe/`: frontend React 19 + Vite
- `be/`: backend FastAPI cho phân tích bounding box và AI insight
- `data/`: runtime assets được Vite publish trực tiếp

Tài liệu chi tiết hơn về kiến trúc và dữ liệu nằm ở `PROJECT_WIKI.md`.

## Chức năng hiện có

- `Overview`: tổng quan KPI, city coverage, pipeline summary
- `Map`: bản đồ Goong Maps với lớp grid opportunity và population density
- `Location`: vẽ vùng chọn trên bản đồ để phân tích cafe, POI, competition, rồi sinh insight

## Cấu trúc thư mục

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
│  ├─ boundaries/
│  ├─ population/
│  └─ spatial/
├─ fe/
│  ├─ .env.example
│  ├─ package.json
│  ├─ vite.config.js
│  └─ src/
└─ be/
   ├─ .env.example
   └─ backend/
```

## Yêu cầu môi trường

- Node.js 20+
- npm 10+
- Python environment có đủ dependency trong `be/backend/requirements.txt`
- Goong Maps API key nếu muốn dùng bản đồ đầy đủ

Trong workspace hiện tại, backend nên chạy bằng Python ở:

```powershell
d:\Ki2_nam3\KhaiPhaDuLieuWeb\SmartSite\.venv\Scripts\python.exe
```

## Chạy local

### 1. Frontend

Tạo `fe/.env` từ `fe/.env.example`:

```ini
VITE_GOONG_MAPTILES_KEY=your_goong_maptiles_key_here
```

Cài và chạy:

```powershell
cd fe
npm install
npm.cmd run dev
```

Frontend mặc định chạy ở `http://localhost:5173`.

### 2. Backend

Tạo `be/.env` từ `be/.env.example` nếu muốn gọi LLM thật.

Ví dụ:

```ini
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

Chạy API:

```powershell
cd be
d:\Ki2_nam3\KhaiPhaDuLieuWeb\SmartSite\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

Backend mặc định chạy ở `http://localhost:8000`.

## Runtime data

`fe/vite.config.js` dùng:

```js
publicDir: path.resolve(__dirname, '../data')
```

Nghĩa là frontend fetch trực tiếp từ root public path, ví dụ:

- `/dashboard_data_bundle.json`
- `/spatial/index.json`
- `/spatial/full/DaNang.geojson`
- `/boundaries/ha-noi.geojson`

Không thêm tiền tố `/data/`.

## API hiện có

- `GET /health`
- `POST /api/analyze-zone`
- `POST /api/ai-insight`
- `GET /api/population/density?city=hcm|hn|danang`

## Quality checks

```powershell
cd fe
npm.cmd run lint
npm.cmd run build
```

## Lưu ý vận hành


- Nếu không cấu hình `LLM_API_KEY`, backend vẫn chạy và fallback sang rule-based insight.

