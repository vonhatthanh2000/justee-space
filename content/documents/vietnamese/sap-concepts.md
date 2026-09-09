---
title: Chương 3. Hiểu rõ hơn về các khái niệm trong SAP
part: Part 2. Cú chuyển mình trong sự nghiệp
summary: Cái nhìn toàn diện về hệ sinh thái SAP, từ tính năng cốt lõi, ngôn ngữ lập trình, hệ thống phân hệ đến cơ chế vận hành chi tiết của kiến trúc 3 lớp R/3 và Application Server.
category: Personal
tags:
  - sap
  - foundation
publishedAt: 2026-06-01
---

## Các tính năng nội bật của SAP

- **Tính tích hợp (Integration):** Cho phép tất cả các phòng ban/chức năng dùng chung một hệ thống và chia sẻ chung dữ liệu.
- **Đa ngôn ngữ (Multilingual):** Hỗ trợ hơn 40 ngôn ngữ (Anh, Đức, Thái, Trung...) giúp xóa bỏ rào cản ngôn ngữ.
- **Cơ chế cấp phép dựa trên người dùng (User-based License Agreement):** Bắt buộc phải có tài khoản (Username/Password) được xác thực từ SAP Server mới có thể đăng nhập, giúp bảo mật dữ liệu và phân quyền chặt chẽ.

## Nền tảng công nghệ, ngôn ngữ & phân hệ

- **SAP NetWeaver:** Là nền tảng công nghệ đóng vai trò như môi trường thực thi (_Runtime Environment_) cho toàn bộ hệ sinh thái ứng dụng của SAP (như SAP ERP, SAP CRM, SAP SRM, SAP PI).
- **Ngôn ngữ ABAP:** Viết tắt của _Advanced Business Application Programming_ (hiện phổ biến là thế hệ thứ 4 - ABAP/4). Đây là ngôn ngữ lập trình riêng của SAP, nằm tại tầng Application Layer.
- **Các phân hệ (Modules) trong SAP:**
  - _Functional Modules (Phân hệ nghiệp vụ):_ Gồm các module con như **SD** (Bán hàng & Phân phối), **MM** (Quản lý vật tư), **FI** (Tài chính)....
  - _Technical Modules (Phân hệ kỹ thuật):_ Gồm **SAP ABAP** (Lập trình), **SAP BI/BO** (Phục vụ làm báo cáo) và **SAP Basis**.
  - _SAP Basis:_ Đảm nhận vai trò quản trị, giám sát hệ thống 24/7, duy trì hệ thống không bị sự cố/crash và quản lý cấp quyền (User ID, password)

## Kiến trúc 3 lớp tổng quan (SAP R/3 Architecture)

![[../images/3-architecture.png]]

1. **Presentation Layer:** Tầng giao diện người dùng (tương tác trực tiếp qua SAP GUI).
2. **Application Layer:** Tầng ứng dụng/phát triển, chứa các chương trình lập trình bằng ABAP để xử lý logic.
3. **Database Layer:** Tầng cơ sở dữ liệu lưu trữ và truy xuất toàn bộ thông tin hệ thống.

![[../images/application-server-components.png]]

1. **Dispatcher (Bộ điều phối):**
   - Mọi yêu cầu (_input request_) gửi từ người dùng ở tầng Presentation Layer đều sẽ đi vào **Dispatcher** đầu tiên.
   - Dispatcher không trực tiếp xử lý ngay request mà đẩy toàn bộ vào một hàng chờ (**Queue**).
2. **Queue (Hàng chờ):**
   - Lưu giữ các request và sắp xếp thứ tự xử lý theo cơ chế **FIFO** (_First-In, First-Out_ - yêu cầu nào đến trước sẽ được lấy ra xử lý trước).
3. **Work Process (Tiến trình xử lý):**
   - Dispatcher sẽ lấy từng request từ Queue ra và gán cho một **Work Process** để thực thi.
   - **Nguyên tắc đơn nhiệm:** Một Work Process chỉ xử lý **duy nhất 1 request tại một thời điểm**. Nếu có nhiều yêu cầu, hệ thống phải xếp hàng xử lý tuần tự (đây là lý do khiến màn hình SAP GUI đôi khi bị xoay/loading lâu khi gặp chương trình nặng).
4. **Hai vùng bộ nhớ đệm quan trọng trong Work Process:**
   - **User Context:** Là vùng bộ nhớ đệm lưu trữ thông tin về người dùng đang làm việc (User ID, mật khẩu, thời gian đăng nhập, chương trình đang chạy, số lượng cửa sổ đang mở). Vùng bộ nhớ này chỉ tự động giải phóng khi người dùng **Thoát/Log out** khỏi tài khoản SAP.
   - **Roll Area:** Là vùng bộ nhớ đệm nhỏ dành riêng cho việc thực thi chương trình. Khi chương trình ABAP bắt đầu chạy, Roll Area được cấp phát để lưu trữ dữ liệu tính toán tạm thời và sẽ **giải phóng ngay lập tức** khi chương trình kết thúc.
   
### Quy trình xử lý hoàn chỉnh của một Request:

**Presentation Layer** _(Gửi request)_ $\rightarrow$ **Dispatcher** $\rightarrow$ **Queue (FIFO)** $\rightarrow$ **Work Process** _(Xử lý kết hợp với_ **User Context** _&_ **Roll Area**_)_ $\leftrightarrow$ **Database Layer** _(Truy xuất/Lưu data)_ $\rightarrow$ Trả kết quả ngược lại **Presentation Layer**
