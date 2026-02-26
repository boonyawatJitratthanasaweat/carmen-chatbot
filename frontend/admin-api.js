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
        return this._fetch(`/api/admin/logs?bu=${bu}`);
    }

    async getAnalytics() {
        return this._fetch(`/api/admin/analytics`);
    }

    async getVectorStats() {
        return this._fetch(`/api/admin/vectors`);
    }

    // ⚙️ Local Models Management
    async getLocalModels() {
        return this._fetch(`/api/admin/models/local`);
    }

    async addModel(modelId, inputRate, outputRate) {
        return this._fetch(`/api/admin/models/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: modelId, input_price: inputRate, output_price: outputRate })
        });
    }

    async activateModel(modelName) {
        return this._fetch(`/api/admin/models/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_name: modelName })
        });
    }

    async deleteModel(modelName) {
        return this._fetch(`/api/admin/models/${encodeURIComponent(modelName)}`, {
            method: 'DELETE'
        });
    }

    // 🌐 OpenRouter Integration
    async getOpenRouterModels() {
        return this._fetch(`/api/admin/openrouter/models`);
    }
}