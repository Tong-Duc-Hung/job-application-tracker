import type { Application, Interview, Note } from "@prisma/client";
import { statusLabel, priorityLabel, typeLabel, resultLabel } from "@/shared/ui/Badge";
import { formatDate, formatDateTime } from "@/shared/utils/formatDate";

/**
 * Một đơn ứng tuyển kèm đầy đủ quan hệ (phỏng vấn và ghi chú của từng phỏng vấn, ghi chú trực tiếp), dữ liệu nguồn cho mọi định dạng xuất.
 */
export type ApplicationWithInterviews = Application & {
  interviews: (Interview & { notes: Note[] })[];
  notes: Note[];
};

/**
 * Kích hoạt tải xuống một Blob bằng thẻ `<a>` ẩn, cách chuẩn để tải file được tạo hoàn toàn ở trình duyệt
 * (không qua request tới server).
 *
 * @param blob Nội dung file.
 * @param filename Tên file khi tải về.
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Ngày hiện tại dạng `dd-MM-yyyy`, dùng làm hậu tố tên file xuất. */
function dateStamp() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

/** Tạo tên file thống nhất cho mọi định dạng xuất dữ liệu. */
function exportFilename(extension: "json" | "csv" | "xlsx" | "pdf") {
  return `Job Application Tracker ${dateStamp()}.${extension}`;
}

/**
 * Định nghĩa cột dùng chung cho CSV, Excel (sheet đơn ứng tuyển) và PDF — đảm bảo ba định dạng luôn có cùng bộ cột và thứ tự.
 */
const COLUMNS: { header: string; get: (app: ApplicationWithInterviews) => string }[] = [
  { header: "Công ty", get: (a) => a.company },
  { header: "Vị trí", get: (a) => a.position },
  { header: "Trạng thái", get: (a) => statusLabel[a.status] },
  { header: "Độ ưu tiên", get: (a) => priorityLabel[a.priority] },
  { header: "Địa điểm", get: (a) => a.location ?? "" },
  { header: "Mức lương", get: (a) => a.salary ?? "" },
  { header: "Ngày ứng tuyển", get: (a) => formatDate(a.appliedDate) },
  { header: "Hạn chót", get: (a) => (a.deadline ? formatDate(a.deadline) : "") },
  { header: "Kinh nghiệm", get: (a) => a.experience ?? "" },
  { header: "Số buổi phỏng vấn", get: (a) => String(a.interviews.length) },
  {
    header: "Số ghi chú",
    get: (a) => String(a.notes.length + a.interviews.reduce((sum, iv) => sum + iv.notes.length, 0)),
  },
];

/** Tải xuống dữ liệu gốc (nguyên trạng từ `/api/settings/export`) dưới dạng file JSON. */
export function exportAsJson(payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  triggerDownload(blob, exportFilename("json"));
}

/**
 * Bọc giá trị trong dấu ngoặc kép nếu chứa dấu phẩy, dấu ngoặc kép hoặc xuống dòng, theo đúng quy tắc
 * thoát ký tự của định dạng CSV.
 *
 * @param value Giá trị thô của một ô.
 */
function escapeCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Tải xuống đơn ứng tuyển, lịch phỏng vấn và ghi chú dưới dạng CSV.
 * Thêm BOM (`\uFEFF`) ở đầu file để Excel nhận diện đúng mã hóa UTF-8 và hiển thị tiếng Việt có dấu
 * chính xác thay vì ký tự lỗi.
 */
export function exportApplicationsAsCsv(applications: ApplicationWithInterviews[]) {
  const headers = [
    "Loại dữ liệu",
    ...COLUMNS.map((column) => column.header),
    "Tiêu đề phỏng vấn",
    "Loại phỏng vấn",
    "Ngày giờ phỏng vấn",
    "Kết quả phỏng vấn",
    "Địa điểm phỏng vấn",
    "Nhận xét phỏng vấn",
    "Tiêu đề ghi chú",
    "Nội dung ghi chú",
    "Ngày ghi chú",
    "Liên kết",
  ];
  const rows: string[][] = [headers];
  const emptyApplicationFields = Array<string>(COLUMNS.length - 2).fill("");
  const emptyInterviewFields = Array<string>(6).fill("");
  const emptyNoteFields = Array<string>(4).fill("");

  for (const application of applications) {
    rows.push(["Đơn ứng tuyển", ...COLUMNS.map((column) => column.get(application)), ...emptyInterviewFields, ...emptyNoteFields]);

    for (const interview of application.interviews) {
      rows.push([
        "Lịch phỏng vấn",
        application.company,
        application.position,
        ...emptyApplicationFields,
        interview.title,
        typeLabel[interview.type],
        formatDateTime(interview.scheduledAt),
        resultLabel[interview.result],
        interview.meetingLocation ?? "",
        interview.review ?? "",
        ...emptyNoteFields,
      ]);

      for (const note of interview.notes) {
        rows.push([
          "Ghi chú",
          application.company,
          application.position,
          ...emptyApplicationFields,
          ...emptyInterviewFields,
          note.title,
          note.content,
          formatDate(note.createdAt),
          `Phỏng vấn: ${interview.title}`,
        ]);
      }
    }

    for (const note of application.notes) {
      rows.push([
        "Ghi chú",
        application.company,
        application.position,
        ...emptyApplicationFields,
        ...emptyInterviewFields,
        note.title,
        note.content,
        formatDate(note.createdAt),
        "Đơn ứng tuyển",
      ]);
    }
  }

  const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, exportFilename("csv"));
}

/**
 * Tải xuống một file Excel gồm tối đa 3 sheet: "Đơn ứng tuyển" (luôn có), "Phỏng vấn" và "Ghi chú"
 * (chỉ thêm nếu có dữ liệu). Sheet "Ghi chú" gộp cả ghi chú gắn trực tiếp vào đơn lẫn ghi chú gắn vào
 * từng buổi phỏng vấn, phân biệt qua cột "Liên kết".
 * Thư viện `xlsx` được import động (`await import`) để không tăng kích thước bundle JS ban đầu, vì
 * phần lớn người dùng không dùng đến tính năng xuất Excel.
 */
export async function exportApplicationsAsXlsx(applications: ApplicationWithInterviews[]) {
  const XLSX = await import("xlsx");

  const appRows = applications.map((app) => {
    const row: Record<string, string> = {};
    for (const col of COLUMNS) row[col.header] = col.get(app);
    return row;
  });
  const appSheet = XLSX.utils.json_to_sheet(appRows);
  appSheet["!cols"] = COLUMNS.map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, appSheet, "Đơn ứng tuyển");

  const interviewRows = applications.flatMap((app) =>
    app.interviews.map((iv) => ({
      "Công ty": app.company,
      "Vị trí": app.position,
      "Tiêu đề": iv.title,
      Loại: typeLabel[iv.type],
      "Ngày giờ": formatDateTime(iv.scheduledAt),
      "Kết quả": resultLabel[iv.result],
      "Địa điểm": iv.meetingLocation ?? "",
      "Nhận xét": iv.review ?? "",
    }))
  );
  if (interviewRows.length > 0) {
    const interviewSheet = XLSX.utils.json_to_sheet(interviewRows);
    interviewSheet["!cols"] = [20, 20, 24, 16, 18, 14, 20, 50].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, interviewSheet, "Phỏng vấn");
  }

  const applicationNoteRows = applications.flatMap((app) =>
    app.notes.map((note) => ({
      "Loại": "Ghi chú",
      "Công ty": app.company,
      "Vị trí": app.position,
      "Liên kết": "Đơn ứng tuyển",
      "Tiêu đề": note.title,
      "Nội dung": note.content,
      "Ngày ghi": formatDate(note.createdAt),
    }))
  );
  const interviewNoteRows = applications.flatMap((app) =>
    app.interviews.flatMap((iv) =>
      iv.notes.map((note) => ({
        "Loại": "Ghi chú",
        "Công ty": app.company,
        "Vị trí": app.position,
        "Liên kết": `Phỏng vấn: ${iv.title}`,
        "Tiêu đề": note.title,
        "Nội dung": note.content,
        "Ngày ghi": formatDate(note.createdAt),
      }))
    )
  );
  const noteRows = [...applicationNoteRows, ...interviewNoteRows];
  if (noteRows.length > 0) {
    const noteSheet = XLSX.utils.json_to_sheet(noteRows);
    noteSheet["!cols"] = [16, 20, 20, 24, 24, 50, 16].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, noteSheet, "Ghi chú");
  }

  XLSX.writeFile(workbook, exportFilename("xlsx"));
}

/**
 * Tải xuống một file PDF dạng bảng (khổ ngang) liệt kê toàn bộ đơn ứng tuyển.
 * Nhúng font DejaVu Sans (qua `dejaVuSansBase64`) vì font mặc định của jsPDF không có dấu tiếng Việt;
 * cả `jspdf`, `jspdf-autotable` và font đều được import động để giảm kích thước bundle ban đầu.
 *
 * @param userName Tên người dùng, hiển thị ở dòng mô tả đầu trang.
 */
export async function exportApplicationsAsPdf(applications: ApplicationWithInterviews[], userName: string) {
  const [{ jsPDF }, autoTableModule, { dejaVuSansBase64 }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    import("@/shared/fonts/dejaVuSansBase64"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "landscape" });

  doc.addFileToVFS("DejaVuSans.ttf", dejaVuSansBase64);
  doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
  doc.addFont("DejaVuSans.ttf", "DejaVuSans", "bold");
  doc.setFont("DejaVuSans");

  const reportSubtitle = `${userName} · Xuất ngày ${formatDate(new Date())} · ${applications.length} đơn`;
  const drawReportHeading = (section: string) => {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text("Báo cáo theo dõi ứng tuyển", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(reportSubtitle, 14, 21);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(section, 14, 29);
  };
  const drawPageNumber = ({ pageNumber }: { pageNumber: number }) => {
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Trang ${pageNumber}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 7, {
      align: "right",
    });
  };
  const tableStyles = {
    margin: { top: 33, right: 14, bottom: 16, left: 14 },
    styles: {
      font: "DejaVuSans",
      fontSize: 9,
      cellPadding: 3,
      overflow: "linebreak" as const,
      valign: "top" as const,
      lineColor: [226, 232, 240] as [number, number, number],
      lineWidth: 0.1,
    },
    headStyles: { font: "DejaVuSans", fillColor: [2, 132, 199] as [number, number, number], textColor: 255, fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
    didDrawPage: drawPageNumber,
  };

  const overviewColumns = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  drawReportHeading("Thông tin ứng tuyển");
  autoTable(doc, {
    ...tableStyles,
    startY: 33,
    head: [overviewColumns.map((index) => COLUMNS[index].header)],
    body: applications.map((app) => overviewColumns.map((index) => COLUMNS[index].get(app))),
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 34 },
      2: { cellWidth: 25 },
      3: { cellWidth: 22 },
      4: { cellWidth: 32 },
      5: { cellWidth: 22 },
      6: { cellWidth: 28 },
      7: { cellWidth: 26 },
      8: { cellWidth: 50 },
    },
  });

  doc.addPage();
  drawReportHeading("Lịch phỏng vấn");
  const interviewRows = applications.flatMap((application) =>
    application.interviews.map((interview) => [
      application.company,
      application.position,
      interview.title,
      typeLabel[interview.type],
      formatDateTime(interview.scheduledAt),
      resultLabel[interview.result],
      interview.meetingLocation ?? "",
      interview.review ?? "",
    ])
  );
  autoTable(doc, {
    ...tableStyles,
    startY: 33,
    head: [["Công ty", "Vị trí", "Tiêu đề", "Loại", "Ngày giờ", "Kết quả", "Địa điểm", "Nhận xét"]],
    body: interviewRows.length > 0 ? interviewRows : [["Chưa có lịch phỏng vấn", "", "", "", "", "", "", ""]],
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 31 },
      2: { cellWidth: 38 },
      3: { cellWidth: 21 },
      4: { cellWidth: 30 },
      5: { cellWidth: 23 },
      6: { cellWidth: 30 },
      7: { cellWidth: 60 },
    },
  });

  doc.addPage();
  drawReportHeading("Ghi chú");
  const detailRows = applications.flatMap((application) => [
    ...application.notes.map((note) => [
      "Ghi chú",
      application.company,
      application.position,
      note.title,
      note.content,
      formatDate(note.createdAt),
      "Đơn ứng tuyển",
    ]),
    ...application.interviews.flatMap((interview) =>
      interview.notes.map((note) => [
        "Ghi chú",
        application.company,
        application.position,
        note.title,
        note.content,
        formatDate(note.createdAt),
        `Phỏng vấn: ${interview.title}`,
      ])
    ),
  ]);
  autoTable(doc, {
    ...tableStyles,
    startY: 33,
    head: [["Loại dữ liệu", "Công ty", "Vị trí", "Tiêu đề", "Nội dung", "Ngày ghi", "Liên kết"]],
    body: detailRows.length > 0 ? detailRows : [["Chưa có ghi chú hoặc kinh nghiệm", "", "", "", "", "", ""]],
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 32 },
      2: { cellWidth: 36 },
      3: { cellWidth: 34 },
      4: { cellWidth: 90 },
      5: { cellWidth: 22 },
      6: { cellWidth: 45 },
    },
  });

  doc.save(exportFilename("pdf"));
}
