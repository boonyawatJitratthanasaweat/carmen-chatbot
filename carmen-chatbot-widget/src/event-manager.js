import { STRINGS } from './constants.js';

export class EventManager {
    constructor(bot) {
        this.bot = bot;
        this.closeTimeout = null;
    }

    attach() {
        const win = this.bot.ui.findElement('carmenChatWindow');
        const launcher = this.bot.ui.findElement('carmen-launcher');
        const closeBtn = this.bot.ui.findElement('carmen-close-btn');
        const expandBtn = this.bot.ui.findElement('carmen-expand-btn');
        const newChatBtn = this.bot.ui.findElement('new-chat-btn');
        const roomListContainer = this.bot.ui.findElement('carmenRoomList');
        const menuBtn = this.bot.ui.findElement('carmen-menu-btn');
        const sidebar = this.bot.ui.findElement('carmenSidebar');
        const header = this.bot.ui.findElement('.chat-header');
        // const container = document.getElementById('carmen-chat-widget'); // This is no longer the draggable target

        const closeWin = () => {
            if (win.classList.contains('closing')) return;
            win.classList.add('closing');

            if (sidebar) sidebar.classList.remove('sidebar-visible');
            localStorage.setItem(`carmen_open_${this.bot.bu}`, 'false');
            localStorage.setItem(`carmen_expanded_${this.bot.bu}`, 'false');

            this.closeTimeout = setTimeout(() => {
                win.classList.remove('open', 'expanded', 'closing');
                this.closeTimeout = null;
            }, 800);
        };

        if (launcher) {
            launcher.onclick = () => {
                const isOpen = win.classList.contains('open');
                const isClosing = win.classList.contains('closing');
                if (isOpen && !isClosing) {
                    closeWin();
                } else {
                    if (this.closeTimeout) {
                        clearTimeout(this.closeTimeout);
                        this.closeTimeout = null;
                    }
                    win.classList.remove('closing');
                    win.classList.add('open');
                    localStorage.setItem(`carmen_open_${this.bot.bu}`, 'true');
                    if (sidebar) sidebar.classList.remove('sidebar-visible');
                    setTimeout(() => this.bot.ui.scrollToBottom(), 100);
                }
            };
        }

        if (header && win) {
            // Restore saved chat box position
            const savedPos = localStorage.getItem(`carmen_chat_pos_${this.bot.bu}`);
            if (savedPos) {
                try {
                    const pos = JSON.parse(savedPos);
                    win.style.bottom = pos.bottom;
                    win.style.right = pos.right;
                } catch (e) { }
            }
            this._setupDraggable(header, win);
        }

        if (closeBtn) closeBtn.onclick = closeWin;
        if (expandBtn) {
            expandBtn.onclick = () => {
                const isExpanding = !win.classList.contains('expanded');
                win.classList.add('resizing');
                win.classList.toggle('expanded');
                localStorage.setItem(`carmen_expanded_${this.bot.bu}`, isExpanding ? 'true' : 'false');

                if (isExpanding) {
                    // Clear custom positioning so it fills screen
                    win.style.bottom = '';
                    win.style.right = '';
                } else {
                    // Restore custom positioning
                    const savedPos = localStorage.getItem(`carmen_chat_pos_${this.bot.bu}`);
                    if (savedPos) {
                        try {
                            const pos = JSON.parse(savedPos);
                            win.style.bottom = pos.bottom;
                            win.style.right = pos.right;
                        } catch (e) { }
                    }
                }

                if (!isExpanding && sidebar) sidebar.classList.remove('sidebar-visible');
                setTimeout(() => {
                    win.classList.remove('resizing');
                    this.bot.ui.scrollToBottom();
                }, 600);
            };
        }
        if (newChatBtn) newChatBtn.onclick = () => this.bot.chat.createNewChat();
        if (roomListContainer) {
            roomListContainer.onclick = async (e) => {
                const deleteBtn = e.target.closest('.delete-room-btn');
                const roomItem = e.target.closest('.room-item');
                if (deleteBtn) {
                    e.stopPropagation();
                    const rId = deleteBtn.getAttribute('data-id');
                    this.bot.chat.deleteChatRoom(rId);
                    return;
                }
                if (roomItem) {
                    const rId = roomItem.getAttribute('data-id');
                    this.bot.chat.switchRoom(rId);
                }
            };
        }
        if (menuBtn && sidebar) menuBtn.onclick = () => sidebar.classList.toggle('sidebar-visible');

        const clearBtn = this.bot.ui.findElement('carmen-clear-btn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                if (!this.bot.currentRoomId) return;
                this.bot.ui.showModal({
                    icon: '🗑️',
                    title: STRINGS.clear_history_confirm_title,
                    text: STRINGS.clear_history_confirm_desc,
                    confirmText: 'ลบเลย',
                    cancelText: STRINGS.alert_cancel,
                    onConfirm: async () => {
                        await this.bot.api.clearHistory(this.bot.bu, this.bot.username, this.bot.currentRoomId);
                        await this.bot.chat.loadHistory(this.bot.currentRoomId);
                    }
                });
            };
        }

        const attachBtn = this.bot.ui.findElement('carmen-attach-btn');
        if (attachBtn) {
            const fileInput = this.bot.ui.findElement('carmen-file-input');
            attachBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                    this.bot.ui.showModal({ icon: '⚠️', title: STRINGS.file_too_large, text: STRINGS.file_too_large_desc });
                    fileInput.value = ''; return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.bot.currentImageBase64 = event.target.result;
                    const previewContainer = this.bot.ui.findElement('carmenImagePreview');
                    const previewImg = this.bot.ui.findElement('preview-img-element');
                    if (previewContainer && previewImg) {
                        previewImg.src = this.bot.currentImageBase64;
                        previewContainer.style.display = 'flex';
                    }
                };
                reader.readAsDataURL(file);
            };
        }
        const clearImgBtn = this.bot.ui.findElement('clear-image-btn');
        if (clearImgBtn) clearImgBtn.onclick = () => this.bot.ui.clearImageSelection();

        const sendBtn = this.bot.ui.findElement('carmen-send-btn');
        const userInput = this.bot.ui.findElement('carmenUserInput');
        if (sendBtn) sendBtn.onclick = () => {
            this.bot.chat.sendMessage();
            if (userInput) { userInput.style.height = 'auto'; } // Reset height
        };

        if (userInput) {
            // Auto-expand logic
            userInput.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });

            // Smart Enter logic
            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.bot.chat.sendMessage();
                    userInput.style.height = 'auto'; // Reset height
                }
            });
        }
    }

    _setupDraggable(handle, element) {
        let startX = 0, startY = 0;
        let startBottom = 0, startRight = 0;
        let isMoving = false;
        let rafId = null;

        const onStart = (e) => {
            if (element.classList.contains('expanded')) return;
            const event = e.type.startsWith('touch') ? e.touches[0] : e;
            startX = event.clientX;
            startY = event.clientY;

            const style = window.getComputedStyle(element);
            startBottom = parseInt(style.bottom) || 84;
            startRight = parseInt(style.right) || 0;

            window.addEventListener('mousemove', onMove, { passive: false });
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('touchend', onEnd);

            isMoving = false;
            element.style.transition = 'none';
            document.body.style.userSelect = 'none'; // Prevent text selection
            document.body.style.webkitUserSelect = 'none';
        };

        const onMove = (e) => {
            const event = e.type.startsWith('touch') ? e.touches[0] : e;
            const currentX = event.clientX;
            const currentY = event.clientY;

            if (!isMoving && Math.abs(currentX - startX) < 5 && Math.abs(currentY - startY) < 5) return;

            if (!isMoving) {
                isMoving = true;
                element.style.top = 'auto';
                element.style.left = 'auto';
            }

            if (e.cancelable) e.preventDefault();

            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                const deltaX = startX - currentX;
                const deltaY = startY - currentY;

                const nextBottom = startBottom + deltaY;
                const nextRight = startRight + deltaX;

                const rect = element.getBoundingClientRect();
                const minB = -22;
                const maxB = window.innerHeight - rect.height - 42;
                const minR = -22;
                const maxR = window.innerWidth - rect.width - 42;

                element.style.bottom = Math.min(Math.max(minB, nextBottom), maxB) + "px";
                element.style.right = Math.min(Math.max(minR, nextRight), maxR) + "px";
            });
        };

        const onEnd = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);

            if (rafId) cancelAnimationFrame(rafId);

            element.style.transition = '';
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';

            if (isMoving) {
                localStorage.setItem(`carmen_chat_pos_${this.bot.bu}`, JSON.stringify({
                    bottom: element.style.bottom,
                    right: element.style.right
                }));
            }
        };

        handle.addEventListener('mousedown', onStart);
        handle.addEventListener('touchstart', onStart, { passive: true });
        handle.style.cursor = 'move';
    }
}
