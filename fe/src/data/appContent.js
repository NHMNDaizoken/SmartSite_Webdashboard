// ─── Navigation ────────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { value: 'overview',    label: 'Tổng quan',          icon: '◈' },
  { value: 'map',         label: 'Bản đồ thị trường',  icon: '◉' },
  { value: 'location',    label: 'Phân tích vị trí',    icon: '◎' },
]

export const VIEW_TITLES = {
  overview:    'Tổng quan hệ thống',
  map:         'Bản đồ thị trường',
  location:    'Phân tích vị trí thông minh',
}

export const VIEW_SUBTITLES = {
  overview:    'Tổng quan dữ liệu · phạm vi phủ sóng · trạng thái hệ thống',
  map:         'Tín hiệu không gian theo ô lưới · chuyển đổi lớp · bản đồ nhiệt',
  location:    'Vẽ vùng trên bản đồ · truy vấn tín hiệu quán cà phê & POI · phân tích dựa trên quy tắc',
}


// ─── Map layer definitions ───────────────────────────────────────────────────
export const MAP_LAYERS = [
  { value: 'cafeCount',       label: 'Mật độ quán (quan sát)',        field: 'cafeCount',       badge: 'Quan sát',    palette: ['#f0fdf4','#16a34a','#052e16'] },
  { value: 'totalReviews',    label: 'Hoạt động đánh giá (quan sát)', field: 'totalReviews',    badge: 'Quan sát',    palette: ['#eff6ff','#2563eb','#1e1b4b'] },
  { value: 'avgRating',       label: 'Đánh giá trung bình (quan sát)', field: 'avgRating',      badge: 'Quan sát',    palette: ['#fefce8','#ca8a04','#431407'] },
  { value: 'avgSentiment',    label: 'Cảm xúc trung bình (quan sát)', field: 'avgSentiment',   badge: 'Quan sát',    palette: ['#fdf4ff','#9333ea','#2e1065'] },
  { value: 'ntlMean',         label: 'Cường độ ánh sáng đêm (NTL)',   field: 'ntlMean',         badge: 'Quan sát',    palette: ['#f0f9ff','#0284c7','#082f49'] },
  { value: 'poiDensity',      label: 'Mật độ POI',                    field: 'poiDensity',      badge: 'Quan sát',    palette: ['#fff7ed','#ea580c','#431407'] },
  { value: 'opportunityScore',label: 'Tiềm năng tương đối (ước tính)', field: 'opportunityScore', badge: 'Ước tính',   palette: ['#eff6ff','#6366f1','#1e1b4b'] },
]

// ─── Disclaimers ─────────────────────────────────────────────────────────────
export const DISCLAIMERS = {
  global:      'SmartSite hiển thị các tín hiệu thị trường quan sát được và xếp hạng tương đối có hỗ trợ mô hình. Đây không phải dự báo doanh thu hay khuyến nghị địa điểm chắc chắn.',
  map:         'Bản đồ nhiệt hiển thị dữ liệu tổng hợp theo ô lưới từ dữ liệu quan sát và đặc trưng không gian.',
  sentiment:   'Cảm xúc được trích xuất từ văn bản đánh giá và có thể phản ánh thiên lệch của nền tảng và mẫu dữ liệu.',
}
