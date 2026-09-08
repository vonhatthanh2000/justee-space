---
title: Chương 1. Từ Kỹ Sư Phần Mềm Đến Hành Trình Mới Với SAP
part: Part 2. Cú chuyển mình trong sự nghiệp
summary: Từ 1 software engineer với kỹ năng  Database Optimizing và Blockchain, vì sao tôi lại muốn bắt đầu hành trình mới với SAP
category: Personal
tags:
  - sap
publishedAt: 2026-05-20
---

## Bước đi chập chững từ các công ty khởi nghiệp

Tôi có nhiều năm làm việc với các công ty start up và may mắn được cọ xát với nhiều công nghệ mới, được nhúng tay khá sâu vào các dự án, như là trực tiếp sửa đổi / thiết kế lại hệ thống database của một ứng dụng đang chạy production và kết quả được cải thiện tương đối chỉ với vài kỹ năng cơ bản về Index và partitioning.

Các bạn nghe mọi thứ như đang tiến triển rất tốt đúng không. Tuy nhiên, có một điều mà tôi băn khoăn mãi, nếu so thông số ở dạng tỷ lệ thì rất tốt, performance tăng nhanh hẳn 50%, nhưng tổng số users dùng các sản phẩm mà công ty tôi làm ra, dưới 1000 người. Hay 1 dự án blockchain, anh PM và Tech Lead của tôi luôn cố gắng tìm cách cải thiện cơ chế đồng thuận (consensus) để nâng cao tốc độ xử lý và có thể xử lý nhiều giao dịch hơn trong một giây; và cũng giống như dự án trước, số users sử dụng nền tảng của chúng tôi… không nhiều đến thế. Trong thâm tâm tôi luôn cảm thấy, việc nên ưu tiên trong giai đoạn này, là tập trung vào việc làm sao tăng được users, còn việc cải thiện performance trên một tập người dùng nhỏ, chỉ có giá trị trên mặt giấy tờ. Bản thân tôi cũng muốn ứng dụng của mình chạy mượt, đem lại trải nghiệm tốt cho người dùng chứ, nhưng mà một ứng dụng là công sức của một tập thể, có nhiều biến số mà tôi không thể kiểm soát được. Người dùng sản phẩm thì cạn dần, và khi doanh thu không đáp ứng được, kết quả là chả còn dự án nào tồn tại đến hiện tại. Khi dự án sập, tôi cảm giác như công sức trước đó của mình không mang lại nhiều ý nghĩa lắm ngoài việc hết tháng nhận tiền lương.

## Sự phát triển của AI và nhìn nhận thực tế của ngành

Cùng với sự phát triển chóng mặt của AI, các kỹ năng tối ưu Database của tôi, thứ tôi luôn tự hào, giờ đây chỉ cần vài câu prompt, nó đã có thể hiểu rõ các liên kết trong database và đưa ra phương án tối ưu khá chính xác. Có 1 kỷ niệm khá vui mà AI tí nữa đã phá hỏng dự án lúc đó tôi đang làm, anh tech-lead hí hửng khoe với tôi là dùng AI đánh được index đầy đủ luôn, đến khi tôi check qua thì thấy 1 lỗi cực kỳ lớn, vì chỉ muốn tối ưu tốc độ đọc, AI đã tạo tới 7 index trên cùng một bảng. Tốc độ đọc nhanh hơn thật, nhưng giá phải trả là thời gian ghi bị chậm đi gấp 3–4 lần. Tôi vẫn rất ngưỡng mộ kiến thức của anh Tech Lead, tuy nhiên đâu có ai mà giỏi hết mọi mặt, cái mà tôi muốn nói ở đây là, do tôi có kiến thức về Database, tôi mới nhận ra vấn đề ở đó; để một ứng dụng được hình thành, thì cần nhiều kiến thức ở nhiều mảng, vậy câu hỏi là AI còn để lại ‘rác’ ở chỗ nào mà mình chưa nhận ra không, Đó chính là lúc nợ kỹ thuật (technical debt) xuất hiện. Một khi sự cố xảy ra mà không ai thật sự hiểu bản chất, đó sẽ là chuỗi ngày fix bug vô tận.

Về ngách Software Engineer, cá nhân tôi thấy nhu cầu trên thị trường không còn nhiều nữa, vì bây giờ ai cũng có thể vibe code ra được một ứng dụng phục vụ được cho nhu cầu cá nhân của họ. Các kiến thức khó nhất khi làm software engineer là bảo mật, xử lý lượng đồng thời cao, hay tính nguyên tử của dữ liệu… bây giờ trở nên vô nghĩa khi họ chỉ dùng ứng dụng để phục vụ nhu cầu cá nhân, tôi đùa là họ có lưu trữ dữ liệu ở local storage đi chăng nữa cũng chả sao.

## Đi Tìm Bài Toán Ở Quy mô doanh nghiệp

Khi tìm hiểu thì tôi biết được SAP vẫn tồn tại và giữ vị thế số 1 trong thị trường phần mềm quản trị doanh nghiệp (ERP) nhờ vào việc giải quyết bài toán phức tạp nhất của các tập đoàn lớn, kết nối, đồng bộ các quy trình vận hành, thứ mà tôi chưa được trải nghiệm ở các công ty start up trước đó. Các khách hàng đang sử dụng SAP là những cái tên mà nói ra ai cũng từng sử dụng sản phẩm của họ hoặc ít nhất là đã nghe qua: PepsiCo, Samsung, LG, Toyota,… vâng, rất nhiều công ty nằm trong S&P 500.

Họ vẫn sẽ dùng SAP vì chi phí chuyển đổi hệ thống là cực kỳ khổng lồ. Làm việc với SAP, tôi không chỉ làm việc kỹ thuật khô khan, mà ở đấy tôi có cơ hội hiểu hơn về nghiệp vụ, về các quy trình chuẩn quốc tế tối ưu trong tài chính, chuỗi cung ứng, sản xuất đã được đóng gói sẵn, giúp các doanh nghiệp áp dụng ngay tiêu chuẩn của các tập đoàn hàng đầu thế giới. Đồng thời, nền tảng kỹ thuật trước đó giúp tôi tiếp thu domain mới rất nhanh: không mất nhiều thời gian để hiểu về CSDL HANA, CDS Views hay xây dựng ứng dụng chuẩn RESTful (RAP).

[Đọc tiếp: Chương 2. Đặt nền móng →](/blog/sap-foundation)
