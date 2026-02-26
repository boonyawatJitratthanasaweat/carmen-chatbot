export const DEFAULT_CONFIG = {
    theme: '#34558b',
    title: 'Carmen AI Specialist',
    showClearHistoryButton: true,
    showAttachFileButton: true,
    apiBase: ''
};

export const SUGGESTED_QUESTIONS = [
    "กดปุ่ม refresh ใน workbook ไม่ได้ ทำยังไง",
    "บันทึกใบกำกับภาษีซื้อ ใน excel แล้ว import ได้หรือไม่",
    "program carmen สามารถ upload file เข้า program RDPrep ของสรรพากรได้ หรือไม่",
    "ฉันสามารถสร้าง ใบเสร็จรับเงิน โดยไม่เลือก Tax Invoice ได้หรือไม่",
    "ฉันสามารถบันทึก JV โดยที่ debit และ credit ไม่เท่ากันได้หรือไม่"
];

export const STRINGS = {
    error_missing_config: "❌ CarmenBot Error: กรุณาระบุ 'bu', 'user' และ 'apiBase' ใน Config ด้วยครับ (Required)",
    welcome_title: "สวัสดีค่ะ Carmen พร้อมช่วย!",
    welcome_desc: "สอบถามข้อมูลจากคู่มือบริษัท หรือเริ่มบทสนทนาใหม่ได้ทันทีด้านล่างนี้ค่ะ",
    history_loading: "⏳ กำลังโหลด...",
    history_empty: "ยังไม่มีประวัติการแชท",
    history_error: "โหลดรายการไม่สำเร็จ",
    new_chat: "+ เริ่มแชทใหม่",
    input_placeholder: "พิมพ์ข้อความที่นี่...",
    alert_default_title: "แจ้งเตือน",
    alert_default_desc: "ข้อความแจ้งเตือน",
    alert_confirm: "ตกลง",
    alert_cancel: "ยกเลิก",
    delete_room_confirm_title: "ยืนยันลบห้องแชท?",
    delete_room_confirm_desc: "บทสนทนาที่เลือกจะถูกลบถาวร และไม่สามารถกู้คืนได้",
    clear_history_confirm_title: "ล้างประวัติห้องนี้?",
    clear_history_confirm_desc: "ข้อความในห้องนี้จะถูกลบทั้งหมด",
    file_too_large: "ไฟล์ใหญ่เกินไป",
    file_too_large_desc: "ไม่เกิน 5MB ครับ"
};
