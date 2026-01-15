// frontend/admin-api.js

export class AdminAPI {
    constructor(baseUrl = "") {
        this.baseUrl = baseUrl;
    }

    async _fetch(endpoint, options = {}) {
        try {
            const res = await fetch(`${this.baseUrl}${endpoint}`, options);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "API Error");
            }
            return await res.json();
        } catch (e) {
            console.error(`Error fetching ${endpoint}:`, e);
            throw e;
        }
    }

    // 📊 Logs & Analytics
    async getLogs(bu = "all") {
        // ส่ง query param ?bu=... ไปให้ backend กรอง
        return this._fetch(`/admin/logs?bu=${bu}`);
    }

    async getAnalytics() {
        return this._fetch(`/admin/analytics`);
    }

    async getVectorStats() {
        return this._fetch(`/admin/vectors`);
    }

    // ⚙️ Local Models Management
    async getLocalModels() {
        return this._fetch(`/admin/models/local`);
    }

    async addModel(modelId, inputRate, outputRate) {
        return this._fetch(`/admin/models/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_id: modelId, input_rate: inputRate, output_rate: outputRate })
        });
    }

    async activateModel(modelId, inputRate, outputRate) {
        return this._fetch(`/admin/models/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_id: modelId, input_rate: inputRate, output_rate: outputRate })
        });
    }

    async deleteModel(modelId) {
        return this._fetch(`/admin/models/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_id: modelId, input_rate: 0, output_rate: 0 })
        });
    }

    // 🌐 OpenRouter Integration
    async getOpenRouterModels() {
        return this._fetch(`/admin/openrouter/models`);
    }
}