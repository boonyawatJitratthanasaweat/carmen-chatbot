export class ChatService {
    constructor(baseUrl) {
        // ทำความสะอาด URL ลบ / ต่อท้ายออก
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    // 🆕 1. ดึงรายชื่อห้องทั้งหมดของผู้ใช้
    async getRooms(bu, username) {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat/rooms/${bu}/${username}`);
            if (!response.ok) throw new Error(`Failed to fetch rooms: ${response.status}`);
            return await response.json();
        } catch (e) {
            console.error("GetRooms Error:", e);
            return [];
        }
    }

    // 🆕 2. สร้างห้องแชทใหม่
    async createRoom(bu, username, title = "บทสนทนาใหม่") {
        const response = await fetch(`${this.baseUrl}/api/chat/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bu, username, title })
        });
        if (!response.ok) throw new Error(`Failed to create room: ${response.status}`);
        return await response.json();
    }

    // 🆕 3. ดึงประวัติแชทเฉพาะห้องที่เลือก
    async getRoomHistory(roomId) {
        const response = await fetch(`${this.baseUrl}/api/chat/room-history/${roomId}`);
        if (!response.ok) throw new Error(`Failed to fetch history: ${response.status}`);
        return await response.json();
    }

    // 🆕 4. ลบห้องแชท
    async deleteRoom(roomId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat/rooms/${roomId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`Failed to delete room: ${response.status}`);
            return await response.json();
        } catch (e) {
            console.error("DeleteRoom Error:", e);
            throw e;
        }
    }

    // 5. ส่งข้อความแชท (รองรับ room_id ใน payload)
    async sendMessage(payload) {
        const res = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            let errorMsg = "Unknown Error";
            try {
                const errBody = await res.json();
                errorMsg = errBody.detail || JSON.stringify(errBody);
            } catch (e) {
                errorMsg = await res.text();
            }
            throw new Error(`API Error ${res.status}: ${errorMsg}`);
        }

        return await res.json();
    }

    // 6. ส่ง Feedback (Like/Dislike)
    async sendFeedback(msgId, score) {
        try {
            await fetch(`${this.baseUrl}/api/chat/feedback/${msgId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score })
            });
        } catch (e) {
            console.error("Feedback Error:", e);
        }
    }

    // 7. ล้างประวัติ (แบบระบุห้อง - สำหรับปุ่ม Clear ในหน้าแชท)
    async clearHistory(bu, username, roomId) {
        try {
            const params = new URLSearchParams({ bu, username });
            if (roomId) params.append('room_id', roomId);

            const res = await fetch(`${this.baseUrl}/api/chat/history?${params.toString()}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to clear history");
        } catch (e) {
            console.error("ClearHistory Error:", e);
        }
    }

    // (คงไว้สำหรับกรณีใช้แบบไม่มีห้อง - Legacy Support)
    async getHistory(bu, username, sessionId) {
        try {
            const params = new URLSearchParams({
                bu: bu,
                username: username,
                session_id: sessionId || ''
            });
            const res = await fetch(`${this.baseUrl}/chat/history?${params.toString()}`, {
                method: 'GET'
            });
            return res.ok ? await res.json() : [];
        } catch (e) {
            console.warn("API Error:", e);
            return [];
        }
    }
}