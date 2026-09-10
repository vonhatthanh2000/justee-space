---
title: Chương 2. Đặt nền móng
part: Part 2. Cú chuyển mình trong sự nghiệp
summary: Định nghĩa tư duy, lên kế hoạch học tập để xây dựng nền móng vững chắc
category: Personal
tags:
  - sap
  - foundation
publishedAt: 2026-05-27
---

## Tư duy và phương pháp dẫn đường

Một hành trình hiệu quả không thể bắt đầu bằng sự cảm tính. Đề hành trình học tập của tôi trở nên rõ ràng và hiệu quả, không thể một mình tay không bắt giặc được, thứ tôi cần là một kế hoạch, một phương pháp và tư duy học tập đúng đắn.

Tất nhiên là tôi sẽ không kỳ vọng mình sẽ đi đúng hướng ngay từ ban đầu. Tuy nhiên, tôi sẽ không cải thiện được nhiều nếu không có một thước đo thật sự là rõ ràng.

### Sử dụng lợi thế từ những gì sẵn có:

Áp dụng tư duy của một Software Engineer, tôi biến việc học thành một "pipeline" tự động. Thay vì đọc hàng trăm tài liệu khô khan và cực khó nuốt. Tôi dùng AI để tóm tắt các khái niệm cốt lõi, phân tích từ các case study và tạo kịch bản thực hành các tình huống.

Hệ thống cũng tạo ra các tài liệu dành cho việc ôn tập, tạo ra câu hỏi bắt buộc não phải chủ động truy xuất kiến thức, đánh giá lại hiệu quả và nhắc nhở ôn tập theo chu kỳ thời gian tối ưu.

Bắt chước thay vì cố gắng sáng tạo ra một cái gì mới. Bây giờ trên Github có sẵn nhiều example mà tôi có thể làm theo, trước khi sáng tạo ra cái của riêng mình thì tôi phải trải qua giai đoạn học, hiểu, có thể giải thích và làm theo đã.

### Chiến lược thực chiến để sẵn sàng cho dự án

Chấp nhận sự mơ hồ ban đầu, không hoảng sợ trước những thiết lập phức tạp hay lỗi hệ thống ban đầu; học cách sống chung và gỡ rối từng bước.

Thay vì học vẹt các Transaction codes hay ý nghĩa từng fields trong bảng, tôi tiếp cận bằng cách luồng nghiệp vụ vào bài toán, phân tích một chuỗi End-to-End gồm những bước gì và triển khai hệ thống ra sao.

**Quy tắc 80/20:** Thay vì cố gắng hiểu hết mọi thứ, tôi sẽ tập trung làm chủ 20% kiến thức nền tảng, nền móng vững chắc sẽ giúp tôi tự tin và có thể dễ dàng hơn trong việc tìm hiểu một kiến thức mới nằm trong 80% còn lại.

Lý thuyết suông chỉ mang lại cảm giác hiểu giả tạo. Chả ai biết cách đi xe máy bằng cách xem Youtube cả. Việc bắt tay vào làm trực tiếp, hệ thống báo lỗi và tự tra cứu lỗi để sửa. Tôi đặt niềm tin tuyệt đối vào vòng lặp: Làm → Sửa sai → Cải thiện. Đây là con đường ngắn nhất để thẩm thấu kiến thức.

Đối với SAP, thời gian đầu tôi sẽ tìm hiểu các syntax của ABAP, những tư duy, khác biệt so với ngôn ngữ lập trình khác, khi đã nắm được cách nó hoạt động, tôi sẽ dần chuyển mình sang học những concept, chương trình mới hơn như là RAP.

## Kiến trúc hệ thống: Giải mã ERP và các mảnh ghép trong SAP

### Về khái niệm ERP:

Trong một doanh nghiệp tồn tại rất nhiều phòng ban làm việc với nhau. Mỗi phòng ban sử dụng một phần mềm riêng lẻ như bộ phận kho bãi dùng Excel để ghi chép, bộ phận bán hàng dùng một phần mềm CRM độc lập. Điều này dẫn đến việc dữ liệu bị phân tán, và mất nhiều thời gian, công sức đối soát để đảm bảo tính đúng đắn.

_ERP (Enterprise Resource Planning - hệ thống quản trị_ nguồn lực doanh nghiệp). Đây là khái niệm chỉ rõ phần mềm vận hành, quản lý doanh nghiệp, đóng vai trò là một bộ não trung tâm, thu gom, chia sẻ dữ liệu tập trung trên một hệ thống duy nhất. Đảm bảo tính đồng nhất và chuẩn hoá dữ liệu giữa nhiều bộ phận trong cùng một doanh nghiệp.

### SAP - cái tên nổi bật nhất thế giới ERP

ERP là tên gọi chung cho dòng giải pháp của doanh nghiệp, **SAP** (Systems, Applications, and Products in Data Processing) là đại diện lớn nhất trong thị trường này. Công ty Đức được thành lập 1972 và là một trong những công ty phần mềm lớn nhất thế giới. Sức mạnh của SAP không chỉ nằm ở công cụ phần mềm, mà là các quy chuẩn đã được đúc kết từ hàng vạn doanh nghiệp lớn nhất thế giới. Điểm đặc trưng của SAP là **tính chặt chẽ và tích hợp cực cao**: Mọi hành động diễn ra ở một khâu đều kéo theo các bút toán hoặc luồng dữ liệu tự động ở các khâu khác, giúp doanh nghiệp kiểm soát rủi ro gần như tuyệt đối.

### Các mảnh ghép cốt lõi: Hệ sinh thái Module trong SAP

Để quản lý toàn bộ một tập đoàn phức tạp, SAP chia nhỏ hệ thống thành các **Module (Phân hệ)** đảm nhận từng nghiệp vụ chuyên biệt, nhưng tất cả đều kết nối khăng khít với nhau:

### Quản trị Tài chính & Kiểm soát (Finance & Controlling):

- **FI (Financial Accounting):** Quản lý sổ cái, công nợ phải thu/phải trả, tài sản cố định và lập báo cáo tài chính chuẩn mực.
- **CO (Controlling):** Quản lý chi phí nội bộ, tính giá thành sản phẩm và phân tích lợi nhuận.

### Chuỗi cung ứng & Vận hành (Supply Chain & Logistics):

- **MM (Materials Management):** Quản lý Mua hàng (Procurement), định mức tồn kho và Nhập/Xuất/Kiểm kê Kho.
- **SD (Sales and Distribution):** Quản lý Bán hàng, từ báo giá, đơn đặt hàng (Sales Order), giao hàng đến xuất hóa đơn cho khách.
  **PP (Production Planning):** Quản lý lập kế hoạch và điều độ sản xuất, định mức nguyên vật liệu (BOM).

### Quản lý Tài sản & Chất lượng (Asset & Quality):

- **PM (Plant Maintenance):** Quản lý bảo trì, bảo dưỡng máy móc thiết bị nhà xưởng.
- **QM (Quality Management):** Kiểm tra và quản lý chất lượng nguyên vật liệu đầu vào cũng như thành phẩm.

### Quản trị Nhân sự (Human Capital Management):

- **HCM / SuccessFactors:** Quản lý sơ đồ tổ chức, chấm công, tính lương và tuyển dụng/đào tạo.

### Tập trung vào một mũi nhọn: tôi chọn bắt đầu SD

Một lý do đơn giản khiến tôi chọn SD là vì tôi thấy nó gần gũi và những khái niệm khá gần với thực tế. Ai trong chúng ta cũng từng đóng vai là người mua hàng hoặc từng bán một cái gì đó (là sản phẩm hay kể cả là sức lao động). SD không đơn thuần là phân hệ quản lý bán hàng, mà nó chính là doanh thu của toàn bộ doanh nghiệp, nơi kết nối trực tiếp với thị trường, khách hàng và dòng tiền.

Phân hệ này gồm nghiệp vụ end-to-end cực kỳ sống động vì nó bao phủ trọn vẹn hành trình từ báo giá đến khâu xuất hoá đơn, và cũng dễ mở rộng khi đây là điểm giao thao cực mạnh với các phân hệ khác: làm việc với MM ở quản lý tồn kho hay FI ngay thời điểm hóa đơn doanh thu được ghi nhận.

**Định hướng chặng đường**

Khép lại những trang lý thuyết ban đầu. Tôi nhận ra SAP không chỉ là một phần mềm khô khan, nó chính là xương sống vận hành, dòng chảy kết nối các nguồn lực giúp một doanh nghiệp tồn tại và vận hành trơn tru.

Để làm chủ một hệ thống đồ sộ như SAP, không có lối tắt nào ngoài việc bắt đầu từ những bước đi nhỏ nhất. Hiểu một phần tư duy nghiệp vụ chỉ là bước đầu, hành trình tiếp theo sẽ là trực tiếp thao tác trên hệ thống, tôi sẽ bắt đầu bằng việc khám phá các kỹ thuật cơ bản trong SAP ABAP.

[Đọc tiếp: Chương 3. Hiểu rõ hơn về các khái niệm trong SAP →](/blog/sap-concepts)
