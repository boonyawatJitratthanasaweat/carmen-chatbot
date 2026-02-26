import { STRINGS } from './constants.js';
import { formatMessageContent } from './utils.js';
import { createTypingIndicatorHTML } from './dom.js';

export class ChatManager {
    constructor(bot) {
        this.bot = bot;
        this.api = bot.api;
        this.roomKey = `carmen_room_${bot.bu}_${bot.username}`;
        this.typingBuffer = "";
        this.isTyping = false;
    }

    async createNewChat() {
        this.bot.currentRoomId = null;
        localStorage.removeItem(this.roomKey);
        this.bot.ui.showWelcomeMessage();
        await this.loadRoomList();
    }

    async switchRoom(roomId) {
        if (this.bot.currentRoomId === roomId) return;
        this.bot.currentRoomId = roomId;
        localStorage.setItem(this.roomKey, roomId);

        await this.loadHistory(roomId);
        await this.loadRoomList();
    }

    async deleteChatRoom(roomId) {
        this.bot.ui.showModal({
            icon: '🗑️',
            title: STRINGS.delete_room_confirm_title,
            text: STRINGS.delete_room_confirm_desc,
            confirmText: 'ลบทิ้ง',
            cancelText: STRINGS.alert_cancel,
            onConfirm: async () => {
                try {
                    await this.api.deleteRoom(roomId);
                    if (this.bot.currentRoomId === roomId) {
                        this.createNewChat();
                    } else {
                        await this.loadRoomList();
                    }
                } catch (error) {
                    console.error('Delete Error:', error);
                }
            }
        });
    }

    async loadRoomList() {
        try {
            const rooms = await this.api.getRooms(this.bot.bu, this.bot.username);
            this.bot.ui.renderRoomList(rooms, this.bot.currentRoomId);
        } catch (err) {
            console.error("Room List Error:", err);
        }
    }

    async loadHistory(roomId) {
        const body = this.bot.ui.findElement('carmenChatBody');
        if (!body) return;

        // Only show loading if empty to prevent flickering on refresh
        if (body.children.length === 0) {
            body.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;">${STRINGS.history_loading}</div>`;
        }

        try {
            const data = await this.api.getRoomHistory(roomId);
            body.innerHTML = '';

            if (data.messages && data.messages.length > 0) {
                data.messages.forEach(msg => {
                    this.bot.ui.addMessage(msg.message, msg.sender, msg.id, msg.sources);
                });
                setTimeout(() => this.bot.ui.scrollToBottom(), 100);
            } else {
                this.bot.ui.showWelcomeMessage();
            }
        } catch (err) {
            console.warn("History Load Error:", err);
            this.createNewChat();
        }
    }

    async sendMessage(message = null) {
        const input = this.bot.ui.findElement('carmenUserInput');
        const text = message || input.value.trim();
        if (!text && !this.bot.currentImageBase64) return;

        // Ensure Room exists
        if (!this.bot.currentRoomId) {
            try {
                const roomTitle = text.substring(0, 30) + (text.length > 30 ? '...' : '');
                const newRoom = await this.api.createRoom(this.bot.bu, this.bot.username, roomTitle);
                this.bot.currentRoomId = newRoom.room_id;
                localStorage.setItem(this.roomKey, this.bot.currentRoomId);
                await this.loadRoomList();
            } catch (err) {
                this.bot.ui.addMessage("⚠️ สร้างห้องสนทนาไม่สำเร็จ", 'bot');
                return;
            }
        }

        // Display User Message
        let displayHTML = text;
        if (this.bot.currentImageBase64) {
            displayHTML = `<img src="${this.bot.currentImageBase64}" style="max-width:100%; border-radius:8px; margin-bottom:5px;"><br>${text}`;
        }
        this.bot.ui.addMessage(displayHTML, 'user');

        // Clear Input State
        input.value = '';
        const imageToSend = this.bot.currentImageBase64;
        this.bot.ui.clearImageSelection();
        if (this.bot.ui.shadow) this.bot.ui.shadow.querySelectorAll('.suggestions-container').forEach(el => el.remove());

        // Show Typing Indicator
        const botUI = this.bot.ui.addStreamingMessage();
        if (botUI.loader) botUI.loader.style.display = 'none'; // Hide default spinner

        // Add custom typing indicator
        const typingHTML = createTypingIndicatorHTML();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = typingHTML;
        const typingNode = tempDiv.firstElementChild;
        botUI.container.appendChild(typingNode);
        this.bot.ui.scrollToBottom();

        let fullBotText = "";
        let sourcesData = null;
        let messageId = null;

        try {
            const response = await fetch(`${this.bot.apiBase}/api/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text, image: imageToSend, bu: this.bot.bu,
                    username: this.bot.username, room_id: this.bot.currentRoomId,
                    prompt_extend: this.bot.prompt_extend
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            this.typingBuffer = "";
            let displayedText = "";
            let firstChunk = true;

            const processTyping = () => {
                if (this.typingBuffer.length > 0) {
                    // Remove typing indicator on first text
                    if (firstChunk) {
                        if (typingNode) typingNode.remove();
                        if (botUI.span) botUI.span.style.display = 'block';
                        firstChunk = false;
                    }

                    // Take few chars if buffer is large to keep up
                    const charsToTake = this.typingBuffer.length > 50 ? 5 : (this.typingBuffer.length > 10 ? 2 : 1);
                    displayedText += this.typingBuffer.substring(0, charsToTake);
                    this.typingBuffer = this.typingBuffer.substring(charsToTake);

                    if (botUI.span) {
                        botUI.span.innerHTML = formatMessageContent(displayedText, this.bot.apiBase);
                        this.bot.ui.scrollToBottom();
                    }
                }

                if (this.isTyping || this.typingBuffer.length > 0) {
                    requestAnimationFrame(() => setTimeout(processTyping, 15));
                }
            };

            this.isTyping = true;
            processTyping();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                // console.log('Chunk received:', chunk);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.type === "chunk") {
                            this.typingBuffer += json.data;
                        } else if (json.type === "sources") {
                            sourcesData = json.data;
                        } else if (json.type === "done") {
                            messageId = json.id;
                            this.loadRoomList();
                        }
                    } catch (e) { }
                }
            }
            this.isTyping = false;

            // Cleanup & Extras
            if (botUI.loader) botUI.loader.remove();
            if (messageId && botUI.container) {
                const { createMessageExtras } = await import('./dom.js');
                const extrasHTML = createMessageExtras('bot', messageId, sourcesData);
                botUI.container.insertAdjacentHTML('beforeend', extrasHTML);
                this.bot.bindCopyEvent(botUI.container);
            }

        } catch (error) {
            console.error("Stream Error:", error);
        }
    }
}
