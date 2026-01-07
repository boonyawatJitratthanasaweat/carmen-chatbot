(function() {
    const API_URL = "https://carmen-chatbot-api.onrender.com/chat"; 

    // สร้าง Widget
    let container = document.getElementById('carmen-chat-widget');
    if (!container) {
        container = document.createElement('div');
        container.id = 'carmen-chat-widget';
        document.body.appendChild(container);
    }

    // ============================================================
    // ✨ CSS (เพิ่ม .msg-time สำหรับเวลาแยกออกมา)
    // ============================================================
    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600&display=swap');

      #carmen-chat-widget {
          position: fixed; bottom: 20px; right: 20px; z-index: 99999;
          font-family: 'Sarabun', sans-serif;
      }
      .chat-btn { 
          width: 65px; height: 65px; background: #000; 
          border-radius: 50%; box-shadow: 0 8px 24px rgba(0,0,0,0.25); 
          cursor: pointer; display: flex; justify-content: center; align-items: center; 
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      .chat-btn:hover { transform: scale(1.1) rotate(5deg); }
      .chat-btn svg { width: 32px; height: 32px; fill: white; }

      .chat-box { 
          position: absolute; bottom: 85px; right: 0; 
          width: 450px; height: 650px; 
          background: #ffffff; border-radius: 24px; 
          box-shadow: 0 12px 48px rgba(0,0,0,0.15); 
          display: none; flex-direction: column; overflow: hidden; 
          border: 1px solid rgba(0,0,0,0.05);
      }
      .chat-box.open { display: flex; }

      .chat-header { 
          background: linear-gradient(135deg, #222, #000); 
          color: white; padding: 20px; 
          display: flex; justify-content: space-between; align-items: center; 
      }
      .header-tools { display: flex; gap: 15px; align-items: center; }
      .icon-btn { cursor: pointer; opacity: 0.7; transition: 0.2s; display: flex; align-items: center; }
      .icon-btn:hover { opacity: 1; transform: scale(1.1); }
      .icon-btn svg { width: 22px; height: 22px; fill: white; }

      .chat-body { 
          flex: 1; padding: 20px; overflow-y: auto; 
          background: #f8f9fa; 
          display: flex; flex-direction: column; gap: 15px; 
      }
      .msg { 
          max-width: 90%; padding: 12px 16px; 
          font-size: 14.5px; line-height: 1.6; 
          position: relative; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
      }
      .msg.user { background: #000; color: white; align-self: flex-end; border-radius: 18px 18px 4px 18px; }
      .msg.bot { background: #fff; color: #333; align-self: flex-start; border-radius: 18px 18px 18px 4px; border: 1px solid #f0f0f0; }
      
      /* ✅ กล่องเวลา (แยกออกมาข้างนอก) */
      .msg-time {
          font-size: 10px;
          color: #adb5bd; /* สีเทาจางๆ */
          margin-top: -10px; /* ดึงขึ้นไปใกล้นิดนึง */
          margin-bottom: 5px;
          margin-left: 10px;
          align-self: flex-start; /* ชิดซ้ายเหมือนบอท */
          animation: fadeIn 0.5s ease;
      }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

      .video-wrapper {
          position: relative; width: 100%; padding-bottom: 56.25%; height: 0;
          margin-top: 10px; margin-bottom: 5px; border-radius: 12px;
          overflow: hidden; background: #000;
      }
      .video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
      
      .chat-footer { padding: 15px; background: white; border-top: 1px solid #f0f0f0; display: flex; gap: 10px; }
      .chat-input { flex: 1; padding: 14px 20px; background: #f3f4f6; border: none; border-radius: 30px; outline: none; }
      .send-btn { width: 45px; height: 45px; background: #000; color: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      .send-btn svg { width: 20px; height: 20px; fill: white; margin-left: 2px; }
      .typing { font-size: 12px; color: #888; margin-left: 20px; margin-bottom: 5px; display: none; }
      .typing-dots span { animation: blink 1.4s infinite both; font-size: 24px; line-height: 10px; margin: 0 2px; }
      @keyframes blink { 0% { opacity: .2; } 20% { opacity: 1; } 100% { opacity: .2; } }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    container.innerHTML = `
      <div class="chat-btn" onclick="window.carmenToggleChat()">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      </div>
      <div class="chat-box" id="carmenChatWindow">
        <div class="chat-header">
          <div style="display:flex; align-items:center; gap:10px;">
             <div style="width:35px; height:35px; background:rgba(255,255,255,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center;">👩‍💼</div>
             <div><h3 style="margin:0; font-size:16px;">Carmen Assistant</h3><span style="font-size:12px; opacity:0.8;">Online</span></div>
          </div>
          <div class="header-tools">
            <div class="icon-btn" onclick="window.carmenClearChat()" title="ล้างแชท">
                <svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg>
            </div>
            <div class="icon-btn" onclick="window.carmenToggleChat()" title="ปิด">
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </div>
          </div>
        </div>
        <div class="chat-body" id="carmenChatBody"></div>
        <div class="typing" id="carmenTypingIndicator">กำลังพิมพ์ <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></div>
        <div class="chat-footer">
          <input type="text" id="carmenUserInput" class="chat-input" placeholder="พิมพ์คำถาม..." onkeypress="window.carmenCheckEnter(event)">
          <button class="send-btn" onclick="window.carmenSendMessage()"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
        </div>
      </div>
    `;

    // ============================================================
    // Logic
    // ============================================================
    const welcomeMessage = "สวัสดี<br>มีข้อสงสัยเกี่ยวกับระบบ Carmen ถามได้เลย!";

    function getYoutubeId(url) {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : null;
    }

    function addMessage(text, sender, animate) {
      const body = document.getElementById('carmenChatBody');
      const div = document.createElement('div');
      div.className = `msg ${sender}`;
      
      let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
      const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;

      formattedText = formattedText.replace(urlRegex, (url) => {
          const videoId = getYoutubeId(url);
          if (videoId) {
              return `<div class="video-wrapper">
                        <iframe src="https://www.youtube.com/embed/${videoId}?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                      </div>`;
          }
          return `<a href="${url}" target="_blank" style="color:#2563eb; text-decoration:underline;">เปิดลิงก์</a>`;
      });
      formattedText = formattedText.replace(/\[(.*?)\]\((.*?)\)/g, '');

      if (sender === 'bot' && animate) {
          body.appendChild(div);
          if (formattedText.includes('iframe')) {
             div.innerHTML = formattedText; 
             scrollToBottom();
          } else {
             let i = 0; const speed = 20; 
             function typeWriter() {
                 if (i < formattedText.length) {
                     if (formattedText.charAt(i) === '<') {
                         let tag = '';
                         while (formattedText.charAt(i) !== '>' && i < formattedText.length) { tag += formattedText.charAt(i); i++; }
                         tag += '>'; i++; div.innerHTML += tag;
                     } else { div.innerHTML += formattedText.charAt(i); i++; }
                     scrollToBottom(); setTimeout(typeWriter, speed);
                 }
             }
             typeWriter();
          }
      } else {
          div.innerHTML = formattedText;
          body.appendChild(div);
          scrollToBottom();
      }
    }

    // ✅ ฟังก์ชันแสดงเวลาแยกออกมา
    function addTimeTag(duration) {
        const body = document.getElementById('carmenChatBody');
        const div = document.createElement('div');
        div.className = 'msg-time';
        div.innerHTML = `⏱ ${duration}s`;
        body.appendChild(div);
        scrollToBottom();
    }

    window.carmenClearChat = function() {
        const body = document.getElementById('carmenChatBody');
        body.innerHTML = '';
        addMessage(welcomeMessage, 'bot', true);
    };
    window.carmenToggleChat = function() {
        const box = document.getElementById('carmenChatWindow');
        box.classList.toggle('open');
        if(box.classList.contains('open')) document.getElementById('carmenUserInput').focus();
    };
    window.carmenCheckEnter = function(e) { if (e.key === 'Enter') window.carmenSendMessage(); };

    window.carmenSendMessage = async function() {
        const input = document.getElementById('carmenUserInput');
        const text = input.value.trim();
        if (!text) return;
        
        addMessage(text, 'user', false);
        input.value = '';
        document.getElementById('carmenTypingIndicator').style.display = 'block';
        scrollToBottom();

        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); 
        const fakeDelay = new Promise(resolve => setTimeout(resolve, 1500));

        try {
            const [response] = await Promise.all([
                fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text }),
                    signal: controller.signal
                }),
                fakeDelay
            ]);
            
            clearTimeout(timeoutId);
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            const data = await response.json();
            document.getElementById('carmenTypingIndicator').style.display = 'none';
            
            if (data.answer) {
                addMessage(data.answer, 'bot', true);
                // ✅ เพิ่มเวลาแยกออกมาข้างนอก
                setTimeout(() => addTimeTag(duration), 100); 
            } else {
                addMessage("ขออภัยค่ะ ไม่ได้รับคำตอบ", 'bot', true);
            }

        } catch (error) {
            document.getElementById('carmenTypingIndicator').style.display = 'none';
            if (error.name === 'AbortError') {
                addMessage("⏳ ใช้เวลานานเกินไป กรุณาลองใหม่ในอีกสักครู่นะคะ", 'bot', true);
            } else {
                addMessage("⚠️ เชื่อมต่อ Server ไม่ได้ค่ะ", 'bot', true);
            }
        }
    };
    function scrollToBottom() { const body = document.getElementById('carmenChatBody'); body.scrollTop = body.scrollHeight; }
    
    addMessage(welcomeMessage, 'bot', false);
})();