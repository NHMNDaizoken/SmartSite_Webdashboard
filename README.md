# SmartSite Web Dashboard

SmartSite là dashboard demo cho bài toán phân tích thị trường mở quán cafe. Project gồm:

- `fe/`: frontend React 19 + Vite
- `be/`: backend FastAPI cho phân tích bounding box và AI insight
- `data/`: static runtime assets được Vite publish trực tiếp
- `PROJECT_WIKI.md`: tài liệu nội bộ chi tiết hơn về kiến trúc, provenance và pipeline

## Tính năng chính

- `Overview`: tổng quan dữ liệu, KPI, provenance và prediction summary
- `Map`: bản đồ Goong Maps hiển thị hotspot/grid theo thành phố
- `Location`: vẽ vùng chọn để phân tích cafe, POI và sinh AI insight

## Cấu trúc thư mục

```text
web_dashboard/
├─ .gitignore
├─ README.md
├─ PROJECT_WIKI.md
├─ data/
│  ├─ dashboard_data_bundle.json
│  ├─ dashboard_data_spec.json
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
- Python 3.11+ khuyến nghị
- Goong Maps API key nếu muốn dùng tab bản đồ

## Cách chạy local

### 1. Frontend

Tạo `fe/.env` từ file mẫu:

```ini
VITE_GOONG_MAPTILES_KEY=your_goong_maptiles_key_here
```

Chạy frontend:

```powershell
cd ai_workspace/web_dashboard/fe
npm install
npm run dev
```

Frontend mặc định chạy ở `http://localhost:5173`.

### 2. Backend

Tạo `be/.env` từ file mẫu nếu muốn dùng AI Insight qua LLM.

Ví dụ OpenAI:

```ini
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

Ví dụ Groq:

```ini
LLM_API_KEY=gsk_...
LLM_API_BASE=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.1-70b-versatile
```

Cài dependency và chạy API:

```powershell
cd ai_workspace/web_dashboard/be
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

Backend mặc định chạy ở `http://localhost:8000`. Frontend đã cấu hình proxy `/api` sang cổng này trong `fe/vite.config.js`.

## Static data

`fe/vite.config.js` đang dùng:

```js
publicDir: path.resolve(__dirname, '../data')
```

Điều đó có nghĩa là dữ liệu runtime canonical nằm ở `data/`, không phải `public/`. Khi fetch từ frontend, dùng URL root-public như:

- `/dashboard_data_bundle.json`
- `/spatial/index.json`
- `/spatial/hotspots/DaNang.geojson`
- `/boundaries/ha-noi.geojson`

Không thêm tiền tố `/data/`.

## API hiện có

- `GET /health`: health check
- `POST /api/analyze-zone`: phân tích vùng chọn theo bounding box
- `POST /api/ai-insight`: sinh insight tiếng Việt từ zone analysis
- `GET /api/population/density?city=hcm|hn|danang`: lấy GeoJSON mật độ dân số

## Quality checks

```powershell
cd ai_workspace/web_dashboard/fe
npm run lint
npm run build
```

## Dọn repo trước khi upload GitHub

Project đã được chuẩn hóa để không đưa lên GitHub các file local/build sau:

- `fe/node_modules/`
- `fe/dist/`
- `fe/.vite/`
- `be/.env`, `fe/.env`
- `be/backend/**/__pycache__/`

Nếu cần refresh data bundle từ pipeline upstream, xem script ở thư mục repo root:

- `scripts/export_dashboard_artifacts.py`
- `scripts/build_verified_artifacts.py`
- `scripts/export_spatial_geojson.py`
- `scripts/sync_prediction_bundle.mjs`

## Ghi chú

- Goong Maps key là bắt buộc cho trải nghiệm bản đồ đầy đủ.
- LLM key là tùy chọn. Nếu không cấu hình, backend sẽ fallback sang rule-based insight.
- `PROJECT_WIKI.md` giữ vai trò tài liệu vận hành nội bộ; `README.md` này ưu tiên clone-run-upload cho GitHub.
