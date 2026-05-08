# Engagement Feature — Business Logic
# Tính năng Tương tác — Nghiệp vụ

> Written / Viết: 2026-05-08  
> Scope / Phạm vi: Views · Likes · Comments · Shares · Bookmarks

---

## Table of Contents / Mục lục

1. [Views / Lượt xem](#1-views--lượt-xem)
2. [Likes / Lượt thích](#2-likes--lượt-thích)
3. [Comments / Bình luận](#3-comments--bình-luận)
4. [Shares / Chia sẻ](#4-shares--chia-sẻ)
5. [Bookmarks / Lưu bài viết](#5-bookmarks--lưu-bài-viết)
6. [Access Control / Phân quyền](#6-access-control--phân-quyền)
7. [Rate Limiting / Giới hạn tốc độ](#7-rate-limiting--giới-hạn-tốc-độ)
8. [Counter Consistency / Tính nhất quán bộ đếm](#8-counter-consistency--tính-nhất-quán-bộ-đếm)
9. [Moderation / Kiểm duyệt](#9-moderation--kiểm-duyệt)
10. [Notifications / Thông báo](#10-notifications--thông-báo)
11. [Analytics / Thống kê](#11-analytics--thống-kê)
12. [Edge Cases / Trường hợp ngoại lệ](#12-edge-cases--trường-hợp-ngoại-lệ)

---

## 1. Views / Lượt xem

### English

**What counts as a view**  
A view is recorded the first time a unique visitor reads an article within a 4-hour window. Repeated visits within the same window by the same person are ignored.

**Identity resolution**  
- Authenticated users are identified by their `user_id`.  
- Guest users are identified by a SHA-256 fingerprint derived from `IP address + User-Agent string`, truncated to 64 characters.

**When a view is recorded**  
A view is counted when the server processes a `GET /news/:slug` request and returns a successful `200` response. It is not counted on errors (404, 500, etc.).

**Deduplication rules**
- One logged-in user → maximum 1 view per article per 4 hours.
- One guest fingerprint → maximum 1 view per article per 4 hours.
- After 4 hours, a return visit by the same person counts as a new view.

**Counter update**  
The `articles.views` column is updated synchronously via a database trigger when a row is inserted into `article_views`. The counter is never recalculated from scratch; it is incremented/decremented by trigger only.

**Display**  
Views are shown publicly on every article card and article detail page. No login is required to see view counts.

---

### Tiếng Việt

**Thế nào là một lượt xem**  
Một lượt xem được ghi nhận khi một người truy cập duy nhất đọc bài viết lần đầu trong khung thời gian 4 giờ. Các lần truy cập lặp lại trong cùng khung giờ bởi cùng một người sẽ bị bỏ qua.

**Xác định danh tính**  
- Người dùng đã đăng nhập được xác định bằng `user_id`.  
- Người dùng ẩn danh được xác định bằng vân tay SHA-256 tính từ `địa chỉ IP + chuỗi User-Agent`, rút ngắn xuống 64 ký tự.

**Khi nào lượt xem được ghi nhận**  
Lượt xem được đếm khi máy chủ xử lý yêu cầu `GET /news/:slug` và trả về phản hồi `200` thành công. Không đếm khi gặp lỗi (404, 500, v.v.).

**Quy tắc chống trùng lặp**
- Một người dùng đã đăng nhập → tối đa 1 lượt xem trên một bài viết trong 4 giờ.
- Một vân tay khách → tối đa 1 lượt xem trên một bài viết trong 4 giờ.
- Sau 4 giờ, lượt truy cập trở lại của cùng người đó được tính là lượt xem mới.

**Cập nhật bộ đếm**  
Cột `articles.views` được cập nhật đồng bộ thông qua trigger cơ sở dữ liệu khi một hàng được chèn vào bảng `article_views`. Bộ đếm không bao giờ được tính lại từ đầu; nó chỉ được tăng/giảm bởi trigger.

**Hiển thị**  
Lượt xem hiển thị công khai trên mọi thẻ bài viết và trang chi tiết bài viết. Không cần đăng nhập để xem số lượt xem.

---

## 2. Likes / Lượt thích

### English

**Who can like**  
Only authenticated users can like an article. Guest users who click the like button are redirected to a login prompt.

**Toggle behaviour**  
Liking is a toggle: clicking Like on an already-liked article removes the like. The same endpoint `POST /news/:articleId/like` handles both operations.

**One like per user per article**  
The database enforces a composite primary key `(article_id, user_id)` on the `article_likes` table, making duplicate likes physically impossible.

**Optimistic UI**  
The frontend updates the like count and button state immediately (before the API responds) to feel instant. If the API call fails, the UI rolls back to the previous state automatically.

**Counter update**  
The `articles.like_count` column is maintained by a database trigger — incremented on INSERT, decremented on DELETE from `article_likes`. The counter cannot go below 0.

**Display**  
Total like count is public. Whether the current user has liked an article is only visible to that user (server returns `is_liked_by_me` only for authenticated requests).

**No cascading effects**  
Liking an article does not affect its visibility, sort order, or featured status — that is a separate editorial decision.

---

### Tiếng Việt

**Ai có thể thích**  
Chỉ người dùng đã đăng nhập mới có thể thích bài viết. Người dùng ẩn danh nhấn nút thích sẽ được chuyển đến màn hình đăng nhập.

**Hành vi bật/tắt**  
Thích là hành động bật/tắt: nhấn Thích trên bài viết đã thích sẽ bỏ thích. Cùng một endpoint `POST /news/:articleId/like` xử lý cả hai thao tác.

**Mỗi người dùng chỉ thích mỗi bài một lần**  
Cơ sở dữ liệu áp dụng khóa chính tổng hợp `(article_id, user_id)` trên bảng `article_likes`, khiến việc thích trùng lặp là không thể.

**Giao diện lạc quan**  
Frontend cập nhật số lượt thích và trạng thái nút ngay lập tức (trước khi API phản hồi) để cảm giác nhanh. Nếu API thất bại, giao diện tự động khôi phục về trạng thái trước đó.

**Cập nhật bộ đếm**  
Cột `articles.like_count` được duy trì bởi trigger cơ sở dữ liệu — tăng khi INSERT, giảm khi DELETE từ `article_likes`. Bộ đếm không thể xuống dưới 0.

**Hiển thị**  
Tổng số lượt thích là công khai. Việc người dùng hiện tại đã thích hay chưa chỉ hiển thị với chính họ (máy chủ trả về `is_liked_by_me` chỉ cho yêu cầu đã xác thực).

**Không có hiệu ứng lan rộng**  
Thích bài viết không ảnh hưởng đến khả năng hiển thị, thứ tự sắp xếp, hay trạng thái nổi bật — đó là quyết định biên tập riêng biệt.

---

## 3. Comments / Bình luận

### English

#### 3.1 Posting a comment

**Who can comment**  
Only authenticated users. Unauthenticated visitors see a "Log in to join the discussion" prompt instead of the input box.

**Body constraints**
- Minimum length: 1 character (after trimming whitespace).
- Maximum length: 2,000 characters.
- Allowed content: plain text only. HTML tags are stripped server-side before storage.
- No empty or whitespace-only comments are accepted.

**Thread structure**  
The system supports exactly **one level of nesting**:
- Top-level comments are direct replies to the article (`parent_id = null`).
- Replies are responses to a top-level comment (`parent_id = <comment_id>`).
- A reply cannot itself receive replies (the "Reply" button is hidden on replies). If a user attempts to reply to a reply via the API, the server rejects it with `400 Bad Request`.

**Sorting**  
- Top-level comments default to **newest first**. Users can switch to oldest first.
- Replies within a thread are always sorted **oldest first** (chronological thread order).

**Pagination**  
- Top-level comments are paginated at 20 per page.
- Replies for a comment are loaded on demand (all at once, no pagination) when the user clicks "Load N replies".

**Counter update**  
`articles.comment_count` is incremented on INSERT of a non-deleted comment and decremented when a comment is soft-deleted. It reflects visible (non-deleted) comments only.

---

#### 3.2 Editing a comment

**Who can edit**  
- Authors may edit their own comments **within 15 minutes** of posting.
- Admins may edit any comment at any time.

**Edit behaviour**
- The original body is replaced with the new body. No edit history is stored.
- The `is_edited` flag is set to `true` and `updated_at` is refreshed.
- The "(edited)" label is displayed publicly next to the timestamp.
- Editing does not reset the 15-minute window (the window is based on `created_at`).

---

#### 3.3 Deleting a comment

**Who can delete**
- Authors may delete their own comments at any time.
- Admins may delete any comment at any time.

**Soft vs. hard delete**
- **Regular users deleting their own comment**: soft delete — `is_deleted = true`, `body` replaced with `"[deleted]"`, `author` set to `null` in API responses. The comment row remains in the database to preserve thread structure (replies remain visible under the placeholder).
- **Admins deleting a comment**: hard delete — the row is physically removed. Any replies to that comment are also deleted (cascade).

**Counter behaviour**  
When a comment is soft-deleted, `comment_count` is decremented immediately. Hard deletes also decrement the counter via trigger (each deleted row fires the trigger).

---

#### 3.4 Liking a comment

**Who can like comments**  
Only authenticated users.

**Toggle behaviour**  
Same toggle pattern as article likes. `comment_likes` has a composite primary key `(comment_id, user_id)`.

**Optimistic UI**  
The like button state and count update immediately; rolled back on API failure.

---

### Tiếng Việt

#### 3.1 Đăng bình luận

**Ai có thể bình luận**  
Chỉ người dùng đã đăng nhập. Khách truy cập chưa đăng nhập thấy thông báo "Đăng nhập để tham gia thảo luận" thay vì ô nhập liệu.

**Ràng buộc nội dung**
- Độ dài tối thiểu: 1 ký tự (sau khi cắt khoảng trắng).
- Độ dài tối đa: 2.000 ký tự.
- Nội dung cho phép: chỉ văn bản thuần túy. Thẻ HTML bị loại bỏ ở máy chủ trước khi lưu.
- Không chấp nhận bình luận trống hoặc chỉ có khoảng trắng.

**Cấu trúc luồng thảo luận**  
Hệ thống hỗ trợ đúng **một cấp lồng nhau**:
- Bình luận cấp cao là trả lời trực tiếp cho bài viết (`parent_id = null`).
- Phản hồi là trả lời cho một bình luận cấp cao (`parent_id = <comment_id>`).
- Phản hồi không thể nhận thêm phản hồi (nút "Trả lời" bị ẩn trên các phản hồi). Nếu người dùng cố tình gọi API để trả lời một phản hồi, máy chủ từ chối với `400 Bad Request`.

**Sắp xếp**  
- Bình luận cấp cao mặc định theo **mới nhất trước**. Người dùng có thể đổi sang cũ nhất trước.
- Phản hồi trong một luồng luôn sắp xếp theo **cũ nhất trước** (thứ tự theo thời gian).

**Phân trang**  
- Bình luận cấp cao phân trang 20 bình luận/trang.
- Phản hồi cho một bình luận được tải theo yêu cầu (tất cả cùng lúc, không phân trang) khi người dùng nhấn "Xem N phản hồi".

**Cập nhật bộ đếm**  
`articles.comment_count` tăng khi INSERT một bình luận chưa xóa và giảm khi bình luận bị xóa mềm. Nó chỉ phản ánh các bình luận hiển thị (chưa bị xóa).

---

#### 3.2 Chỉnh sửa bình luận

**Ai có thể chỉnh sửa**  
- Tác giả có thể sửa bình luận của mình **trong vòng 15 phút** kể từ khi đăng.
- Quản trị viên có thể sửa bất kỳ bình luận nào bất cứ lúc nào.

**Hành vi chỉnh sửa**
- Nội dung gốc được thay thế bằng nội dung mới. Không lưu lịch sử chỉnh sửa.
- Cờ `is_edited` được đặt thành `true` và `updated_at` được làm mới.
- Nhãn "(đã sửa)" hiển thị công khai bên cạnh thời gian.
- Việc chỉnh sửa không đặt lại cửa sổ 15 phút (cửa sổ dựa trên `created_at`).

---

#### 3.3 Xóa bình luận

**Ai có thể xóa**
- Tác giả có thể xóa bình luận của mình bất cứ lúc nào.
- Quản trị viên có thể xóa bất kỳ bình luận nào bất cứ lúc nào.

**Xóa mềm vs. xóa cứng**
- **Người dùng thường xóa bình luận của mình**: xóa mềm — `is_deleted = true`, `body` được thay bằng `"[deleted]"`, `author` trả về `null` trong phản hồi API. Hàng dữ liệu vẫn còn trong database để giữ cấu trúc luồng (các phản hồi vẫn hiển thị dưới placeholder).
- **Quản trị viên xóa bình luận**: xóa cứng — hàng dữ liệu bị xóa vật lý. Mọi phản hồi của bình luận đó cũng bị xóa (cascade).

**Hành vi bộ đếm**  
Khi bình luận bị xóa mềm, `comment_count` giảm ngay lập tức. Xóa cứng cũng giảm bộ đếm qua trigger (mỗi hàng bị xóa kích hoạt trigger).

---

#### 3.4 Thích bình luận

**Ai có thể thích bình luận**  
Chỉ người dùng đã đăng nhập.

**Hành vi bật/tắt**  
Giống như thích bài viết. `comment_likes` có khóa chính tổng hợp `(comment_id, user_id)`.

**Giao diện lạc quan**  
Trạng thái nút và số lượt thích cập nhật ngay; khôi phục nếu API thất bại.

---

## 4. Shares / Chia sẻ

### English

**What is tracked**  
Every time a user clicks a platform button (Facebook, Zalo, X/Twitter, LinkedIn) or copies the article link, a share event is recorded in the `article_shares` table.

**Authentication not required**  
Shares are tracked for both logged-in and guest users. For guests, `user_id` is stored as `null`; only the platform and timestamp are recorded.

**Platform values**  
Accepted values: `facebook`, `zalo`, `twitter`, `linkedin`, `copy`. Any other value is rejected by the server with `400 Bad Request`.

**Fire-and-forget**  
The frontend does not wait for the share tracking API to respond before opening the share window. The API call is made in the background. If it fails, the user is not notified and the share still proceeds.

**Counter update**  
`articles.share_count` is incremented via trigger on every INSERT into `article_shares`. It represents total recorded share events, including repeat shares by the same person.

**No deduplication**  
Unlike views and likes, shares are not deduplicated. Sharing the same article multiple times (even from the same account) each counts separately. This reflects actual sharing intent — each click represents a real attempt to spread the article.

**Display**  
The total share count is visible on the engagement bar next to the Share button.

---

### Tiếng Việt

**Những gì được theo dõi**  
Mỗi khi người dùng nhấn nút chia sẻ đến nền tảng (Facebook, Zalo, X/Twitter, LinkedIn) hoặc sao chép liên kết bài viết, một sự kiện chia sẻ được ghi vào bảng `article_shares`.

**Không yêu cầu đăng nhập**  
Chia sẻ được theo dõi cho cả người dùng đã đăng nhập và khách. Với khách, `user_id` được lưu là `null`; chỉ ghi lại nền tảng và thời gian.

**Giá trị nền tảng**  
Các giá trị được chấp nhận: `facebook`, `zalo`, `twitter`, `linkedin`, `copy`. Giá trị khác bị máy chủ từ chối với `400 Bad Request`.

**Gọi và quên**  
Frontend không chờ API theo dõi chia sẻ phản hồi trước khi mở cửa sổ chia sẻ. Lệnh gọi API được thực hiện nền. Nếu thất bại, người dùng không được thông báo và việc chia sẻ vẫn tiếp tục.

**Cập nhật bộ đếm**  
`articles.share_count` tăng qua trigger mỗi khi có INSERT vào `article_shares`. Nó đại diện cho tổng sự kiện chia sẻ đã ghi, bao gồm chia sẻ lặp lại bởi cùng một người.

**Không chống trùng lặp**  
Khác với lượt xem và lượt thích, chia sẻ không chống trùng lặp. Chia sẻ cùng một bài nhiều lần (kể cả từ cùng một tài khoản) đều tính riêng biệt. Điều này phản ánh ý định chia sẻ thực tế — mỗi lần nhấn là một lần thực sự muốn lan truyền bài viết.

**Hiển thị**  
Tổng số lượt chia sẻ hiển thị trên thanh tương tác bên cạnh nút Chia sẻ.

---

## 5. Bookmarks / Lưu bài viết

### English

**Who can bookmark**  
Only authenticated users. Unauthenticated users who click the Save button are shown a "Log in to save articles" toast.

**Toggle behaviour**  
Bookmarking is a toggle. Clicking Save on an already-saved article removes it from the user's saved list. The same endpoint handles both directions.

**One bookmark per user per article**  
The `article_bookmarks` table has a composite primary key `(article_id, user_id)`, making duplicate bookmarks impossible.

**Optimistic UI**  
The Save button state changes immediately. If the API fails, it reverts.

**No public counter**  
Unlike likes, the total number of bookmarks is not displayed publicly. It is available to admins in the analytics dashboard only.

**Saved articles page**  
Logged-in users can access `/profile/bookmarks` to see all their saved articles in a paginated grid. Articles that have been deleted or unpublished after being bookmarked are excluded from this page.

**Bookmark survives article edits**  
If an article is updated (title, content, thumbnail changed), the bookmark still points to the same article. The saved articles page will show the latest version of the article.

---

### Tiếng Việt

**Ai có thể lưu bài viết**  
Chỉ người dùng đã đăng nhập. Người dùng chưa đăng nhập nhấn nút Lưu sẽ thấy thông báo "Đăng nhập để lưu bài viết".

**Hành vi bật/tắt**  
Lưu là hành động bật/tắt. Nhấn Lưu trên bài đã lưu sẽ xóa khỏi danh sách đã lưu. Cùng một endpoint xử lý cả hai chiều.

**Mỗi người dùng chỉ lưu mỗi bài một lần**  
Bảng `article_bookmarks` có khóa chính tổng hợp `(article_id, user_id)`, khiến việc lưu trùng lặp là không thể.

**Giao diện lạc quan**  
Trạng thái nút Lưu thay đổi ngay lập tức. Nếu API thất bại, nó tự hoàn nguyên.

**Không có bộ đếm công khai**  
Khác với lượt thích, tổng số lượt lưu không hiển thị công khai. Chỉ quản trị viên mới xem được trong bảng điều khiển phân tích.

**Trang bài viết đã lưu**  
Người dùng đã đăng nhập có thể truy cập `/profile/bookmarks` để xem tất cả bài viết đã lưu trong lưới phân trang. Các bài viết bị xóa hoặc hủy xuất bản sau khi được lưu sẽ không xuất hiện trên trang này.

**Bookmark tồn tại qua các lần chỉnh sửa bài viết**  
Nếu bài viết được cập nhật (tiêu đề, nội dung, ảnh đại diện thay đổi), bookmark vẫn trỏ đến cùng bài đó. Trang bài viết đã lưu sẽ hiển thị phiên bản mới nhất.

---

## 6. Access Control / Phân quyền

### English

| Action | Guest | User | Editor | Admin |
|---|:---:|:---:|:---:|:---:|
| View article (counts a view) | ✓ | ✓ | ✓ | ✓ |
| See view / like / comment / share counts | ✓ | ✓ | ✓ | ✓ |
| Like / unlike an article | ✗ | ✓ | ✓ | ✓ |
| Bookmark / unbookmark an article | ✗ | ✓ | ✓ | ✓ |
| Share an article (opens platform) | ✓ | ✓ | ✓ | ✓ |
| Post a top-level comment | ✗ | ✓ | ✓ | ✓ |
| Post a reply | ✗ | ✓ | ✓ | ✓ |
| Like a comment | ✗ | ✓ | ✓ | ✓ |
| Edit own comment (within 15 min) | ✗ | ✓ | ✓ | ✓ |
| Edit any comment | ✗ | ✗ | ✗ | ✓ |
| Delete own comment | ✗ | ✓ (soft) | ✓ (soft) | ✓ (hard) |
| Delete any comment | ✗ | ✗ | ✗ | ✓ (hard) |
| Flag a comment for review | ✗ | ✓ | ✓ | ✓ |
| View engagement analytics | ✗ | ✗ | ✗ | ✓ |

---

### Tiếng Việt

| Hành động | Khách | Người dùng | Biên tập | Quản trị |
|---|:---:|:---:|:---:|:---:|
| Xem bài viết (tính lượt xem) | ✓ | ✓ | ✓ | ✓ |
| Xem số lượt xem/thích/bình luận/chia sẻ | ✓ | ✓ | ✓ | ✓ |
| Thích / bỏ thích bài viết | ✗ | ✓ | ✓ | ✓ |
| Lưu / bỏ lưu bài viết | ✗ | ✓ | ✓ | ✓ |
| Chia sẻ bài viết (mở nền tảng) | ✓ | ✓ | ✓ | ✓ |
| Đăng bình luận cấp cao | ✗ | ✓ | ✓ | ✓ |
| Đăng phản hồi | ✗ | ✓ | ✓ | ✓ |
| Thích bình luận | ✗ | ✓ | ✓ | ✓ |
| Sửa bình luận của mình (trong 15 phút) | ✗ | ✓ | ✓ | ✓ |
| Sửa bất kỳ bình luận | ✗ | ✗ | ✗ | ✓ |
| Xóa bình luận của mình | ✗ | ✓ (mềm) | ✓ (mềm) | ✓ (cứng) |
| Xóa bất kỳ bình luận | ✗ | ✗ | ✗ | ✓ (cứng) |
| Báo cáo bình luận vi phạm | ✗ | ✓ | ✓ | ✓ |
| Xem phân tích tương tác | ✗ | ✗ | ✗ | ✓ |

---

## 7. Rate Limiting / Giới hạn tốc độ

### English

Rate limits are applied per IP address and reset every 60 seconds unless otherwise stated.

| Endpoint | Limit | Window | Rationale |
|---|---|---|---|
| `POST /news/:id/like` | 30 req | 1 min | Prevents rapid toggle spam |
| `POST /news/:id/bookmark` | 30 req | 1 min | Mirrors like limits |
| `POST /news/:id/comments` | 5 req | 1 min | Anti-spam for comment creation |
| `PATCH /comments/:id` | 10 req | 1 min | Prevents edit flooding |
| `DELETE /comments/:id` | 10 req | 1 min | Prevents mass deletion |
| `POST /comments/:id/like` | 60 req | 1 min | Generous — comment liking is fast |
| `POST /news/:id/share` | 60 req | 1 min | Lenient — fire-and-forget |
| `GET /news/:id/comments` | 120 req | 1 min | Read-heavy endpoint |

When a limit is exceeded, the server returns `429 Too Many Requests` with a `Retry-After` header. The frontend shows a toast: "Too many requests. Please slow down."

---

### Tiếng Việt

Giới hạn tốc độ được áp dụng theo địa chỉ IP và đặt lại mỗi 60 giây, trừ khi có ghi chú khác.

| Endpoint | Giới hạn | Cửa sổ | Lý do |
|---|---|---|---|
| `POST /news/:id/like` | 30 yêu cầu | 1 phút | Ngăn nhấn thích liên tục |
| `POST /news/:id/bookmark` | 30 yêu cầu | 1 phút | Tương tự giới hạn thích |
| `POST /news/:id/comments` | 5 yêu cầu | 1 phút | Chống spam khi tạo bình luận |
| `PATCH /comments/:id` | 10 yêu cầu | 1 phút | Ngăn chỉnh sửa tràn lan |
| `DELETE /comments/:id` | 10 yêu cầu | 1 phút | Ngăn xóa hàng loạt |
| `POST /comments/:id/like` | 60 yêu cầu | 1 phút | Rộng hơn — thích bình luận nhanh |
| `POST /news/:id/share` | 60 yêu cầu | 1 phút | Thoải mái — gọi và quên |
| `GET /news/:id/comments` | 120 yêu cầu | 1 phút | Endpoint đọc nhiều |

Khi vượt giới hạn, máy chủ trả về `429 Too Many Requests` với header `Retry-After`. Frontend hiển thị toast: "Quá nhiều yêu cầu. Vui lòng chậm lại."

---

## 8. Counter Consistency / Tính nhất quán bộ đếm

### English

All engagement counters (`views`, `like_count`, `comment_count`, `share_count`) on the `articles` table are **materialized counters** — they are pre-computed and stored, not calculated on query time.

**Why materialized?**  
Counting rows on every article fetch (`SELECT COUNT(*) FROM article_likes WHERE article_id = ?`) would be slow at scale. Pre-computed counters make article listing pages O(1) for engagement data regardless of engagement volume.

**Maintenance rules**
- Counters are updated exclusively via database triggers on the child tables (`article_likes`, `article_views`, `article_shares`, `comments`).
- Application code must never manually `UPDATE articles SET like_count = like_count + 1`. All increments and decrements go through the trigger layer.
- The `GREATEST(counter - 1, 0)` pattern is used in all decrement triggers to guarantee counters cannot go negative, even if a race condition or data inconsistency occurs.

**Reconciliation**  
A scheduled background job runs daily at 02:00 UTC to reconcile all counters against the actual row counts in child tables. This corrects any drift caused by exceptional database events (manual data migration, bulk imports, trigger failures during deployments). Drifts larger than 1% of the counter value are logged as alerts.

---

### Tiếng Việt

Tất cả bộ đếm tương tác (`views`, `like_count`, `comment_count`, `share_count`) trên bảng `articles` là **bộ đếm được vật chất hóa** — được tính trước và lưu trữ, không tính tại thời điểm truy vấn.

**Tại sao vật chất hóa?**  
Đếm hàng mỗi khi lấy bài viết (`SELECT COUNT(*) FROM article_likes WHERE article_id = ?`) sẽ chậm ở quy mô lớn. Bộ đếm tính trước giúp trang danh sách bài viết có độ phức tạp O(1) cho dữ liệu tương tác bất kể lưu lượng tương tác.

**Quy tắc bảo trì**
- Bộ đếm được cập nhật độc quyền qua trigger cơ sở dữ liệu trên các bảng con (`article_likes`, `article_views`, `article_shares`, `comments`).
- Code ứng dụng tuyệt đối không được thủ công `UPDATE articles SET like_count = like_count + 1`. Mọi tăng/giảm đều đi qua lớp trigger.
- Hàm `GREATEST(counter - 1, 0)` được dùng trong tất cả trigger giảm để đảm bảo bộ đếm không thể âm, kể cả khi xảy ra race condition hoặc mất nhất quán dữ liệu.

**Đối chiếu**  
Một job nền theo lịch chạy hàng ngày lúc 02:00 UTC để đối chiếu tất cả bộ đếm với số hàng thực tế trong các bảng con. Điều này sửa mọi sai lệch do các sự kiện database ngoại lệ (di chuyển dữ liệu thủ công, nhập hàng loạt, lỗi trigger trong quá trình triển khai). Sai lệch lớn hơn 1% giá trị bộ đếm được ghi thành cảnh báo.

---

## 9. Moderation / Kiểm duyệt

### English

**Automatic keyword filtering**  
Comments are checked server-side against a configurable blocklist before being saved. If a comment contains a blocked phrase:
- The comment is not saved.
- The API returns `422 Unprocessable Entity` with a generic message: "Your comment could not be posted."
- The user is not told which specific word triggered the block (to prevent gaming the filter).

**User-initiated flagging**  
Any logged-in user may flag a comment as inappropriate. Flagging does not remove the comment immediately. It marks `is_flagged = true` on the comment row and queues it for admin review.

**Multiple flags**  
If the same comment receives 5 or more flags from different users, it is automatically hidden from public view (soft-hidden, not deleted) until an admin reviews it.

**Admin review queue**  
Admins see flagged comments in `/admin/comments?flagged=true`. Actions available:
- **Approve**: clear the flag, restore visibility, mark reviewed.
- **Edit**: modify the comment body, clear the flag.
- **Delete**: hard delete the comment and all its replies.
- **Ban user**: deactivate the commenting user's account (separate admin action).

**No appeals process**  
There is no formal appeal mechanism in V1. Users whose comments are deleted may contact support through standard channels.

---

### Tiếng Việt

**Lọc từ khóa tự động**  
Bình luận được kiểm tra phía máy chủ dựa trên danh sách đen từ khóa có thể cấu hình trước khi lưu. Nếu bình luận chứa cụm từ bị chặn:
- Bình luận không được lưu.
- API trả về `422 Unprocessable Entity` với thông báo chung: "Bình luận của bạn không thể được đăng."
- Người dùng không được biết từ cụ thể nào kích hoạt việc chặn (để ngăn lách qua bộ lọc).

**Báo cáo do người dùng khởi tạo**  
Bất kỳ người dùng đã đăng nhập nào đều có thể báo cáo bình luận là không phù hợp. Báo cáo không xóa bình luận ngay lập tức. Nó đánh dấu `is_flagged = true` trên hàng bình luận và xếp hàng chờ quản trị viên xem xét.

**Nhiều báo cáo**  
Nếu cùng một bình luận nhận được 5 báo cáo hoặc hơn từ các người dùng khác nhau, bình luận đó sẽ tự động bị ẩn khỏi chế độ xem công khai (ẩn mềm, không xóa) cho đến khi quản trị viên xem xét.

**Hàng đợi xem xét của quản trị viên**  
Quản trị viên xem bình luận bị báo cáo tại `/admin/comments?flagged=true`. Các hành động có thể:
- **Phê duyệt**: xóa cờ, khôi phục khả năng hiển thị, đánh dấu đã xem xét.
- **Chỉnh sửa**: sửa đổi nội dung bình luận, xóa cờ.
- **Xóa**: xóa cứng bình luận và tất cả phản hồi của nó.
- **Cấm người dùng**: vô hiệu hóa tài khoản người dùng đang bình luận (hành động quản trị riêng biệt).

**Không có quy trình kháng cáo**  
Không có cơ chế kháng cáo chính thức trong V1. Người dùng có bình luận bị xóa có thể liên hệ hỗ trợ qua các kênh thông thường.

---

## 10. Notifications / Thông báo

### English

Notifications are queued asynchronously and delivered in-app. Email notifications are a planned V2 feature.

**Events that trigger notifications**

| Event | Who is notified |
|---|---|
| Someone replies to your comment | Comment author |
| Someone likes your comment (every 10th like) | Comment author |
| Your article receives its 100th, 500th, 1000th like | Article author |
| Someone mentions `@you` in a comment | Mentioned user |

**Notification delivery rules**
- Notifications are batched and deduplicated: if 5 people reply to your comment in one minute, you receive 1 notification, not 5.
- The deduplication window is 5 minutes.
- Reading a notification marks it as read. "Mark all as read" is available.
- Notifications expire and are deleted after 90 days.
- The unread notification count appears as a badge on the bell icon in the header.

**No notification for your own actions**  
If you like your own comment (which is technically prevented by the UI but not the API), no notification is sent. Actions on your own content never trigger self-notifications.

---

### Tiếng Việt

Thông báo được xếp hàng không đồng bộ và gửi trong ứng dụng. Thông báo qua email là tính năng dự kiến của V2.

**Sự kiện kích hoạt thông báo**

| Sự kiện | Người nhận thông báo |
|---|---|
| Ai đó phản hồi bình luận của bạn | Tác giả bình luận |
| Ai đó thích bình luận của bạn (mỗi lần thứ 10) | Tác giả bình luận |
| Bài viết của bạn nhận được lượt thích thứ 100, 500, 1000 | Tác giả bài viết |
| Ai đó nhắc đến `@bạn` trong bình luận | Người được nhắc |

**Quy tắc gửi thông báo**
- Thông báo được gộp nhóm và chống trùng lặp: nếu 5 người phản hồi bình luận của bạn trong một phút, bạn nhận 1 thông báo, không phải 5.
- Cửa sổ chống trùng lặp là 5 phút.
- Đọc thông báo đánh dấu nó là đã đọc. "Đánh dấu tất cả đã đọc" có sẵn.
- Thông báo hết hạn và bị xóa sau 90 ngày.
- Số thông báo chưa đọc hiển thị dưới dạng huy hiệu trên biểu tượng chuông trong header.

**Không thông báo cho hành động của chính bạn**  
Nếu bạn thích bình luận của chính mình (điều mà giao diện ngăn chặn về mặt kỹ thuật nhưng API thì không), không có thông báo nào được gửi. Các hành động trên nội dung của chính bạn không bao giờ kích hoạt tự thông báo.

---

## 11. Analytics / Thống kê

### English

**Admin dashboard (`/admin/stats/engagement`)**  
Returns an aggregated snapshot of engagement across all articles:
- Total likes, comments, shares across the platform.
- Shares broken down by platform (Facebook, Zalo, X, LinkedIn, Copy).
- Top 10 most-viewed articles in the last 7 days.
- Top 10 most-liked articles all time.

**Trending algorithm**  
Articles are ranked by a weighted engagement score calculated over a configurable time window (default: 24 hours):

```
score = (views × 0.3) + (likes × 1.0) + (comments × 2.0) + (shares × 1.5)
```

Comments are weighted highest because they represent the deepest engagement. The trending list is cached in Redis for 5 minutes before recomputation.

**Privacy**  
Raw engagement data (who liked what, individual view records) is only visible to admins through the analytics API. Public-facing counts show totals only — never individual user attribution.

---

### Tiếng Việt

**Bảng điều khiển quản trị (`/admin/stats/engagement`)**  
Trả về snapshot tổng hợp của tương tác trên tất cả bài viết:
- Tổng lượt thích, bình luận, chia sẻ trên toàn nền tảng.
- Chia sẻ phân tách theo nền tảng (Facebook, Zalo, X, LinkedIn, Copy).
- Top 10 bài viết được xem nhiều nhất trong 7 ngày qua.
- Top 10 bài viết được thích nhiều nhất mọi thời đại.

**Thuật toán xu hướng**  
Bài viết được xếp hạng theo điểm tương tác có trọng số tính trong cửa sổ thời gian có thể cấu hình (mặc định: 24 giờ):

```
score = (views × 0.3) + (likes × 1.0) + (comments × 2.0) + (shares × 1.5)
```

Bình luận được trọng số cao nhất vì chúng đại diện cho mức độ tương tác sâu nhất. Danh sách xu hướng được lưu cache trong Redis 5 phút trước khi tính lại.

**Quyền riêng tư**  
Dữ liệu tương tác thô (ai thích gì, bản ghi xem riêng lẻ) chỉ hiển thị với quản trị viên qua API phân tích. Số liệu hiển thị công khai chỉ là tổng — không bao giờ gán cho người dùng cụ thể.

---

## 12. Edge Cases / Trường hợp ngoại lệ

### English

| Scenario | Behaviour |
|---|---|
| User is deleted while having likes | `article_likes.user_id` is set to `NULL` (SET NULL constraint). Like count is unaffected. |
| Article is deleted | All engagement rows cascade-delete. Counters are irrelevant (article gone). |
| Article is unpublished (archived) | Existing likes/comments/bookmarks are preserved. Public engagement endpoints return `404` for archived articles. |
| Comment is liked by its author | Not blocked at the API level in V1; the UI hides the like button on own comments. No notification is sent. |
| Reply to a deleted parent comment | Replies remain visible under the "[Comment deleted]" placeholder. Replies are not auto-deleted when a parent is soft-deleted. |
| User bookmarks then the article is archived | The bookmark row persists. The bookmarks page filters out non-published articles, so the article disappears from the page but the bookmark is not deleted. |
| Concurrent like toggles (double-click) | The database `INSERT … ON CONFLICT` pattern (upsert) ensures exactly one row exists at any time, making the final state consistent regardless of race conditions. |
| View counter exceeds INT range | The `views` column uses `BIGINT` (max ~9.2 × 10¹⁸ views per article). Overflow is not a practical concern. |

---

### Tiếng Việt

| Tình huống | Hành vi |
|---|---|
| Người dùng bị xóa trong khi đang có lượt thích | `article_likes.user_id` được đặt thành `NULL` (ràng buộc SET NULL). Số lượt thích không bị ảnh hưởng. |
| Bài viết bị xóa | Tất cả hàng tương tác bị xóa cascade. Bộ đếm không còn ý nghĩa (bài viết đã biến mất). |
| Bài viết bị hủy xuất bản (lưu trữ) | Lượt thích/bình luận/bookmark hiện có được giữ nguyên. Endpoint tương tác công khai trả về `404` cho bài viết đã lưu trữ. |
| Bình luận được tác giả của nó thích | Không bị chặn ở cấp API trong V1; giao diện ẩn nút thích trên bình luận của chính mình. Không có thông báo được gửi. |
| Phản hồi cho bình luận cha đã bị xóa | Phản hồi vẫn hiển thị dưới placeholder "[Bình luận đã bị xóa]". Phản hồi không tự động bị xóa khi cha bị xóa mềm. |
| Người dùng lưu bookmark rồi bài viết bị lưu trữ | Hàng bookmark vẫn tồn tại. Trang bookmark lọc ra các bài không ở trạng thái xuất bản, nên bài biến mất khỏi trang nhưng bookmark không bị xóa. |
| Thích liên tục (nhấn đúp) | Hàm `INSERT … ON CONFLICT` (upsert) trong cơ sở dữ liệu đảm bảo tồn tại đúng một hàng tại bất kỳ thời điểm nào, giữ trạng thái cuối cùng nhất quán bất kể race condition. |
| Bộ đếm view vượt quá phạm vi INT | Cột `views` dùng `BIGINT` (tối đa ~9,2 × 10¹⁸ lượt xem mỗi bài). Tràn số không phải lo ngại thực tế. |
