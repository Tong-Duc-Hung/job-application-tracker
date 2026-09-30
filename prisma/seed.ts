import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Dùng driver adapter như src/shared/db/prisma.ts vì Prisma 7 không còn
// hỗ trợ khởi tạo PrismaClient độc lập.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DAY = 24 * 60 * 60 * 1000;
const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "password123";

function repeated(char: string, length: number) {
  return char.repeat(length);
}

/** Tạo mốc ngày cho đơn ứng tuyển và các thời điểm chung; không cần độ chính xác cao. */
function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY);
}

/**
 * Trường hạn chót nhận ngày từ input dạng yyyy-mm-dd; toPrismaInput() chuyển
 * thành Date ở nửa đêm UTC. Dữ liệu seed mô phỏng đúng cách mã hóa này để kiểm
 * tra ranh giới "hạn chót hôm nay" giống như khi gửi biểu mẫu thật.
 */
function deadlineInDays(days: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Tạo lịch phỏng vấn theo giờ địa phương, tương ứng với input datetime-local. */
function atTime(daysOffset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + daysOffset);
  return d;
}

/**
 * Xóa đơn ứng tuyển, phỏng vấn và ghi chú của một người dùng nhưng giữ lại tài khoản,
 * cho phép chạy seed nhiều lần mà không tạo dữ liệu demo trùng lặp.
 */
async function resetUserData(userId: string) {
  await prisma.note.deleteMany({
    where: {
      OR: [{ application: { userId } }, { interview: { application: { userId } } }],
    },
  });
  await prisma.interview.deleteMany({ where: { application: { userId } } });
  await prisma.application.deleteMany({ where: { userId } });
}

/**
 * Tạo hai tài khoản demo với nhiều đơn, buổi phỏng vấn và ghi chú. Dữ liệu bao phủ
 * mọi trạng thái, mức ưu tiên, loại/kết quả phỏng vấn cùng các trường hợp biên hữu
 * ích như hạn chót hôm nay, tên công ty trùng và tài khoản kiểm tra cách ly dữ liệu.
 * Chạy bằng lệnh: npm run prisma:seed
 */
async function main() {
  // ---------------------------------------------------------------------
  // Tài khoản demo chính, được tạo kèm nhiều dữ liệu mẫu.
  // ---------------------------------------------------------------------
  const email = DEMO_EMAIL;
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { name: "Nguyễn Văn A", email, passwordHash },
  });
  await resetUserData(user.id);

  // ---- Đơn ứng tuyển: đủ 9 trạng thái, 3 mức ưu tiên, các trường tùy chọn
  // có cả giá trị lẫn null và một số trường hợp biên được đánh dấu bên dưới. ----

  const google = await prisma.application.create({
    data: {
      userId: user.id,
      company: "Google",
      position: "Backend Engineer Intern",
      location: "Hà Nội",
      salary: "20-25 triệu",
      jobUrl: "https://careers.google.com",
      priority: "HIGH",
      status: "INTERVIEWING",
      appliedDate: daysAgo(14),
      deadline: deadlineInDays(5),
    },
  });

  const fpt = await prisma.application.create({
    data: {
      userId: user.id,
      company: "FPT Software",
      position: "Java Developer",
      location: "TP.HCM",
      salary: "15-18 triệu",
      priority: "MEDIUM",
      status: "AWAITING_RESULT",
      appliedDate: daysAgo(3),
      // Cố ý bỏ hạn chót để kiểm tra giao diện hiển thị "Chưa đặt".
    },
  });

  const shopee = await prisma.application.create({
    data: {
      userId: user.id,
      company: "Shopee",
      position: "Mobile Developer (Flutter)",
      location: "Remote",
      priority: "MEDIUM",
      status: "REJECTED",
      appliedDate: daysAgo(30),
      // Cố tình viết dài, gần sát giới hạn 2000 ký tự của trường experience
      // — để kiểm tra ô Textarea/hiển thị "Kinh nghiệm" có bị vỡ layout,
      // tràn chữ, hay cần cuộn khi nội dung thực sự dài hay không.
      experience:
        "Bị từ chối ở vòng phỏng vấn quản lý vì chưa có kinh nghiệm Flutter thực tế, chỉ học qua khóa online nên trả lời khá lúng túng khi được hỏi về cách quản lý state trong ứng dụng lớn (so sánh Provider, Riverpod, Bloc) và cách tối ưu hiệu năng khi danh sách có hàng nghìn item. Người phỏng vấn cũng hỏi sâu về cách viết unit test và widget test cho Flutter, cách xử lý platform channel khi cần gọi code native (Kotlin/Swift), và cách tổ chức project theo kiến trúc Clean Architecture — đây đều là những phần chỉ biết lý thuyết chứ chưa từng áp dụng thực tế trong dự án nào. Ngoài ra khi được hỏi về trải nghiệm làm việc nhóm với quy trình Git flow, code review, và CI/CD cho ứng dụng mobile, câu trả lời cũng khá chung chung vì trước giờ chỉ làm đồ án cá nhân một mình. Rút kinh nghiệm cho lần ứng tuyển sau: cần chủ động làm 1-2 dự án Flutter có quy mô vừa phải, publish thử lên Google Play/TestFlight, tham gia đóng góp cho một dự án open-source Flutter để có kinh nghiệm làm việc nhóm thực tế qua Pull Request, đồng thời luyện tập trả lời phỏng vấn theo phương pháp STAR (Situation, Task, Action, Result) để trình bày kinh nghiệm mạch lạc và có dẫn chứng cụ thể hơn thay vì chỉ nói chung chung về mặt lý thuyết đã học.",
    },
  });

  const tiki = await prisma.application.create({
    data: {
      userId: user.id,
      company: "Tiki",
      position: "Frontend Developer",
      location: "TP.HCM",
      priority: "LOW",
      status: "APPLIED",
      appliedDate: new Date(),
    },
  });

  // EDGE CASE: deadline = hôm nay. Dùng để kiểm tra isOverdue / các hàm
  // đếm "còn hiệu lực" và "hạn chót sắp tới" có đúng theo NGÀY lịch hay
  // không (xem ghi chú về lỗi múi giờ đã trao đổi trước đó).
  const vng = await prisma.application.create({
    data: {
      userId: user.id,
      company: "VNG Corporation",
      position: "Data Analyst Intern",
      location: "Hà Nội",
      salary: "10-12 triệu",
      jobUrl: "https://career.vng.com.vn",
      priority: "MEDIUM",
      status: "APPLIED",
      appliedDate: daysAgo(2),
      deadline: deadlineInDays(0), // hôm nay
    },
  });

  const momo = await prisma.application.create({
    data: {
      userId: user.id,
      company: "MoMo",
      position: "QA Engineer",
      location: "TP.HCM",
      priority: "LOW",
      status: "REVIEWING",
      appliedDate: daysAgo(5),
      // Không có lương, liên kết tuyển dụng và hạn chót để kiểm tra trạng thái chưa cập nhật.
    },
  });

  // EDGE CASE: deadline đã qua nhưng OFFER phải được giữ nguyên, không tự
  // chuyển sang EXPIRED cùng nhóm kết quả cuối cùng.
  const viettel = await prisma.application.create({
    data: {
      userId: user.id,
      company: "Viettel",
      position: "DevOps Engineer",
      location: "Hà Nội",
      salary: "25-30 triệu",
      priority: "HIGH",
      status: "OFFER",
      appliedDate: daysAgo(20),
      deadline: deadlineInDays(-2),
    },
  });

  // EDGE CASE: ACCEPTED — dùng để so sánh số "đơn còn hiệu lực" giữa
  // Dashboard (application.repository.countActiveApplications) và trang
  // Thống kê (statistics.service.ts) như đã trao đổi: một bên tính
  // ACCEPTED là "còn hiệu lực", một bên không.
  const tiktok = await prisma.application.create({
    data: {
      userId: user.id,
      company: "TikTok",
      position: "Software Engineer",
      location: "Remote",
      salary: "30-35 triệu",
      priority: "HIGH",
      status: "ACCEPTED",
      appliedDate: daysAgo(60),
    },
  });

  const zalo = await prisma.application.create({
    data: {
      userId: user.id,
      company: "Zalo",
      position: "Backend Developer",
      location: "TP.HCM",
      priority: "LOW",
      status: "WITHDRAWN",
      appliedDate: daysAgo(45),
      experience:
        "Rút đơn giữa chừng vì đã nhận offer từ công ty khác trước khi có lịch phỏng vấn chính thức. Nên báo sớm cho HR qua email thay vì im lặng.",
    },
  });

  const axon = await prisma.application.create({
    data: {
      userId: user.id,
      company: "Axon Active",
      position: ".NET Developer",
      location: "Đà Nẵng",
      jobUrl: "https://axonactive.com/careers",
      priority: "MEDIUM",
      status: "APPLIED",
      appliedDate: daysAgo(1),
    },
  });

  // EDGE CASE: hạn chót rất xa (30 ngày) — dùng để test sắp xếp
  // "Hạn chót (gần nhất)" không bị lẫn với các hạn chót gần.
  const kms = await prisma.application.create({
    data: {
      userId: user.id,
      company: "KMS Technology",
      position: "Automation Tester",
      location: "Đà Nẵng",
      priority: "LOW",
      status: "APPLIED",
      appliedDate: daysAgo(2),
      deadline: deadlineInDays(30),
    },
  });

  const samsung = await prisma.application.create({
    data: {
      userId: user.id,
      // Vị trí dài gần sát giới hạn 150 ký tự — kiểm tra UI có truncate/wrap đúng không.
      company: "Samsung Electronics Vietnam",
      position: "Kỹ sư phần mềm nhúng (Embedded Software Engineer - C/C++, RTOS) - Chương trình thực tập sinh tài năng",
      location: "Bắc Ninh",
      salary: "18-22 triệu",
      priority: "HIGH",
      status: "INTERVIEWING",
      appliedDate: daysAgo(10),
      deadline: deadlineInDays(10),
    },
  });

  // EDGE CASE: trùng tên công ty "Google" với đơn #1 — kiểm tra tìm kiếm
  // trả về đúng nhiều kết quả và không bị nhầm lẫn dữ liệu giữa 2 đơn.
  const google2 = await prisma.application.create({
    data: {
      userId: user.id,
      company: "Google",
      position: "Data Engineer Intern",
      location: "Hà Nội",
      priority: "MEDIUM",
      status: "APPLIED",
      appliedDate: daysAgo(1),
    },
  });

  // EDGE CASE: cùng công ty với đơn #2 (FPT Software) nhưng viết hoa toàn
  // bộ + trạng thái REJECTED và KHÔNG có "Kinh nghiệm" — kiểm tra tìm kiếm
  // không phân biệt hoa/thường, và trạng thái rỗng của ô Kinh nghiệm.
  const fptCaps = await prisma.application.create({
    data: {
      userId: user.id,
      company: "FPT SOFTWARE",
      position: "Nhân viên kiểm thử phần mềm",
      location: "Hà Nội",
      priority: "LOW",
      status: "REJECTED",
      appliedDate: daysAgo(40),
      // Cố ý bỏ kinh nghiệm để kiểm tra trạng thái trống.
    },
  });

  // EDGE CASE: hạn chót trong 1 ngày tới — rơi vào đúng cửa sổ 3 ngày của
  // countUpcomingDeadlines(), cùng với đơn VNG (hạn chót hôm nay) ở trên.
  const bosch = await prisma.application.create({
    data: {
      userId: user.id,
      company: "Bosch Global Software Technologies",
      position: "Embedded Systems Intern",
      location: "Hà Nội",
      priority: "HIGH",
      status: "REVIEWING",
      appliedDate: daysAgo(4),
      deadline: deadlineInDays(1),
    },
  });

  // Trường hợp biên: mọi trường tùy chọn đạt giới hạn đã tài liệu hóa,
  // gồm URL HTTP và hạn chót trong ngày.
  const boundaryApplication = await prisma.application.create({
    data: {
      userId: user.id,
      company: repeated("C", 150),
      position: repeated("P", 150),
      location: repeated("L", 150),
      salary: repeated("S", 100),
      jobUrl: `http://${repeated("j", 493)}`,
      priority: "LOW",
      status: "APPLIED",
      appliedDate: daysAgo(1),
      deadline: deadlineInDays(0),
      experience: repeated("K", 2000),
    },
  });

  // ---- Interviews: tất cả 6 InterviewType và cả 5 InterviewResult đều
  // xuất hiện ít nhất một lần. ----

  await prisma.interview.create({
    data: {
      applicationId: google.id,
      title: "HR Screening",
      type: "HR",
      scheduledAt: atTime(-7, 9),
      meetingLocation: "Google Meet",
      result: "PASSED",
      review: "Giới thiệu bản thân, hỏi về kinh nghiệm dự án.",
    },
  });

  const boundaryInterview = await prisma.interview.create({
    data: {
      applicationId: boundaryApplication.id,
      title: repeated("I", 150),
      type: "OTHER",
      scheduledAt: atTime(30, 9),
      meetingLocation: repeated("M", 200),
      meetingUrl: `http://${repeated("m", 493)}`,
      result: "PENDING",
      review: repeated("N", 1000),
    },
  });

  const googleTechnicalRound = await prisma.interview.create({
    data: {
      applicationId: google.id,
      title: "Technical Round",
      type: "TECHNICAL",
      scheduledAt: atTime(2, 9),
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      meetingLocation: "Google Meet",
      result: "PENDING",
      review: "Ôn tập thuật toán, hệ thống phân tán.",
    },
  });

  const googleManagerRound = await prisma.interview.create({
    data: {
      applicationId: google.id,
      title: "Manager Round",
      type: "MANAGER",
      scheduledAt: atTime(4, 14),
      meetingLocation: "Văn phòng Google Hà Nội",
      result: "PENDING",
      // Không có liên kết cuộc họp hoặc ghi chú để kiểm tra cả hai trường tùy chọn trống.
    },
  });

  await prisma.interview.create({
    data: {
      applicationId: fpt.id,
      title: "Online Assessment",
      type: "ONLINE_ASSESSMENT",
      scheduledAt: atTime(-1, 20),
      meetingLocation: "HackerRank",
      result: "PASSED",
      review: "Đang chờ email kết quả từ HR.",
    },
  });

  const shopeeManagerInterview = await prisma.interview.create({
    data: {
      applicationId: shopee.id,
      title: "Manager Interview",
      type: "MANAGER",
      scheduledAt: atTime(-20, 10),
      result: "FAILED",
      review: "Không đủ kinh nghiệm Flutter theo yêu cầu team.",
    },
  });

  await prisma.interview.create({
    data: {
      applicationId: shopee.id,
      title: "Final Round",
      type: "FINAL",
      scheduledAt: atTime(-25, 15),
      result: "NO_SHOW",
      review: "Trùng lịch thi ở trường, quên báo trước với HR.",
    },
  });

  // Viettel — pipeline "thành công" trọn vẹn dẫn tới OFFER.
  await prisma.interview.create({
    data: {
      applicationId: viettel.id,
      title: "HR Screening",
      type: "HR",
      scheduledAt: atTime(-18, 9),
      result: "PASSED",
    },
  });
  await prisma.interview.create({
    data: {
      applicationId: viettel.id,
      title: "Technical Round",
      type: "TECHNICAL",
      scheduledAt: atTime(-15, 9),
      result: "PASSED",
      review: "Hỏi sâu về CI/CD, Kubernetes, Terraform.",
    },
  });
  await prisma.interview.create({
    data: {
      applicationId: viettel.id,
      title: "Final Round",
      type: "FINAL",
      scheduledAt: atTime(-10, 9),
      result: "PASSED",
    },
  });

  // TikTok — pipeline dẫn tới ACCEPTED, có dùng type OTHER.
  await prisma.interview.create({
    data: {
      applicationId: tiktok.id,
      title: "HR Screening",
      type: "HR",
      scheduledAt: atTime(-55, 9),
      result: "PASSED",
    },
  });
  await prisma.interview.create({
    data: {
      applicationId: tiktok.id,
      title: "Vòng đánh giá tổng hợp",
      type: "OTHER",
      scheduledAt: atTime(-50, 9),
      result: "PASSED",
      review: "Kết hợp đánh giá kỹ thuật và văn hoá công ty trong cùng một buổi.",
    },
  });
  await prisma.interview.create({
    data: {
      applicationId: tiktok.id,
      title: "Final Round",
      type: "FINAL",
      scheduledAt: atTime(-45, 9),
      result: "PASSED",
    },
  });

  // Zalo — ứng viên tự rút trước buổi phỏng vấn -> dùng result CANCELLED.
  const zaloHr = await prisma.interview.create({
    data: {
      applicationId: zalo.id,
      title: "HR Screening",
      type: "HR",
      scheduledAt: atTime(-44, 9),
      result: "CANCELLED",
      review: "Ứng viên xin rút vì đã nhận offer khác trước ngày phỏng vấn.",
    },
  });

  const samsungTechnical = await prisma.interview.create({
    data: {
      applicationId: samsung.id,
      title: "Technical Round",
      type: "TECHNICAL",
      scheduledAt: atTime(10, 14),
      meetingUrl: "https://meet.google.com/samsung-tech-round",
      result: "PENDING",
    },
  });

  await prisma.interview.create({
    data: {
      applicationId: bosch.id,
      title: "Online Assessment",
      type: "ONLINE_ASSESSMENT",
      scheduledAt: atTime(-3, 20),
      meetingLocation: "CodeSignal",
      result: "PASSED",
      review: "Đang chờ recruiter phản hồi để xếp lịch vòng tiếp theo.",
    },
  });

  // EDGE CASE: lịch phỏng vấn đúng HÔM NAY (chưa qua giờ nếu bạn seed vào
  // ban ngày) — dùng để kiểm tra formatRelativeSchedule() có hiển thị
  // đúng "Hôm nay HH:mm" và widget "Việc tiếp theo" ở ApplicationDetail
  // có nhận đúng interview này hay không.
  await prisma.interview.create({
    data: {
      applicationId: bosch.id,
      title: "Technical Round",
      type: "TECHNICAL",
      scheduledAt: atTime(0, 21),
      meetingUrl: "https://meet.google.com/bosch-technical-round",
      result: "PENDING",
      review: "Vòng phỏng vấn kỹ thuật ngay sau khi qua vòng Online Assessment.",
    },
  });

  // EDGE CASE: lịch phỏng vấn NGÀY MAI — kiểm tra nhánh "Ngày mai HH:mm"
  // của formatRelativeSchedule(), đồng thời cho MoMo (hiện đang 0 phỏng
  // vấn) một lịch HR đầu tiên cho hợp lý với trạng thái REVIEWING.
  await prisma.interview.create({
    data: {
      applicationId: momo.id,
      title: "HR Screening",
      type: "HR",
      scheduledAt: atTime(1, 10),
      meetingLocation: "Văn phòng MoMo Quận 7",
      result: "PENDING",
    },
  });

  // ---- Notes (Ghi chú): liên kết XOR tới application HOẶC interview. ----
  // Lưu ý: đơn Google có 1 ghi chú gắn trực tiếp vào Application, cộng
  // thêm 2 ghi chú gắn vào các Interview con của nó (Technical + Manager)
  // -> tổng cộng 3 ghi chú. Đây là ví dụ thực tế để kiểm chứng lỗi đã
  // trao đổi trước đó: ApplicationTable đếm `_count.notes` (chỉ 1, vì chỉ
  // đếm ghi chú gắn trực tiếp vào Application) trong khi ApplicationDetail
  // cộng dồn cả ghi chú của Interview (ra 3) -> hai nơi hiển thị số khác
  // nhau cho cùng một đơn.
  await prisma.note.createMany({
    data: [
      {
        applicationId: google.id,
        title: "Tìm hiểu văn hóa công ty",
        content:
          "Đọc lại trang Google Careers và vài bài blog kỹ sư gần đây. Chuẩn bị sẵn phần giới thiệu bản thân ngắn gọn trong khoảng 2 phút, nêu bật dự án backend đã làm.",
      },
      {
        interviewId: googleTechnicalRound.id,
        title: "Ôn tập trước vòng Technical",
        content:
          "Ôn lại CAP theorem, load balancing, cách thiết kế hệ thống phân tán chịu lỗi. Luyện thêm 2-3 bài LeetCode medium dạng đồ thị và quy hoạch động trước buổi phỏng vấn.",
      },
      {
        interviewId: googleManagerRound.id,
        title: "Chuẩn bị câu hỏi ngược cho quản lý",
        content:
          "Chuẩn bị 2-3 câu hỏi về lộ trình phát triển trong team, quy trình review code, và cách team đo lường hiệu quả công việc của intern.",
      },
      {
        interviewId: shopeeManagerInterview.id,
        title: "Chuẩn bị câu trả lời về kinh nghiệm Flutter",
        content:
          "Cần có ví dụ cụ thể, kể cả dự án cá nhân, để chứng minh kinh nghiệm Flutter thực tế thay vì chỉ nói đã học qua khóa online.",
      },
      {
        applicationId: tiki.id,
        title: "Chuẩn bị portfolio trước khi nộp",
        content:
          "Hoàn thiện 2 dự án React trong portfolio, viết cover letter ngắn gọn nêu bật kinh nghiệm làm việc với component tái sử dụng và tối ưu hiệu năng.",
      },
      {
        applicationId: vng.id,
        title: "Chuẩn bị CV song ngữ",
        content: "Dịch lại CV sang tiếng Anh, nhấn mạnh kỹ năng SQL và trực quan hóa dữ liệu bằng Power BI.",
      },
      {
        interviewId: samsungTechnical.id,
        title: "Ôn tập embedded trước phỏng vấn",
        content: "Ôn lại RTOS, giao tiếp UART/SPI/I2C, và cách debug bằng oscilloscope/logic analyzer.",
      },
      {
        interviewId: zaloHr.id,
        title: "Lý do rút đơn",
        content: "Đã thông báo với HR qua email trước 2 ngày, giữ liên hệ tốt để có thể ứng tuyển lại sau này.",
      },
      // Ghi chú nội dung dài hơn hẳn các ghi chú khác — kiểm tra UI có
      // xuống dòng/scroll hợp lý khi nội dung dài thay vì bị vỡ layout.
      {
        applicationId: kms.id,
        title: "Checklist ôn tập kiểm thử tự động trước khi nộp",
        content:
          "Rà lại toàn bộ kiến thức Selenium WebDriver và Playwright, tập trung vào page object model và cách tổ chức test suite cho dễ bảo trì. Ôn lại cách viết test case cho API bằng Postman/Newman và tích hợp vào pipeline CI/CD với GitHub Actions. Chuẩn bị ví dụ thực tế về một lần phát hiện bug nghiêm trọng nhờ automation test mà kiểm thử thủ công bỏ sót, kèm theo cách đo lường độ bao phủ (coverage) và tốc độ chạy bộ test hồi quy. Ngoài ra cần ôn lại kiến thức nền về HTTP, REST API, và sự khác biệt giữa kiểm thử functional, regression, và smoke test để trả lời tốt các câu hỏi lý thuyết trong vòng phỏng vấn kỹ thuật.",
      },
      {
        interviewId: boundaryInterview.id,
        title: repeated("T", 150),
        content: repeated("C", 2000),
      },
    ],
  });

  // Tài khoản hoàn toàn trống dùng để kiểm tra trải nghiệm lần đầu riêng biệt
  // với tài khoản demo có dữ liệu và trường hợp kiểm tra cách ly bên dưới.
  const emptyUser = await prisma.user.upsert({
    where: { email: "empty@example.com" },
    update: { passwordHash, name: "Empty Test User", theme: "SYSTEM" },
    create: { name: "Empty Test User", email: "empty@example.com", passwordHash },
  });
  await resetUserData(emptyUser.id);

  // ---------------------------------------------------------------------
  // User 2 — chỉ để kiểm chứng cách ly dữ liệu giữa các tài khoản: khi
  // đăng nhập bằng demo@example.com, KHÔNG được thấy bất kỳ dữ liệu nào
  // của tài khoản này ở Dashboard, danh sách, hay Thống kê.
  // ---------------------------------------------------------------------
  const email2 = "candidate2@example.com";
  const user2 = await prisma.user.upsert({
    where: { email: email2 },
    update: { passwordHash },
    create: { name: "Trần Thị B", email: email2, passwordHash },
  });
  await resetUserData(user2.id);

  const grab = await prisma.application.create({
    data: {
      userId: user2.id,
      company: "Grab",
      position: "Software Engineer",
      location: "TP.HCM",
      priority: "MEDIUM",
      status: "APPLIED",
      appliedDate: daysAgo(2),
      deadline: deadlineInDays(7),
    },
  });

  await prisma.interview.create({
    data: {
      applicationId: grab.id,
      title: "HR Screening",
      type: "HR",
      scheduledAt: atTime(3, 10),
      result: "PENDING",
    },
  });

  await prisma.note.create({
    data: {
      applicationId: grab.id,
      title: "Tìm hiểu sản phẩm Grab",
      content: "Đọc kỹ về GrabFood và GrabExpress, chuẩn bị câu hỏi về kiến trúc microservices của Grab.",
    },
  });

  // ---------------------------------------------------------------------
  const [totalApplications, totalInterviews, totalNotes] = await Promise.all([
    prisma.application.count(),
    prisma.interview.count(),
    prisma.note.count(),
  ]);

  console.log("Seed complete.");
  console.log(`- Tài khoản demo: ${email} / ${DEMO_PASSWORD} (dữ liệu đại diện, không phải dữ liệu production)`);
  console.log(`- Tài khoản phụ: ${email2} / ${DEMO_PASSWORD} (dữ liệu đại diện cho kiểm tra cách ly)`);
  console.log(`- Tổng cộng trong DB: ${totalApplications} đơn, ${totalInterviews} phỏng vấn, ${totalNotes} ghi chú.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
