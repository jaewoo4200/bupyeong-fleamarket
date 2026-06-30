import type { CategoryKey } from "@/lib/venue/categories";
import type { SeatPalette } from "@/lib/venue/venue-layout";

export type Weekday = "금" | "토" | "일";
export type EventType = "fleamarket" | "bbday";
export type EventStatus = "draft" | "lottery_open" | "lottery_closed" | "completed";
export type SeatType = "table" | "wood";

/** 운영자가 임의로 추가한 좌석 (지도 탭으로 생성) */
export type CustomSeat = {
  code: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  band: 1 | 2;
  palette: SeatPalette;
};

export type EventConfig = {
  id: string;
  date: string; // YYYY-MM-DD
  weekday: Weekday;
  eventType: EventType;
  name: string;
  status: EventStatus;
  /** 매대/테이블/의자 개수 (당일 가변) */
  countWood: number;
  countTable: number;
  countChair: number;
  /** 오늘 나무매대로 운영되는 좌석 코드 */
  woodSeatCodes: string[];
  /** 오늘 사용하지 않는(비활성) 좌석 코드 */
  inactiveSeatCodes: string[];
  /** 2매대 결합석(예: "8, 8-1")을 2개 단독석으로 분리해 추첨할 좌석 코드 */
  splitSeatCodes: string[];
  /** 운영자가 임의로 추가한 좌석 */
  customSeats: CustomSeat[];
};

export type Seller = {
  id: string;
  eventId: string;
  seq: number;
  business: string;
  name: string;
  productText: string;
  categoryKey: CategoryKey;
  /** 2매대(붙임석) 사용 셀러 — 붙임석만 추첨됨 */
  twoTables: boolean;
  phone?: string;
  assignedSeat?: string | null;
  drawnAt?: string | null;
};

export type DrawAction = "draw" | "reassign" | "swap" | "deactivate" | "reset";

export type DrawLog = {
  id: string;
  eventId: string;
  sellerId: string | null;
  sellerName: string;
  seatCode: string | null;
  at: string;
  action: DrawAction;
  note?: string;
};

/** 운영 메모 (셀러 요청·시설 이슈 등) */
export type Note = {
  id: string;
  eventId: string;
  text: string;
  tag?: "chair" | "table" | "facility" | "etc";
  done: boolean;
  createdAt: string;
};

/** 버스킹(공연) 일정 — 행사일이 아닌 날짜 기준 전역 데이터(붙여넣기 가져오기 + 편집) */
export type BuskingEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  title: string;
  performer?: string;
  contact?: string;
};

/** 근무자 — 날짜별 1명 1행(붙여넣기 가져오기 + 편집) */
export type StaffEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  role?: string;
};

export type AppData = {
  events: EventConfig[];
  sellers: Seller[];
  draws: DrawLog[];
  notes: Note[];
  /** 버스킹/근무자 일정(전역, 날짜 기준) */
  busking: BuskingEntry[];
  staff: StaffEntry[];
  currentEventId?: string;
};

export type DrawResult = {
  seatCode: string;
};

/** SeatMap 렌더용 좌석 상태 */
export type SeatCellState = {
  status: "empty" | "assigned" | "inactive";
  type: SeatType;
  occupant?: { name: string; business: string; categoryKey: CategoryKey };
};

export type SellerImportRow = {
  seq: number;
  business: string;
  name: string;
  productText: string;
  phone?: string;
  twoTables?: boolean;
};

/** 로컬/Supabase 어댑터 공통 인터페이스 (화면은 이것만 의존) */
export interface Store {
  subscribe(cb: () => void): () => void;
  getSnapshot(): AppData;
  getServerSnapshot(): AppData;
  setCurrentEvent(id: string): void;
  createEvent(input: { date: string; weekday: Weekday; eventType: EventType; name?: string }): void;
  updateEvent(id: string, patch: Partial<EventConfig>): void;
  importSellers(eventId: string, rows: SellerImportRow[]): void;
  /** 엑셀에서 인식한 날짜로 행사를 찾거나(없으면 생성) 명단을 일괄 적용하고 그 행사를 현재로 선택 */
  importSellersForDate(date: string, rows: SellerImportRow[]): void;
  drawSeat(eventId: string, sellerId: string): Promise<DrawResult>;
  reassignSeat(eventId: string, sellerId: string, seatCode: string): void;
  clearAssignment(eventId: string, sellerId: string): void;
  setSellerTwoTables(sellerId: string, value: boolean): void;
  /** 현장 명단 수정: 셀러 1명 추가 */
  addSeller(eventId: string, row: SellerImportRow): void;
  /** 셀러 정보 수정(상호/이름/취급상품/연락처/번호/2매대). 취급상품 변경 시 카테고리 자동 갱신 */
  updateSeller(
    sellerId: string,
    patch: Partial<Pick<Seller, "business" | "name" | "productText" | "phone" | "seq" | "twoTables">>,
  ): void;
  /** 셀러 삭제 (배정 좌석도 함께 비워짐) */
  removeSeller(sellerId: string): void;
  setSeatActive(eventId: string, seatCode: string, active: boolean): void;
  /** 여러 좌석을 한 번에 활성/비활성 (일괄 제외) */
  setSeatsActive(eventId: string, codes: string[], active: boolean): void;
  setSeatType(eventId: string, seatCode: string, type: SeatType): void;
  setSeatSplit(eventId: string, comboCode: string, split: boolean): void;
  addCustomSeat(eventId: string, seat: CustomSeat): void;
  removeCustomSeat(eventId: string, code: string): void;
  resetDraws(eventId: string): void;
  addNote(eventId: string, text: string, tag?: Note["tag"]): void;
  toggleNote(id: string): void;
  removeNote(id: string): void;
  /** 버스킹 일정 전체 교체(가져오기/편집 결과를 그대로 반영) */
  setBuskingEntries(entries: BuskingEntry[]): void;
  /** 근무자 일정 전체 교체 */
  setStaffEntries(entries: StaffEntry[]): void;
  resetAll(): void;
}
