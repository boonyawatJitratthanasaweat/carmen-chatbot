export class CarmenBot {
    constructor(config = {}) {
        // 1. API URL Configuration
        const defaultUrl = "https://carmen-chatbot-api.onrender.com"; 
        const urlToUse = config.apiUrl || defaultUrl;
        this.apiBase = urlToUse.replace(/\/$/, "");

        // 2. User & Context Configuration
        this.bu = config.bu || "global";          
        this.username = config.user || "Guest";   
        this.theme = config.theme || null;        
        this.title = config.title || null;        
        this.prompt_extend = config.prompt_extend || null; 

        // Session Management
        this.sessionKey = `carmen_sess_${this.bu}_${this.username}`;
        this.sessionId = localStorage.getItem(this.sessionKey);
        if (!this.sessionId) {
            this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            localStorage.setItem(this.sessionKey, this.sessionId);
        }

        // Suggested Questions
        this.suggestedQuestions = [
            "กดปุ่ม refresh ใน workbook ไม่ได้ ทำยังไง",
            "บันทึกใบกำกับภาษีซื้อ ใน excel แล้ว import ได้หรือไม่",
            "program carmen สามารถ upload file เข้า program RDPrep ของสรรพากรได้ หรือไม่",
            "ฉันสามารถสร้าง ใบเสร็จรับเงิน โดยไม่เลือก Tax Invoice ได้หรือไม่",
            "ฉันสามารถบันทึก JV โดยที่ debit และ credit ไม่เท่ากันได้หรือไม่"
        ];

        this.init();
    }

    init() {
        this.injectStyles();
        this.createDOM();
        this.attachEvents();
        this.setupGlobalFunctions();
        this.showLauncher();
        
        // Update User Display Name
        const userDisplay = document.getElementById('carmenUserDisplay');
        if (userDisplay) {
            userDisplay.innerText = `${this.bu !== 'global' ? `[${this.bu}] ` : ''}${this.username}`;
        }

        this.loadHistory();
    }

    injectStyles() {
        if (document.getElementById('carmen-style')) return;
        
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);

        const styles = `
            #carmen-chat-widget { position: fixed; bottom: 20px; right: 20px; z-index: 99990; font-family: 'Sarabun', sans-serif; line-height: 1.5; }
            #carmen-chat-widget * { box-sizing: border-box; color: #334155; }

            /* Launcher & Icons */
            .chat-btn { width: 60px; height: 60px; background: #2563eb; border-radius: 50%; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); cursor: pointer; display: flex; justify-content: center; align-items: center; transition: all 0.3s; display: none; }
            .chat-btn:hover { transform: scale(1.1); background: #1e40af; }
            .chat-btn svg { width: 28px; height: 28px; fill: white !important; }
            .chat-btn svg path { fill: white !important; }

            .chat-box { position: absolute; bottom: 80px; right: 0; width: 380px; height: 550px; max-height: 80vh; background: #ffffff; border-radius: 16px; box-shadow: 0 5px 40px rgba(0,0,0,0.16); display: none; flex-direction: column; overflow: hidden; border: 1px solid #e5e7eb; animation: carmenSlideUp 0.3s ease; }
            .chat-box.open { display: flex; }
            @keyframes carmenSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

            /* Header */
            .chat-header { background: #2563eb; color: white !important; padding: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e40af; }
            .chat-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: white !important; }
            .chat-header span { font-size: 12px; opacity: 0.9; color: white !important; }
            .header-tools { display: flex; gap: 12px; }
            .icon-btn { cursor: pointer; opacity: 0.8; transition: 0.2s; display: flex; align-items: center; }
            .icon-btn:hover { opacity: 1; transform: scale(1.1); }
            .icon-btn svg { width: 18px; height: 18px; fill: white !important; }
            .icon-btn svg path { fill: white !important; }

            .chat-body { flex: 1; padding: 16px; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
            .chat-body::-webkit-scrollbar { width: 6px; }
            .chat-body::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; }

            /* Messages */
            .msg { max-width: 80%; padding: 12px 16px; font-size: 14px; border-radius: 12px; word-wrap: break-word; position: relative !important; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
            .msg.user { background: #2563eb; color: white !important; align-self: flex-end; border-radius: 12px 12px 2px 12px; }
            .msg.bot { background: white; color: #334155; align-self: flex-start; border-radius: 12px 12px 12px 2px; border: 1px solid #e2e8f0; padding-bottom: 32px !important; }

            /* Suggestions */
            .suggestions-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; animation: fadeIn 0.5s ease forwards; align-self: flex-end; justify-content: flex-end; width: 100%; }
            .suggestion-chip { background: white; border: 1px solid #cbd5e1; border-radius: 20px; padding: 6px 12px; font-size: 12px; color: #475569; cursor: pointer; transition: 0.2s; }
            .suggestion-chip:hover { background: #2563eb; color: white; border-color: #2563eb; }
            
            /* ✅ เพิ่ม Keyframes สำหรับ fadeIn ที่เคยหายไป */
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

            /* Tools */
            .copy-btn { position: absolute; bottom: 6px; right: 8px; width: 24px; height: 24px; background: transparent; border: none; cursor: pointer; opacity: 0.6; transition: 0.2s; display: flex !important; align-items: center; justify-content: center; z-index: 10; }
            .copy-btn:hover { opacity: 1; background: #f1f5f9; border-radius: 4px; }
            .copy-btn svg { width: 14px; height: 14px; fill: #64748b !important; }
            .copy-btn svg path { fill: #64748b !important; }
            
            .feedback-container { position: absolute; bottom: 6px; right: 40px; display: flex; gap: 8px; z-index: 10; }
            .feedback-btn { font-size: 12px; cursor: pointer; opacity: 0.5; transition: 0.2s; }
            .feedback-btn:hover { opacity: 1; transform: scale(1.2); }

            .typing-indicator { font-size: 12px; color: #94a3b8; margin-left: 16px; margin-bottom: 5px; display: none; }
            .msg.bot.typing::after { content: '▋'; animation: blink 1s infinite; }
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

            .chat-footer { padding: 12px; background: white; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; align-items: center; }
            .chat-input { 
                flex: 1; padding: 10px 14px; border-radius: 24px; 
                border: 1px solid #cbd5e1; outline: none; background: #f8fafc; 
                font-family: 'Sarabun', sans-serif; font-size: 14px;
                color: #334155 !important;
            }
            .chat-input::placeholder { color: #94a3b8 !important; opacity: 1; }
            .chat-input:focus { border-color: #2563eb; background: white; }
            
            .send-btn { width: 36px; height: 36px; background: #2563eb; color: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; padding: 0; }
            .send-btn:hover { background: #1e40af; }
            .send-btn svg { width: 18px !important; height: 18px !important; fill: white !important; display: block; }
            .send-btn svg path { fill: white !important; stroke: none !important; }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.id = 'carmen-style';
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    }

    createDOM() {
        if (document.getElementById('carmen-chat-widget')) return;

        const container = document.createElement('div');
        container.id = 'carmen-chat-widget';
        container.innerHTML = `
            <div class="chat-btn" id="carmen-launcher">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path fill="white" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <div class="chat-box" id="carmenChatWindow">
                <div class="chat-header">
                   <div style="display:flex; align-items:center; gap:10px;">
                     <div style="font-size:24px;">👩‍💼</div>
                     <div>
                       <h3>"Carmen AI"</h3>
                     </div>
                   </div>
                   <div class="header-tools">
                     <div class="icon-btn" id="carmen-clear-btn" title="ล้างแชท"><svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path fill="white" d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg></div>
                     <div class="icon-btn" id="carmen-close-btn"><svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path fill="white" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></div>
                   </div>
                </div>
                <div class="chat-body" id="carmenChatBody"></div>
                <div class="typing-indicator" id="carmenTypingIndicator">Carmen กำลังพิมพ์...</div>
                <div class="chat-footer">
                  <input type="text" id="carmenUserInput" class="chat-input" placeholder="พิมพ์ข้อความ...">
                  <button class="send-btn" id="carmen-send-btn">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="white" style="fill:white;">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white" style="fill:white;"/>
                    </svg>
                  </button>
                </div>
            </div>
        `;
        document.body.appendChild(container);
    }

    setupGlobalFunctions() {
        window.carmenRate = async (msgId, score, btnElement) => {
            const parent = btnElement.parentElement;
            parent.innerHTML = score === 1 
                ? '<span style="font-size:11px; color:#16a34a;">ขอบคุณค่ะ ❤️</span>' 
                : '<span style="font-size:11px; color:#991b1b;">ขอบคุณค่ะ 🙏</span>';
            
            try {
                await fetch(`${this.apiBase}/chat/feedback/${msgId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ score: score })
                });
            } catch(e) { console.error(e); }
        };
    }

    attachEvents() {
        const launcher = document.getElementById('carmen-launcher');
        const win = document.getElementById('carmenChatWindow');
        const closeBtn = document.getElementById('carmen-close-btn');
        const clearBtn = document.getElementById('carmen-clear-btn');
        const sendBtn = document.getElementById('carmen-send-btn');
        const input = document.getElementById('carmenUserInput');

        launcher.onclick = () => {
            win.classList.toggle('open');
            if (win.classList.contains('open')) {
                setTimeout(() => this.scrollToBottom(), 0);
            }
        };

        closeBtn.onclick = () => win.classList.remove('open');
        
        clearBtn.onclick = () => {
            document.getElementById('carmenChatBody').innerHTML = '';
            this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            localStorage.setItem(`carmen_sess_${this.bu}_${this.username}`, this.sessionId);
            this.addMessage(`ล้างแชทเรียบร้อยค่ะ ✨`, 'bot', true);
            setTimeout(() => this.addSuggestions(), 1000);
        };

        sendBtn.onclick = () => this.sendMessage();
        input.onkeypress = (e) => { if(e.key === 'Enter') this.sendMessage(); };
    }

    showLauncher() {
        const btn = document.getElementById('carmen-launcher');
        if(btn) btn.style.display = 'flex';
    }

    async loadHistory() {
        const body = document.getElementById('carmenChatBody');
        body.innerHTML = '';
        
        try {
            const params = new URLSearchParams({ bu: this.bu, session_id: this.sessionId });
            const res = await fetch(`${this.apiBase}/chat/history?${params.toString()}`, { method: 'GET' });

            if (res.ok) {
                const history = await res.json();
                if (history.length > 0) {
                    history.forEach(msg => this.addMessage(msg.message, msg.sender, false));
                    const divider = document.createElement('div');
                    divider.style.cssText = 'text-align:center; font-size:11px; color:#94a3b8; margin:10px 0;';
                    divider.innerText = '— ประวัติการสนทนาล่าสุด —';
                    body.appendChild(divider);
                    setTimeout(() => this.scrollToBottom(), 100); 
                } else {
                    this.addMessage(`สวัสดีค่ะ 👋<br>มีอะไรให้ Carmen ช่วยไหมคะ?`, 'bot', true);
                }
            } else { throw new Error("Failed to load history"); }
        } catch (e) {
            console.warn("History Load Error:", e);
            this.addMessage(`สวัสดีค่ะ 👋<br>มีอะไรให้ Carmen ช่วยไหมคะ?`, 'bot', true);
        }
        setTimeout(() => this.addSuggestions(), 800);
    }

    async sendMessage() {
        const input = document.getElementById('carmenUserInput');
        const text = input.value.trim();
        if(!text) return;
        
        this.addMessage(text, 'user', false);
        input.value = '';
        
        // ลบ Suggestions ออกเมื่อเริ่มคุย
        const suggestions = document.querySelectorAll('.suggestions-container');
        suggestions.forEach(el => el.remove());

        document.getElementById('carmenTypingIndicator').style.display = 'block';
        this.scrollToBottom();

        try {
            const payload = {
                text: text,
                bu: this.bu,
                username: this.username,
                session_id: this.sessionId
            };
            if (this.theme) payload.theme = this.theme;
            if (this.title) payload.title = this.title;
            if (this.prompt_extend) payload.prompt_extend = this.prompt_extend;

            const response = await fetch(`${this.apiBase}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            document.getElementById('carmenTypingIndicator').style.display = 'none';
            if(data.answer) this.addMessage(data.answer, 'bot', true, data.message_id, data.sources);
        } catch (error) {
            console.error(error);
            document.getElementById('carmenTypingIndicator').style.display = 'none';
            this.addMessage("⚠️ Error: เชื่อมต่อไม่ได้", 'bot', true);
        }
    }

    addSuggestions() {
        // ✅ 1. ลบของเก่าออกก่อนเสมอกันซ้ำ
        const existing = document.querySelectorAll('.suggestions-container');
        existing.forEach(el => el.remove());

        const body = document.getElementById('carmenChatBody');
        const div = document.createElement('div');
        div.className = 'suggestions-container';

        this.suggestedQuestions.forEach(q => {
            const chip = document.createElement('div');
            chip.className = 'suggestion-chip';
            chip.innerText = q;
            chip.onclick = () => {
                document.getElementById('carmenUserInput').value = q;
                this.sendMessage();
            };
            div.appendChild(chip);
        });
        body.appendChild(div);
        this.scrollToBottom();
    }

    getYoutubeId(url) {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : null;
    }

  addMessage(text, sender, animate = false, msgId = null, sources = null) {
        const body = document.getElementById('carmenChatBody');
        const div = document.createElement('div');
        div.className = `msg ${sender}`;


        let formattedText = text;
        const imageRegex = /!\[(.*?)\]\s*\((.*?)\)/g;

        formattedText = formattedText.replace(imageRegex, (match, alt, url) => {
            // ลบช่องว่างหัวท้าย (เผื่อมี)
            let cleanUrl = url.trim();
            
            console.log("🔍 Found Image Markdown:", match); // เช็ค Log 1
            console.log("👉 Extracted URL:", cleanUrl);    // เช็ค Log 2

            // เช็คว่าเป็นรูปในเครื่องเราไหม (images/xxx หรือ ./images/xxx)
            if (cleanUrl.includes('images/') || cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg')) {
                
                // ลบ ./ หรือ / ตัวหน้าสุดออก (เพื่อให้ต่อ String ง่ายๆ)
                cleanUrl = cleanUrl.replace(/^(\.\/|\/)/, '');

                // ⚠️ สำคัญ: ต้องมั่นใจว่า apiBaseUrl ไม่มี / ปิดท้าย
                const baseUrl = this.apiBaseUrl.replace(/\/$/, '');
                const fullUrl = `${baseUrl}/${cleanUrl}`;
                
                console.log("✅ Final Image URL:", fullUrl); // เช็ค Log 3: ดูว่า URL ถูกไหม

                return `
                    <div style="margin-top: 10px; margin-bottom: 10px;">
                        <img src="${fullUrl}" 
                             alt="${alt}" 
                             style="max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.05);" 
                             onclick="window.open(this.src, '_blank')"
                             onerror="this.style.display='none'; console.log('❌ Failed to load image:', this.src);"
                        >
                    </div>`;
            }
            
            // กรณีเป็น Link ภายนอก (http...)
            return `<img src="${cleanUrl}" alt="${alt}" style="max-width: 100%; border-radius: 8px; margin-top: 10px;">`;
        });

       
        let sourcesHTML = '';
        if (sender === 'bot' && sources && sources.length > 0) {
            sourcesHTML = `
                <details style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    <summary style="cursor: pointer; font-size: 11px; color: #64748b; outline: none; list-style: none;">
                        📚 อ้างอิงจาก ${sources.length} เอกสาร <span style="font-size: 9px;">▼</span>
                    </summary>
                    <div style="margin-top: 5px; display: flex; flex-direction: column; gap: 5px;">
                        ${sources.map(s => `
                            <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; font-size: 10px; color: #475569;">
                                <strong>📄 ${s.source} (Page ${s.page})</strong>
                                <div style="margin-top:2px; opacity:0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    "${s.content.substring(0, 50)}..."
                                </div>
                                <div style="font-size:9px; color:#94a3b8;">Score: ${s.score}</div>
                            </div>
                        `).join('')}
                    </div>
                </details>
            `;
        }

        

        // ---------------------------------------------------------
        // 2. จัดการ Text Format และ Video
        // --------------------------------------------------------

        let videoContent = "";
        const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;
        formattedText = formattedText.replace(urlRegex, (url) => {
            const videoId = this.getYoutubeId(url);
            if (videoId) {
                videoContent += `<div style="position:relative; width:100%; padding-bottom:56.25%; height:0; border-radius:8px; overflow:hidden; margin-top:8px;">
                                    <iframe src="https://www.youtube.com/embed/${videoId}?rel=0" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
                                 </div>`;
                return `<a href="${url}" target="_blank" style="color:#2563eb; text-decoration:underline;">(ดูวิดีโอ)</a>`;
            }
            return `<a href="${url}" target="_blank" style="color:#2563eb;">${url}</a>`;
        });

        // ---------------------------------------------------------
        // 3. สร้าง Tools Bar (Copy + Feedback) - ✅ ใส่ Style ให้ครบ
        // ---------------------------------------------------------
        let toolsHTML = '';
        if (sender === 'bot') {
            toolsHTML = `
                <div class="tools-container" style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 6px; padding-top: 4px;">
                    
                    <button class="copy-btn" title="คัดลอก" style="background: none; border: none; cursor: pointer; opacity: 0.6; padding: 2px;">
                        <svg viewBox="0 0 24 24" width="14" height="14" style="display:block;">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="#64748b"/>
                        </svg>
                    </button>

                    ${msgId ? `
                        <div style="width: 1px; height: 12px; background: #cbd5e1;"></div>

                        <div style="display: flex; gap: 5px;">
                            <button class="feedback-btn" onclick="window.carmenRate('${msgId}', 1, this)" title="มีประโยชน์" style="background: none; border: none; cursor: pointer; font-size: 12px; opacity: 0.7; padding: 0;">👍</button>
                            <button class="feedback-btn" onclick="window.carmenRate('${msgId}', -1, this)" title="ไม่ถูกต้อง" style="background: none; border: none; cursor: pointer; font-size: 12px; opacity: 0.7; padding: 0;">👎</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        body.appendChild(div);

        // Logic ผูก Event ปุ่ม Copy (ต้องทำหลังจาก append ลง DOM แล้ว)
        const bindCopyEvent = (element) => {
            const btn = element.querySelector('.copy-btn');
            if (btn) {
                btn.onclick = () => {
                    const rawText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/<br>/g, '\n');
                    navigator.clipboard.writeText(rawText).then(() => {
                        // เปลี่ยน Icon เป็นสีเขียวชั่วคราว
                        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#16a34a"/></svg>`;
                        btn.style.opacity = '1';
                        setTimeout(() => {
                            btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" style="display:block;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="#64748b"/></svg>`;
                            btn.style.opacity = '0.6';
                        }, 2000);
                    });
                };
            }
        };

        // ---------------------------------------------------------
        // 4. Animation Logic
        // ---------------------------------------------------------
        if (sender === 'bot' && animate) {
            div.classList.add('typing');
            let i = 0; const speed = 10;
            // รวม HTML ทั้งหมด
            const fullContent = formattedText + videoContent + sourcesHTML + toolsHTML;
            
            div.innerHTML = ""; // เคลียร์ก่อนเริ่มพิมพ์
            
            const typeWriter = () => {
                if (i < formattedText.length) {
                    if (formattedText.charAt(i) === '<') {
                        let tag = '';
                        while (formattedText.charAt(i) !== '>' && i < formattedText.length) { tag += formattedText.charAt(i); i++; }
                        tag += '>'; i++; div.innerHTML += tag;
                    } else { div.innerHTML += formattedText.charAt(i); i++; }
                    this.scrollToBottom(); 
                    setTimeout(typeWriter, speed);
                } else {
                    div.classList.remove('typing');
                    div.innerHTML = fullContent; // แปะเนื้อหาครบทุกอย่าง (Video, Sources, Tools)
                    
                    // ผูก Event Copy ใหม่หลังจาก Animation จบ
                    bindCopyEvent(div);
                    this.scrollToBottom();
                }
            };
            typeWriter();
        } else {
            // กรณีไม่มี Animation
            div.innerHTML = formattedText + videoContent + sourcesHTML + toolsHTML;
            bindCopyEvent(div);
            this.scrollToBottom();
        }
    }

    scrollToBottom() {
        const body = document.getElementById('carmenChatBody');
        if(body) body.scrollTop = body.scrollHeight;
    }
}