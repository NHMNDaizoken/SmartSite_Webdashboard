/**
 * Administrative Data - Mock boundary data for Hà Nội, Đà Nẵng, Hồ Chí Minh.
 * 
 * Structure designed for easy replacement with real GeoJSON data later.
 * Polygons are approximate bounding boxes of major districts.
 * 
 * To upgrade: download district-level GeoJSON from GADM/HDX and convert
 * to this format, or load GeoJSON files directly in boundaryService.
 */

// Helper to create a bbox polygon from center + deltas
function bboxPoly(centerLat, centerLng, dLat, dLng) {
  const s = centerLat - dLat, n = centerLat + dLat;
  const w = centerLng - dLng, e = centerLng + dLng;
  return [[w, s], [e, s], [e, n], [w, n], [w, s]];
}

export const CITIES = [
  { code: 'DaNang', name: 'Đà Nẵng', center: [16.0544, 108.2022] },
  { code: 'HCM', name: 'TP. Hồ Chí Minh', center: [10.8231, 106.6297] },
  { code: 'HaNoi', name: 'Hà Nội', center: [21.0285, 105.8542] },
];

const DISTRICTS = {
  DaNang: [
    { code: 'hai-chau', name: 'Hải Châu', center: [16.0472, 108.2208], polygon: bboxPoly(16.0472, 108.2208, 0.015, 0.018) },
    { code: 'thanh-khe', name: 'Thanh Khê', center: [16.0677, 108.1886], polygon: bboxPoly(16.0677, 108.1886, 0.012, 0.016) },
    { code: 'son-tra', name: 'Sơn Trà', center: [16.0870, 108.2470], polygon: bboxPoly(16.0870, 108.2470, 0.020, 0.022) },
    { code: 'ngu-hanh-son', name: 'Ngũ Hành Sơn', center: [16.0100, 108.2550], polygon: bboxPoly(16.0100, 108.2550, 0.018, 0.020) },
    { code: 'lien-chieu', name: 'Liên Chiểu', center: [16.0820, 108.1500], polygon: bboxPoly(16.0820, 108.1500, 0.025, 0.022) },
    { code: 'cam-le', name: 'Cẩm Lệ', center: [16.0200, 108.2000], polygon: bboxPoly(16.0200, 108.2000, 0.015, 0.018) },
    { code: 'hoa-vang', name: 'Hòa Vang', center: [15.9800, 108.1200], polygon: bboxPoly(15.9800, 108.1200, 0.060, 0.060) },
  ],
  HCM: [
    { code: 'quan-1', name: 'Quận 1', center: [10.7769, 106.7009], polygon: bboxPoly(10.7769, 106.7009, 0.010, 0.012) },
    { code: 'quan-3', name: 'Quận 3', center: [10.7830, 106.6860], polygon: bboxPoly(10.7830, 106.6860, 0.010, 0.012) },
    { code: 'quan-5', name: 'Quận 5', center: [10.7540, 106.6630], polygon: bboxPoly(10.7540, 106.6630, 0.010, 0.013) },
    { code: 'quan-7', name: 'Quận 7', center: [10.7340, 106.7220], polygon: bboxPoly(10.7340, 106.7220, 0.020, 0.022) },
    { code: 'quan-10', name: 'Quận 10', center: [10.7740, 106.6680], polygon: bboxPoly(10.7740, 106.6680, 0.010, 0.012) },
    { code: 'binh-thanh', name: 'Bình Thạnh', center: [10.8105, 106.7091], polygon: bboxPoly(10.8105, 106.7091, 0.018, 0.016) },
    { code: 'phu-nhuan', name: 'Phú Nhuận', center: [10.8000, 106.6800], polygon: bboxPoly(10.8000, 106.6800, 0.008, 0.010) },
    { code: 'tan-binh', name: 'Tân Bình', center: [10.8020, 106.6520], polygon: bboxPoly(10.8020, 106.6520, 0.015, 0.016) },
    { code: 'go-vap', name: 'Gò Vấp', center: [10.8385, 106.6504], polygon: bboxPoly(10.8385, 106.6504, 0.015, 0.015) },
    { code: 'thu-duc', name: 'TP. Thủ Đức', center: [10.8560, 106.7580], polygon: bboxPoly(10.8560, 106.7580, 0.040, 0.035) },
    { code: 'binh-tan', name: 'Bình Tân', center: [10.7650, 106.6030], polygon: bboxPoly(10.7650, 106.6030, 0.020, 0.020) },
    { code: 'tan-phu', name: 'Tân Phú', center: [10.7900, 106.6280], polygon: bboxPoly(10.7900, 106.6280, 0.012, 0.014) },
  ],
  HaNoi: [
    { code: 'hoan-kiem', name: 'Hoàn Kiếm', center: [21.0285, 105.8542], polygon: bboxPoly(21.0285, 105.8542, 0.008, 0.010) },
    { code: 'ba-dinh', name: 'Ba Đình', center: [21.0380, 105.8200], polygon: bboxPoly(21.0380, 105.8200, 0.012, 0.014) },
    { code: 'dong-da', name: 'Đống Đa', center: [21.0160, 105.8300], polygon: bboxPoly(21.0160, 105.8300, 0.012, 0.013) },
    { code: 'hai-ba-trung', name: 'Hai Bà Trưng', center: [21.0060, 105.8580], polygon: bboxPoly(21.0060, 105.8580, 0.012, 0.012) },
    { code: 'cau-giay', name: 'Cầu Giấy', center: [21.0285, 105.7900], polygon: bboxPoly(21.0285, 105.7900, 0.014, 0.015) },
    { code: 'thanh-xuan', name: 'Thanh Xuân', center: [20.9930, 105.8180], polygon: bboxPoly(20.9930, 105.8180, 0.012, 0.014) },
    { code: 'tay-ho', name: 'Tây Hồ', center: [21.0680, 105.8200], polygon: bboxPoly(21.0680, 105.8200, 0.018, 0.016) },
    { code: 'long-bien', name: 'Long Biên', center: [21.0450, 105.8900], polygon: bboxPoly(21.0450, 105.8900, 0.022, 0.022) },
    { code: 'ha-dong', name: 'Hà Đông', center: [20.9720, 105.7800], polygon: bboxPoly(20.9720, 105.7800, 0.020, 0.020) },
    { code: 'nam-tu-liem', name: 'Nam Từ Liêm', center: [21.0180, 105.7600], polygon: bboxPoly(21.0180, 105.7600, 0.015, 0.016) },
    { code: 'hoang-mai', name: 'Hoàng Mai', center: [20.9800, 105.8600], polygon: bboxPoly(20.9800, 105.8600, 0.018, 0.016) },
  ],
};

// Ward data (sample wards for major districts)
const WARDS = {
  DaNang: {
    'hai-chau': [
      { code: 'hai-chau-1', name: 'Hải Châu 1', center: [16.0550, 108.2200], polygon: bboxPoly(16.0550, 108.2200, 0.005, 0.006) },
      { code: 'hai-chau-2', name: 'Hải Châu 2', center: [16.0480, 108.2250], polygon: bboxPoly(16.0480, 108.2250, 0.005, 0.006) },
      { code: 'thach-thang', name: 'Thạch Thang', center: [16.0600, 108.2180], polygon: bboxPoly(16.0600, 108.2180, 0.004, 0.005) },
      { code: 'thanh-binh', name: 'Thanh Bình', center: [16.0520, 108.2100], polygon: bboxPoly(16.0520, 108.2100, 0.005, 0.006) },
      { code: 'phuoc-ninh', name: 'Phước Ninh', center: [16.0440, 108.2150], polygon: bboxPoly(16.0440, 108.2150, 0.005, 0.005) },
    ],
    'thanh-khe': [
      { code: 'tam-thuan', name: 'Tam Thuận', center: [16.0620, 108.1920], polygon: bboxPoly(16.0620, 108.1920, 0.004, 0.005) },
      { code: 'thanh-khe-dong', name: 'Thanh Khê Đông', center: [16.0710, 108.1850], polygon: bboxPoly(16.0710, 108.1850, 0.005, 0.006) },
      { code: 'chinh-gian', name: 'Chính Gián', center: [16.0660, 108.1950], polygon: bboxPoly(16.0660, 108.1950, 0.004, 0.005) },
    ],
    'son-tra': [
      { code: 'an-hai-bac', name: 'An Hải Bắc', center: [16.0820, 108.2300], polygon: bboxPoly(16.0820, 108.2300, 0.006, 0.007) },
      { code: 'man-thai', name: 'Mân Thái', center: [16.0900, 108.2380], polygon: bboxPoly(16.0900, 108.2380, 0.005, 0.006) },
      { code: 'phuoc-my', name: 'Phước Mỹ', center: [16.0750, 108.2500], polygon: bboxPoly(16.0750, 108.2500, 0.006, 0.008) },
    ],
  },
  HCM: {
    'quan-1': [
      { code: 'ben-nghe', name: 'Bến Nghé', center: [10.7800, 106.7040], polygon: bboxPoly(10.7800, 106.7040, 0.004, 0.005) },
      { code: 'ben-thanh', name: 'Bến Thành', center: [10.7720, 106.6980], polygon: bboxPoly(10.7720, 106.6980, 0.003, 0.004) },
      { code: 'da-kao', name: 'Đa Kao', center: [10.7880, 106.7000], polygon: bboxPoly(10.7880, 106.7000, 0.004, 0.005) },
      { code: 'nguyen-thai-binh', name: 'Nguyễn Thái Bình', center: [10.7700, 106.6930], polygon: bboxPoly(10.7700, 106.6930, 0.003, 0.004) },
    ],
    'quan-3': [
      { code: 'phuong-1-q3', name: 'Phường 1', center: [10.7880, 106.6900], polygon: bboxPoly(10.7880, 106.6900, 0.003, 0.004) },
      { code: 'phuong-5-q3', name: 'Phường 5', center: [10.7810, 106.6820], polygon: bboxPoly(10.7810, 106.6820, 0.004, 0.005) },
      { code: 'vo-thi-sau', name: 'Võ Thị Sáu', center: [10.7860, 106.6880], polygon: bboxPoly(10.7860, 106.6880, 0.003, 0.004) },
    ],
    'binh-thanh': [
      { code: 'phuong-1-bt', name: 'Phường 1', center: [10.8050, 106.7100], polygon: bboxPoly(10.8050, 106.7100, 0.005, 0.005) },
      { code: 'phuong-2-bt', name: 'Phường 2', center: [10.8000, 106.7050], polygon: bboxPoly(10.8000, 106.7050, 0.004, 0.005) },
      { code: 'phuong-25-bt', name: 'Phường 25', center: [10.8150, 106.7150], polygon: bboxPoly(10.8150, 106.7150, 0.005, 0.006) },
    ],
    'thu-duc': [
      { code: 'linh-trung', name: 'Linh Trung', center: [10.8650, 106.7700], polygon: bboxPoly(10.8650, 106.7700, 0.008, 0.008) },
      { code: 'binh-tho', name: 'Bình Thọ', center: [10.8480, 106.7600], polygon: bboxPoly(10.8480, 106.7600, 0.006, 0.007) },
      { code: 'thu-thiem', name: 'Thủ Thiêm', center: [10.7900, 106.7300], polygon: bboxPoly(10.7900, 106.7300, 0.008, 0.010) },
    ],
  },
  HaNoi: {
    'hoan-kiem': [
      { code: 'hang-bac', name: 'Hàng Bạc', center: [21.0330, 105.8530], polygon: bboxPoly(21.0330, 105.8530, 0.002, 0.003) },
      { code: 'hang-dao', name: 'Hàng Đào', center: [21.0350, 105.8500], polygon: bboxPoly(21.0350, 105.8500, 0.002, 0.002) },
      { code: 'hang-gai', name: 'Hàng Gai', center: [21.0310, 105.8490], polygon: bboxPoly(21.0310, 105.8490, 0.002, 0.003) },
      { code: 'trang-tien', name: 'Tràng Tiền', center: [21.0250, 105.8560], polygon: bboxPoly(21.0250, 105.8560, 0.003, 0.004) },
    ],
    'ba-dinh': [
      { code: 'phuc-xa', name: 'Phúc Xá', center: [21.0450, 105.8450], polygon: bboxPoly(21.0450, 105.8450, 0.004, 0.005) },
      { code: 'truc-bach', name: 'Trúc Bạch', center: [21.0420, 105.8350], polygon: bboxPoly(21.0420, 105.8350, 0.004, 0.005) },
      { code: 'cong-vi', name: 'Cống Vị', center: [21.0300, 105.8150], polygon: bboxPoly(21.0300, 105.8150, 0.005, 0.005) },
    ],
    'dong-da': [
      { code: 'cat-linh', name: 'Cát Linh', center: [21.0250, 105.8320], polygon: bboxPoly(21.0250, 105.8320, 0.003, 0.004) },
      { code: 'lang-thuong', name: 'Láng Thượng', center: [21.0180, 105.8200], polygon: bboxPoly(21.0180, 105.8200, 0.004, 0.005) },
      { code: 'o-cho-dua', name: 'Ô Chợ Dừa', center: [21.0200, 105.8350], polygon: bboxPoly(21.0200, 105.8350, 0.003, 0.004) },
    ],
    'cau-giay': [
      { code: 'dich-vong', name: 'Dịch Vọng', center: [21.0320, 105.7900], polygon: bboxPoly(21.0320, 105.7900, 0.005, 0.006) },
      { code: 'nghia-do', name: 'Nghĩa Đô', center: [21.0400, 105.7950], polygon: bboxPoly(21.0400, 105.7950, 0.005, 0.005) },
      { code: 'mai-dich', name: 'Mai Dịch', center: [21.0350, 105.7800], polygon: bboxPoly(21.0350, 105.7800, 0.005, 0.006) },
    ],
  },
};

// --- Lookup functions ---

export function getDistrictsByCity(cityCode) {
  return DISTRICTS[cityCode] || [];
}

export function getWardsByDistrict(cityCode, districtCode) {
  return WARDS[cityCode]?.[districtCode] || [];
}

export function getDistrictByCode(cityCode, districtCode) {
  return (DISTRICTS[cityCode] || []).find((d) => d.code === districtCode) || null;
}

export function getWardByCode(cityCode, districtCode, wardCode) {
  return (WARDS[cityCode]?.[districtCode] || []).find((w) => w.code === wardCode) || null;
}
